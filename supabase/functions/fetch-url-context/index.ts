import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authorization required' 
      }), {
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
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url } = await req.json();

    // Input validation
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Valid URL is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (url.length > 2048) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'URL too long (max 2048 characters)' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL format and protocol
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid URL format' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Only HTTP and HTTPS protocols are allowed' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent SSRF by blocking private IP ranges
    const hostname = parsedUrl.hostname;
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '169.254.169.254', // AWS metadata
      '::1',
    ];

    if (blockedHosts.includes(hostname) || 
        hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') || 
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Access to private networks is not allowed' 
      }), {
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

    // Check and deduct credits (skip for admins)
    if (!isAdmin) {
      const { data: credits, error: creditsError } = await supabase
        .from('user_credits')
        .select('credits_used, credits_limit')
        .eq('user_id', user.id)
        .single();

      if (creditsError || !credits) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Unable to check credits' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (credits.credits_used >= credits.credits_limit) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Insufficient credits' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Deduct 1 credit
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ credits_used: credits.credits_used + 1 })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to deduct credits:', updateError);
      }
    }

    console.log('Fetching context from URL:', url);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not found');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Service configuration error' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use Lovable AI Gateway with gemini-2.5-flash to extract and summarize content from the URL
    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: `Please extract and summarize the key information from this webpage URL for use as context in image generation. Focus on:
              - Main topic/subject matter
              - Important details, descriptions, or specifications
              - Visual elements described
              - Any relevant context that would help in image generation
              
              URL: ${url}
              
              Please provide a concise but comprehensive summary that captures the essential context from this page. Format the response as clear, structured text that can be used as context for AI image generation.`
          }]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      
      // Handle specific error codes
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Payment required. Please add credits to your Lovable AI workspace.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to process URL content' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Lovable AI Gateway response received');

    // Extract content from Lovable AI Gateway response format
    const extractedContext = data.choices?.[0]?.message?.content;

    if (!extractedContext) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No content could be extracted from the URL' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      context: extractedContext,
      sourceUrl: url
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-url-context function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
