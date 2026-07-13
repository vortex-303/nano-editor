import { llmText } from './falClient';

const MAX_PAGE_CHARS = 15000;

const validateUrl = (rawUrl: string): URL => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs are supported');
  }
  const hostname = parsed.hostname;
  if (
    ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname) ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    throw new Error('Access to private networks is not allowed');
  }
  return parsed;
};

export const fetchUrlContext = async (url: string): Promise<{ context: string; sourceUrl: string }> => {
  const parsed = validateUrl(url);

  // r.jina.ai is a free CORS-friendly reader that returns page content as markdown
  const readerResponse = await fetch(`https://r.jina.ai/${parsed.toString()}`);
  if (!readerResponse.ok) {
    throw new Error(`Could not read the page (${readerResponse.status}). The site may block readers or be rate-limited; try again shortly.`);
  }
  const pageText = (await readerResponse.text()).slice(0, MAX_PAGE_CHARS);
  if (!pageText.trim()) {
    throw new Error('The page returned no readable content.');
  }

  const context = await llmText({
    prompt: `Please extract and summarize the key information from this webpage content for use as context in image generation. Focus on:
      - Main topic/subject matter
      - Important details, descriptions, or specifications
      - Visual elements described
      - Any relevant context that would help in image generation

      URL: ${parsed.toString()}

      Page content:
      ${pageText}

      Please provide a concise but comprehensive summary that captures the essential context from this page. Format the response as clear, structured text that can be used as context for AI image generation.`,
    model: 'google/gemini-2.5-flash',
  });

  return { context, sourceUrl: parsed.toString() };
};
