import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignHook {
  visualConcept: string;
  headline: string;
  bodyCopy: string;
  cta: string;
  targetMood: string;
  negativeSpacePosition: 'left' | 'right' | 'top' | 'bottom';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
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

    const { campaign, targetAudience, platform, postType, dimensions, ideaCount = 3, context, referenceImages } = await req.json();

    // Input validation
    if (!campaign || typeof campaign !== 'string') {
      return new Response(JSON.stringify({ error: 'Campaign brief is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!platform || !postType || !dimensions) {
      return new Response(JSON.stringify({ error: 'Platform, postType, and dimensions are required' }), {
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

    const byok = await getOpenRouterKey(supabase, user.id);
    const useOpenRouter = !!byok;

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
    const model = useOpenRouter ? 'google/gemini-3-pro-preview' : 'google/gemini-3-pro-preview';
    if (!apiKey) {
      throw new Error('No AI provider key available');
    }
    console.log(useOpenRouter ? 'Using user OpenRouter key (BYOK)' : 'Using Lovable AI Gateway');

    console.log('Generating campaign strategy for:', campaign);
    console.log('Platform:', platform, 'PostType:', postType, 'Dimensions:', dimensions);
    console.log('Idea count:', ideaCount);
    console.log('Reference images count:', referenceImages?.length || 0);

    const systemPrompt = `You are an Elite Ad Agency Creative Director. Your task is to take a business concept and generate ${ideaCount} distinct campaign 'hooks' for ${platform} ${postType} format.

${referenceImages?.length > 0 ? `IMPORTANT: The user has provided ${referenceImages.length} reference image(s). You MUST analyze these images carefully and incorporate their visual elements, style, colors, composition, and aesthetic into your visual concepts. Your generated hooks should be directly inspired by and aligned with these reference images.` : ''}

For each hook, you MUST provide:

1. **Visual Concept**: A detailed description for an image generator (photorealistic or high-end graphic design). Include specific details about composition, lighting, colors, subjects, atmosphere, and visual style.${referenceImages?.length > 0 ? ' This MUST incorporate elements from the provided reference images.' : ''} This should be highly detailed and actionable for AI image generation.

2. **Headline**: A punchy, 5-10 word attention-grabber that will be overlaid on the image.

3. **Body Copy**: A compelling 15-25 word persuasive description for the post caption.

4. **CTA**: A clear Call to Action (e.g., 'Shop Now', 'Book a Demo', 'Learn More', 'Get Started').

5. **Target Mood**: The overall emotional tone (e.g., Luxury, High-Energy, Minimalist, Trustworthy, Bold, Playful, Professional, Inspirational).

6. **Negative Space Position**: Where to leave empty space for text overlay - must be one of: 'left', 'right', 'top', or 'bottom'. Choose based on what works best for the visual concept and platform format.

Consider:
- Platform: ${platform} (optimize for this platform's audience and format)
- Format: ${postType} at ${dimensions.width}x${dimensions.height} pixels
- Aspect ratio: ${dimensions.width > dimensions.height ? 'Landscape' : dimensions.width < dimensions.height ? 'Portrait/Vertical' : 'Square'}
${targetAudience ? `- Target Audience: ${targetAudience}` : ''}
${context ? `- Additional Context: ${context}` : ''}

Generate ${ideaCount} distinct hooks with different creative approaches. Ensure variety in visual concepts, moods, and messaging angles.`;

    const userPrompt = `Generate a ${ideaCount}-hook ad campaign strategy for:

Campaign Brief: ${campaign}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}
${referenceImages?.length > 0 ? `\nIMPORTANT: I have provided ${referenceImages.length} reference image(s). Please analyze them and ensure the visual concepts you generate are inspired by and aligned with these images.` : ''}

Return the hooks as a structured response.`;

    // Build messages array - include images if provided
    const userContent: any[] = [{ type: 'text', text: userPrompt }];
    
    // Add reference images to the message if provided
    if (referenceImages && referenceImages.length > 0) {
      for (const imageUrl of referenceImages) {
        userContent.push({
          type: 'image_url',
          image_url: { url: imageUrl }
        });
      }
    }

    // Use Lovable AI Gateway with tool calling for structured output
    const response = await fetch(
      `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(useOpenRouter ? { 'HTTP-Referer': 'https://nano-art-studio.lovable.app', 'X-Title': 'Nano Editor' } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'generate_campaign_hooks',
                description: `Generate ${ideaCount} distinct campaign hooks for social media advertising.`,
                parameters: {
                  type: 'object',
                  properties: {
                    hooks: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          visualConcept: {
                            type: 'string',
                            description: 'Detailed visual description for AI image generation, inspired by the reference images if provided'
                          },
                          headline: {
                            type: 'string',
                            description: 'Punchy 5-10 word attention-grabber'
                          },
                          bodyCopy: {
                            type: 'string',
                            description: 'Compelling 15-25 word persuasive description'
                          },
                          cta: {
                            type: 'string',
                            description: 'Clear call to action'
                          },
                          targetMood: {
                            type: 'string',
                            description: 'Emotional tone of the creative'
                          },
                          negativeSpacePosition: {
                            type: 'string',
                            enum: ['left', 'right', 'top', 'bottom'],
                            description: 'Where to leave space for text overlay'
                          }
                        },
                        required: ['visualConcept', 'headline', 'bodyCopy', 'cta', 'targetMood', 'negativeSpacePosition'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['hooks'],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: 'function', function: { name: 'generate_campaign_hooks' } }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Gateway response received');

    // Extract hooks from tool call response
    let hooks: CampaignHook[] = [];
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        hooks = parsed.hooks || [];
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }

    // Fallback: try to parse from content if tool call didn't work
    if (hooks.length === 0 && data.choices?.[0]?.message?.content) {
      console.log('Tool call parsing failed, attempting content extraction');
      // This is a fallback - ideally the tool call should work
    }

    if (hooks.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Failed to generate campaign hooks. Please try again.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generated ${hooks.length} campaign hooks successfully`);

    return new Response(JSON.stringify({ 
      success: true, 
      hooks,
      platform,
      postType,
      dimensions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-campaign-strategy function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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
