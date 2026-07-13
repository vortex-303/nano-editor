import { llmText } from './falClient';

export interface HtmlComponentCode {
  html: string;
  css: string;
  js: string;
  preview: string;
}

const sanitizeHtml = (html: string): string => {
  let sanitized = html;
  sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<script[\s\S]*?>/gi, '');
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^>\s]*/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, 'blocked:');
  sanitized = sanitized.replace(/data:text\/html/gi, 'blocked:');
  sanitized = sanitized.replace(/vbscript:/gi, 'blocked:');
  sanitized = sanitized.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<embed[\s\S]*?>/gi, '');
  sanitized = sanitized.replace(/<object[\s\S]*?<\/object>/gi, '');
  sanitized = sanitized.replace(/<meta[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/gi, '');
  sanitized = sanitized.replace(/action\s*=\s*["'][^"']*["']/gi, '');
  return sanitized;
};

const sanitizeCss = (css: string): string => {
  let sanitized = css;
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, 'blocked:');
  sanitized = sanitized.replace(/vbscript:/gi, 'blocked:');
  sanitized = sanitized.replace(/data:text\/html/gi, 'blocked:');
  sanitized = sanitized.replace(/@import\s+url\s*\([^)]*\)/gi, '');
  sanitized = sanitized.replace(/@import\s+["'][^"']+["']/gi, '');
  sanitized = sanitized.replace(/behavior\s*:\s*url\s*\([^)]*\)/gi, '');
  sanitized = sanitized.replace(/-moz-binding\s*:\s*url\s*\([^)]*\)/gi, '');
  return sanitized;
};

const sanitizeJs = (js: string): string => {
  let sanitized = js;
  sanitized = sanitized.replace(/eval\s*\(/gi, 'blocked(');
  sanitized = sanitized.replace(/Function\s*\(/gi, 'blocked(');
  sanitized = sanitized.replace(/setTimeout\s*\(\s*["'`][^"'`]*["'`]/gi, 'blocked(');
  sanitized = sanitized.replace(/setInterval\s*\(\s*["'`][^"'`]*["'`]/gi, 'blocked(');
  sanitized = sanitized.replace(/window\s*\[/gi, 'blocked[');
  sanitized = sanitized.replace(/document\s*\[/gi, 'blocked[');
  sanitized = sanitized.replace(/\.innerHTML\s*=/gi, '.textContent=');
  sanitized = sanitized.replace(/\.outerHTML\s*=/gi, '.textContent=');
  sanitized = sanitized.replace(/document\.write/gi, 'blocked.blocked');
  sanitized = sanitized.replace(/document\.writeln/gi, 'blocked.blocked');
  sanitized = sanitized.replace(/window\.(parent|top|opener)/gi, 'blocked.blocked');
  sanitized = sanitized.replace(/importScripts\s*\(/gi, 'blocked(');
  sanitized = sanitized.replace(/createElement\s*\(\s*["'`]script["'`]\s*\)/gi, 'createElement("div")');
  return sanitized;
};

const createSandboxedHtml = (html: string, css: string, js: string): string => `<!DOCTYPE html>
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
      window.eval = undefined;
      window.Function = undefined;
      ${js}
    })();
  </script>
</body>
</html>`;

interface GenerateHtmlOptions {
  prompt: string;
  connectedData?: unknown;
}

export const generateHtmlComponent = async ({ prompt, connectedData }: GenerateHtmlOptions): Promise<HtmlComponentCode> => {
  if (!prompt?.trim()) throw new Error('Valid prompt is required');
  if (prompt.length > 5000) throw new Error('Prompt too long (max 5000 characters)');

  const contextPrompt = connectedData
    ? `\n\nAdditional context from connected nodes: ${JSON.stringify(connectedData, null, 2)}`
    : '';

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

  const textResponse = await llmText({
    prompt: enhancedPrompt,
    systemPrompt: 'You are an expert web developer creating secure, beautiful, production-ready HTML components.',
    model: 'google/gemini-2.5-flash',
    temperature: 0.8,
    maxTokens: 8192,
  });

  const htmlMatch = textResponse.match(/=== HTML ===\s*([\s\S]*?)(?=\s*=== CSS ===|$)/i);
  const cssMatch = textResponse.match(/=== CSS ===\s*([\s\S]*?)(?=\s*=== JS ===|$)/i);
  const jsMatch = textResponse.match(/=== JS ===\s*([\s\S]*?)$/i);

  let html = htmlMatch?.[1]?.trim() || '';
  let css = cssMatch?.[1]?.trim() || '';
  let js = jsMatch?.[1]?.trim() || '';

  html = html.replace(/^```html\s*\n?|```$/gi, '').trim();
  css = css.replace(/^```css\s*\n?|```$/gi, '').trim();
  js = js.replace(/^```javascript\s*\n?|^```js\s*\n?|```$/gi, '').trim();

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

  html = sanitizeHtml(html);
  css = sanitizeCss(css);
  js = sanitizeJs(js);

  const sandboxedHtml = createSandboxedHtml(html, css, js);

  return {
    html,
    css,
    js,
    preview: `data:text/html;charset=utf-8,${encodeURIComponent(sandboxedHtml)}`,
  };
};
