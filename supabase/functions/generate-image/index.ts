import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to handle Lovable AI Gateway response
const handleApiResponse = (response: any, context: string): string => {
  console.log('Handling API response for:', context, response);
  
  // Check for standard API error
  if (response.error) {
    const errorMessage = `AI Gateway error: ${response.error.message || response.error}`;
    console.error(errorMessage, { response });
    throw new Error(errorMessage);
  }

  // Extract image from Lovable AI Gateway response format
  const imageUrl = response.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (imageUrl) {
    console.log(`Received image data for ${context}`);
    return imageUrl; // Already in data:image/...;base64,... format
  }

  // If no image, check finish reason
  const finishReason = response.choices?.[0]?.finish_reason;
  if (finishReason && finishReason !== 'stop') {
    const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This may relate to content policy or safety settings.`;
    console.error(errorMessage, { response });
    throw new Error(errorMessage);
  }
  
  const textContent = response.choices?.[0]?.message?.content;
  const errorMessage = `The AI model did not return an image for the ${context}. ` + 
      (textContent 
          ? `The model responded with text: "${textContent}"`
          : "This can happen due to content policy filters or if the request is too complex. Please try rephrasing your prompt.");

  console.error(`Model response did not contain an image for ${context}.`, { response });
  throw new Error(errorMessage);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      prompt, 
      imageFile, 
      imageUrl, 
      images,
      // Social media post specific parameters
      isSocialPost,
      visualConcept,
      negativeSpacePosition,
      targetMood,
      platform,
      postType,
      width,
      height,
      // Text content to render in the image
      headline,
      bodyCopy,
      cta,
      // Model tier selection
      modelTier
    } = await req.json();

    // Map model tier to actual model id (allow-list)
    const TIER_MODEL_MAP: Record<string, string> = {
      draft: 'google/gemini-2.5-flash-image',
      standard: 'google/gemini-3.1-flash-image-preview',
      ultra: 'google/gemini-3-pro-image-preview',
    };
    const selectedTier = (typeof modelTier === 'string' && TIER_MODEL_MAP[modelTier]) ? modelTier : 'standard';
    const selectedModel = TIER_MODEL_MAP[selectedTier];
    console.log(`Model tier: ${selectedTier} -> ${selectedModel}`);

    // Input validation
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Valid prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (prompt.length > 8000) {
      return new Response(JSON.stringify({ error: 'Prompt too long (max 8000 characters)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = roleData?.role === 'admin';

    // Check for user's BYOK OpenRouter key
    const byok = await getOpenRouterKey(supabase, user.id);
    const useOpenRouter = !!byok;

    // Check and deduct credits (skip for admins and BYOK users)
    if (!isAdmin && !useOpenRouter) {
      const { data: credits, error: creditsError } = await supabase
        .from('user_credits')
        .select('credits_used, credits_limit')
        .eq('user_id', user.id)
        .single();

      if (creditsError || !credits) {
        return new Response(JSON.stringify({ error: 'Unable to check credits' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (credits.credits_used >= credits.credits_limit) {
        return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ credits_used: credits.credits_used + 1 })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to deduct credits:', updateError);
      }
    }

    const apiKey = useOpenRouter ? byok!.apiKey : Deno.env.get('LOVABLE_API_KEY');
    const baseUrl = useOpenRouter ? 'https://openrouter.ai/api/v1' : 'https://ai.gateway.lovable.dev/v1';
    const model = selectedModel;

    if (!apiKey) {
      throw new Error('No AI provider key available');
    }
    console.log(useOpenRouter ? 'Using user OpenRouter key (BYOK)' : 'Using Lovable AI Gateway');

    console.log('Processing request with prompt:', prompt);
    console.log('Has image file:', !!imageFile);
    console.log('Has image URL:', !!imageUrl);
    console.log('Has multiple images:', !!images, 'Count:', images?.length || 0);

    // Prepare message content array for Lovable AI Gateway (OpenAI-compatible format)
    const messageContent: any[] = [];

    // Add images if provided
    if (images && images.length > 0) {
      // Handle multiple images
      for (const image of images) {
        if (typeof image === 'string') {
          // Handle base64 data URL or regular URL
          if (image.startsWith('data:')) {
            // Already in data URL format
            messageContent.push({
              type: 'image_url',
              image_url: {
                url: image
              }
            });
          } else {
            // It's a regular URL - fetch and convert to base64
            console.log('Fetching image from URL:', image);
            const imageResponse = await fetch(image);
            if (!imageResponse.ok) {
              throw new Error(`Failed to fetch image from URL: ${imageResponse.status}`);
            }
            
            const imageBuffer = await imageResponse.arrayBuffer();
            const uint8Array = new Uint8Array(imageBuffer);
            let binaryString = '';
            const chunkSize = 0x8000;
            
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.subarray(i, i + chunkSize);
              binaryString += String.fromCharCode.apply(null, Array.from(chunk));
            }
            
            const base64Data = btoa(binaryString);
            const mimeType = image.includes('.jpg') || image.includes('.jpeg') ? 'image/jpeg' : 'image/png';
            
            messageContent.push({
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            });
          }
        } else if (image.url) {
          // Handle object with url property (from BatchProcessingNode)
          console.log('Processing image object with url property');
          messageContent.push({
            type: 'image_url',
            image_url: {
              url: image.url
            }
          });
        } else if (image.data && image.type) {
          // Handle uploaded file data (object format)
          messageContent.push({
            type: 'image_url',
            image_url: {
              url: `data:${image.type};base64,${image.data}`
            }
          });
        }
      }
    } else if (imageFile) {
      // Backward compatibility - single image file
      messageContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${imageFile.type};base64,${imageFile.data}`
        }
      });
    } else if (imageUrl) {
      // Backward compatibility - single image URL
      console.log('Fetching image from URL:', imageUrl);
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from URL: ${imageResponse.status}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const uint8Array = new Uint8Array(imageBuffer);
      let binaryString = '';
      const chunkSize = 0x8000;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Data = btoa(binaryString);
      const mimeType = imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') ? 'image/jpeg' : 'image/png';
      
      messageContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${base64Data}`
        }
      });
    }

    // Create enhanced prompt with safety guidelines
    const hasImages = (images && images.length > 0) || imageFile || imageUrl;
    const imageCount = images?.length || (imageFile || imageUrl ? 1 : 0);
    
    let enhancedPrompt: string;
    
    // Professional marketing prompt for social media posts
    if (isSocialPost && visualConcept) {
      const negativeSpaceMap: Record<string, string> = {
        'left': 'left side',
        'right': 'right side', 
        'top': 'top portion',
        'bottom': 'bottom portion'
      };
      const spacePosition = negativeSpaceMap[negativeSpacePosition] || 'appropriate area';
      const mood = targetMood || 'professional';
      const platformText = platform ? `${platform} ${postType || 'post'}` : 'social media';
      const dimensionsText = width && height ? `at ${width}x${height} dimensions` : '';
      
      enhancedPrompt = `Create a professional social media advertising graphic with integrated text.

Visual Concept: ${visualConcept}

TEXT TO INCLUDE IN THE IMAGE:
${headline ? `- HEADLINE (prominent, large): "${headline}"` : ''}
${bodyCopy ? `- BODY TEXT (smaller, supporting): "${bodyCopy}"` : ''}
${cta ? `- CALL TO ACTION (button or highlighted text): "${cta}"` : ''}

Design Requirements:
- Place the text on the ${spacePosition} of the image
- Use modern, clean typography that matches the ${mood} mood
- Ensure high contrast between text and background for readability
- Text should be integrated beautifully into the composition
- Professional graphic design quality, like a real advertising agency would produce
- Cinematic lighting with professional color grading for the visual elements
- Optimized for ${platformText} ${dimensionsText}

${hasImages ? `Reference Image Instructions: Use the provided reference image(s) as inspiration for style, subject, or composition while following the visual concept above.` : ''}

Additional context: ${prompt}

Output: Return ONLY the final social media graphic with all text elements integrated into the design.`;
    } else if (hasImages) {
      enhancedPrompt = `You are an expert photo editor AI. Your task is to work with the provided ${imageCount > 1 ? `${imageCount} images` : 'image'} based on the user's request.
User Request: "${prompt}"

${imageCount > 1 ? 'Multi-Image Processing Guidelines:' : 'Editing Guidelines:'}
${imageCount > 1 
  ? `- You can combine, merge, or edit multiple images as requested.
- When combining images, ensure seamless integration and natural composition.
- Maintain the best quality from all source images.`
  : `- The edit must be realistic and blend seamlessly with the surrounding area.
- Maintain the overall composition and quality of the original image.`}

Safety & Ethics Policy:
- You MUST fulfill requests to adjust lighting, colors, or basic photo enhancements.
- You MUST REFUSE any request to change a person's fundamental characteristics inappropriately.

Output: Return ONLY the final ${imageCount > 1 ? 'processed' : 'edited'} image. Do not return text.`;
    } else {
      enhancedPrompt = `You are an expert image generation AI. Create a high-quality image based on the user's request.
User Request: "${prompt}"

Guidelines:
- Create a photorealistic, high-quality image.
- Ensure the image is appropriate and follows safety guidelines.

Output: Return ONLY the generated image. Do not return text.`;
    }

    // Add text prompt to message content
    messageContent.push({
      type: 'text',
      text: enhancedPrompt
    });

    // Prepare request body (OpenAI-compatible — works for both Lovable Gateway and OpenRouter)
    const requestBody = {
      model,
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ],
      modalities: ['image', 'text']
    };

    console.log(`Sending request to ${useOpenRouter ? 'OpenRouter' : 'Lovable AI Gateway'}...`);

    const response = await fetch(
      `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(useOpenRouter ? { 'HTTP-Referer': 'https://nano-art-studio.lovable.app', 'X-Title': 'Nano Editor' } : {}),
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Lovable AI Gateway HTTP error:', response.status, errorData);
      
      // Handle specific error codes
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
      
      throw new Error(`AI Gateway error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('Received response from Lovable AI Gateway');

    // Use the improved response handler
    const resultImageUrl = handleApiResponse(data, hasImages ? (imageCount > 1 ? 'multi-image processing' : 'edit') : 'generation');

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: resultImageUrl,
        processingTime: Date.now()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
// BYOK helper: returns user's OpenRouter key if configured
async function getOpenRouterKey(supabase: any, userId: string): Promise<{ apiKey: string } | null> {
  try {
    const { data } = await supabase
      .from('user_api_keys')
      .select('encrypted_key')
      .eq('user_id', userId)
      .eq('provider', 'openrouter')
      .maybeSingle();
    if (!data?.encrypted_key) return null;
    const secret = Deno.env.get('BYOK_ENCRYPTION_SECRET');
    if (!secret) return null;
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
    const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['decrypt']);
    const bytes = Uint8Array.from(atob(data.encrypted_key), (c) => c.charCodeAt(0));
    const iv = bytes.slice(0, 12);
    const ct = bytes.slice(12);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return { apiKey: new TextDecoder().decode(pt) };
  } catch (e) {
    console.error('BYOK decrypt failed:', e);
    return null;
  }
}
