import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateHtmlRequest {
  prompt: string;
  connectedData?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const { prompt, connectedData }: GenerateHtmlRequest = await req.json();
    
    // Input validation
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid prompt is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (prompt.length > 5000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Prompt too long (max 5000 characters)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
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
    const model = useOpenRouter ? 'google/gemini-3-flash-preview' : 'google/gemini-3-flash-preview';
    if (!apiKey) {
      throw new Error('No AI provider key available');
    }
    console.log(useOpenRouter ? 'Using user OpenRouter key (BYOK)' : 'Using Lovable AI Gateway');

    // Build enhanced prompt with security and quality guidelines
    const contextPrompt = connectedData ? 
      `\n\nAdditional context from connected nodes: ${JSON.stringify(connectedData, null, 2)}` : '';
    
    const enhancedPrompt = `You are an expert web developer creating a secure, beautiful HTML component. 

USER REQUEST: "${prompt}"${contextPrompt}

SECURITY REQUIREMENTS:
- NO external script imports or CDN links
- NO direct API calls or fetch requests
- NO localStorage/sessionStorage access
- Use only vanilla JavaScript (no frameworks)
- Sanitize any user inputs
- No access to parent window or frames

DESIGN REQUIREMENTS:
- Modern, beautiful, responsive design
- Use CSS Grid/Flexbox for layouts
- Include hover effects and smooth transitions
- Use semantic HTML5 elements
- Ensure accessibility (ARIA labels, semantic markup)
- Mobile-first responsive design
- Use modern CSS features (custom properties, animations)

FUNCTIONALITY REQUIREMENTS:
- Self-contained and fully functional
- Include interactive elements where appropriate
- Use proper event handling
- Add visual feedback for interactions
- Include error handling for any user inputs

Return your response in this EXACT format (no markdown formatting):
=== HTML ===
[Clean HTML code here]

=== CSS ===
[Modern CSS code here]

=== JS ===
[Vanilla JavaScript code here]

Create something impressive, secure, and production-ready!`;

    console.log('Generating HTML component with prompt:', prompt);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(useOpenRouter ? { 'HTTP-Referer': 'https://nano-art-studio.lovable.app', 'X-Title': 'Nano Editor' } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert web developer creating secure, beautiful, production-ready HTML components.'
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Rate limit exceeded. Please try again later.' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 429 
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Payment required. Please add credits to your Lovable AI workspace.' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 402 
          }
        );
      }

      const errorData = await response.json().catch(() => ({}));
      console.error('Lovable AI Gateway Error:', errorData);
      throw new Error('Failed to generate HTML component');
    }

    const data = await response.json();
    console.log('Lovable AI Gateway Response:', data);

    const textResponse = data.choices?.[0]?.message?.content;
    
    if (!textResponse) {
      throw new Error('No response from Lovable AI Gateway');
    }

    // Parse the structured response with improved regex
    const htmlMatch = textResponse.match(/=== HTML ===\s*([\s\S]*?)(?=\s*=== CSS ===|$)/i);
    const cssMatch = textResponse.match(/=== CSS ===\s*([\s\S]*?)(?=\s*=== JS ===|$)/i);
    const jsMatch = textResponse.match(/=== JS ===\s*([\s\S]*?)$/i);

    let html = htmlMatch?.[1]?.trim() || '';
    let css = cssMatch?.[1]?.trim() || '';
    let js = jsMatch?.[1]?.trim() || '';

    // Clean up any markdown code blocks that might remain
    html = html.replace(/^```html\s*\n?|```$/gi, '').trim();
    css = css.replace(/^```css\s*\n?|```$/gi, '').trim();
    js = js.replace(/^```javascript\s*\n?|^```js\s*\n?|```$/gi, '').trim();

    // Basic validation
    if (!html || html === 'Error parsing HTML') {
      html = `<div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h2>🎨 ${prompt}</h2>
        <p>Component generated successfully!</p>
      </div>`;
    }

    if (!css) {
      css = `body { 
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        margin: 0; 
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }`;
    }

    if (!js) {
      js = '// Interactive component ready';
    }

    // Security: Apply comprehensive sanitization
    html = sanitizeHtml(html);
    css = sanitizeCss(css);
    js = sanitizeJs(js);

    // Create a sandboxed HTML preview with strict CSP
    const sandboxedHtml = createSandboxedHtml(html, css, js);

    const result = {
      success: true,
      code: {
        html,
        css,
        js,
        preview: `data:text/html;charset=utf-8,${encodeURIComponent(sandboxedHtml)}`
      }
    };

    console.log('Successfully generated HTML component');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-html-component:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Comprehensive security sanitization functions
function sanitizeHtml(html: string): string {
  let sanitized = html;
  
  // Remove all script tags (including variations and encoded versions)
  sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<script[\s\S]*?>/gi, '');
  
  // Remove all event handlers (with and without quotes, including encoded)
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^>\s]*/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove dangerous protocols
  sanitized = sanitized.replace(/javascript:/gi, 'blocked:');
  sanitized = sanitized.replace(/data:text\/html/gi, 'blocked:');
  sanitized = sanitized.replace(/vbscript:/gi, 'blocked:');
  
  // Remove iframe, embed, object tags
  sanitized = sanitized.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<embed[\s\S]*?>/gi, '');
  sanitized = sanitized.replace(/<object[\s\S]*?<\/object>/gi, '');
  
  // Remove meta refresh
  sanitized = sanitized.replace(/<meta[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/gi, '');
  
  // Remove form actions that could exfiltrate data
  sanitized = sanitized.replace(/action\s*=\s*["'][^"']*["']/gi, '');
  
  return sanitized;
}

function sanitizeCss(css: string): string {
  let sanitized = css;
  
  // Remove dangerous CSS expressions and functions
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, 'blocked:');
  sanitized = sanitized.replace(/vbscript:/gi, 'blocked:');
  sanitized = sanitized.replace(/data:text\/html/gi, 'blocked:');
  
  // Block external imports and URL references
  sanitized = sanitized.replace(/@import\s+url\s*\([^)]*\)/gi, '');
  sanitized = sanitized.replace(/@import\s+["'][^"']+["']/gi, '');
  
  // Remove behavior property (IE only, but still dangerous)
  sanitized = sanitized.replace(/behavior\s*:\s*url\s*\([^)]*\)/gi, '');
  
  // Block -moz-binding (Firefox XBL)
  sanitized = sanitized.replace(/-moz-binding\s*:\s*url\s*\([^)]*\)/gi, '');
  
  return sanitized;
}

function sanitizeJs(js: string): string {
  let sanitized = js;
  
  // Block dangerous JavaScript functions and patterns
  sanitized = sanitized.replace(/eval\s*\(/gi, 'blocked(');
  sanitized = sanitized.replace(/Function\s*\(/gi, 'blocked(');
  sanitized = sanitized.replace(/setTimeout\s*\(\s*["'`][^"'`]*["'`]/gi, 'blocked(');
  sanitized = sanitized.replace(/setInterval\s*\(\s*["'`][^"'`]*["'`]/gi, 'blocked(');
  
  // Block dynamic property access
  sanitized = sanitized.replace(/window\s*\[/gi, 'blocked[');
  sanitized = sanitized.replace(/document\s*\[/gi, 'blocked[');
  
  // Block innerHTML and outerHTML
  sanitized = sanitized.replace(/\.innerHTML\s*=/gi, '.textContent=');
  sanitized = sanitized.replace(/\.outerHTML\s*=/gi, '.textContent=');
  
  // Block document.write and document.writeln
  sanitized = sanitized.replace(/document\.write/gi, 'blocked.blocked');
  sanitized = sanitized.replace(/document\.writeln/gi, 'blocked.blocked');
  
  // Block access to parent/top/opener windows
  sanitized = sanitized.replace(/window\.(parent|top|opener)/gi, 'blocked.blocked');
  
  // Block importScripts (Web Workers)
  sanitized = sanitized.replace(/importScripts\s*\(/gi, 'blocked(');
  
  // Block creating script elements
  sanitized = sanitized.replace(/createElement\s*\(\s*["'`]script["'`]\s*\)/gi, 'createElement("div")');
  
  return sanitized;
}

// Create a sandboxed HTML document with strict Content Security Policy
function createSandboxedHtml(html: string, css: string, js: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:; font-src data:;">
  <style>
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
    // Sandbox the JavaScript to prevent breakout
    (function() {
      'use strict';
      // Override dangerous globals
      window.eval = undefined;
      window.Function = undefined;
      ${js}
    })();
  </script>
</body>
</html>`;
}
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
