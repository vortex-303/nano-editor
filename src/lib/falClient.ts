import { fal } from '@fal-ai/client';
import { z } from 'zod';
import { getFalKey } from './settingsStore';

export class FalKeyMissingError extends Error {
  constructor() {
    super('No fal.ai API key configured. Add your key in AI API Keys.');
    this.name = 'FalKeyMissingError';
  }
}

const ensureConfigured = (): void => {
  const key = getFalKey();
  if (!key) throw new FalKeyMissingError();
  fal.config({ credentials: key });
};

export type ImageTier = 'draft' | 'standard' | 'ultra';

const TIER_ENDPOINTS: Record<ImageTier, { generate: string; edit: string }> = {
  draft: { generate: 'fal-ai/nano-banana', edit: 'fal-ai/nano-banana/edit' },
  standard: { generate: 'fal-ai/nano-banana-pro', edit: 'fal-ai/nano-banana-pro/edit' },
  ultra: { generate: 'fal-ai/nano-banana-pro', edit: 'fal-ai/nano-banana-pro/edit' },
};

const normalizeError = (error: unknown): Error => {
  if (error instanceof FalKeyMissingError) return error;
  const err = error as { status?: number; body?: { detail?: unknown }; message?: string };
  if (err?.status === 401 || err?.status === 403) {
    return new Error('Invalid fal.ai API key. Check it in AI API Keys.');
  }
  if (err?.status === 429) {
    return new Error('fal.ai rate limit reached. Please try again in a moment.');
  }
  const detail = err?.body?.detail;
  if (detail) {
    const text = typeof detail === 'string' ? detail : JSON.stringify(detail);
    return new Error(`fal.ai request failed: ${text}`);
  }
  return error instanceof Error ? error : new Error(String(error));
};

export const urlToDataUrl = async (url: string): Promise<string> => {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download generated image (${response.status})`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

interface GenerateImageOptions {
  prompt: string;
  images?: string[];
  tier?: string;
  aspectRatio?: string;
  /** 'auto' (default) wraps the prompt with quality/safety templates; 'raw' sends it as-is */
  promptMode?: 'auto' | 'raw';
}

const enhancePrompt = (prompt: string, imageCount: number): string => {
  if (imageCount > 0) {
    return `You are an expert photo editor AI. Your task is to work with the provided ${imageCount > 1 ? `${imageCount} images` : 'image'} based on the user's request.
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
  }
  return `You are an expert image generation AI. Create a high-quality image based on the user's request.
User Request: "${prompt}"

Guidelines:
- Create a photorealistic, high-quality image.
- Ensure the image is appropriate and follows safety guidelines.

Output: Return ONLY the generated image. Do not return text.`;
};

export const generateImage = async ({ prompt, images, tier, aspectRatio, promptMode = 'auto' }: GenerateImageOptions): Promise<string> => {
  ensureConfigured();
  const tierId: ImageTier = tier === 'draft' || tier === 'standard' || tier === 'ultra' ? tier : 'standard';
  const hasImages = !!images?.length;
  const endpoint = hasImages ? TIER_ENDPOINTS[tierId].edit : TIER_ENDPOINTS[tierId].generate;
  const finalPrompt = promptMode === 'raw' ? prompt : enhancePrompt(prompt, images?.length ?? 0);
  try {
    const result = await fal.subscribe(endpoint, {
      input: {
        prompt: finalPrompt,
        num_images: 1,
        output_format: 'png',
        ...(hasImages ? { image_urls: images } : {}),
        ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
      },
    });
    const imageUrl = (result.data as { images?: Array<{ url: string }> })?.images?.[0]?.url;
    if (!imageUrl) throw new Error('fal.ai did not return an image. Try rephrasing your prompt.');
    return await urlToDataUrl(imageUrl);
  } catch (error) {
    throw normalizeError(error);
  }
};

interface UpscaleOptions {
  image: string;
  scale?: number;
  faceEnhance?: boolean;
}

export const upscale = async ({ image, scale = 2, faceEnhance = false }: UpscaleOptions): Promise<string> => {
  ensureConfigured();
  try {
    const result = await fal.subscribe('fal-ai/esrgan', {
      input: {
        image_url: image,
        scale,
        face: faceEnhance,
      },
    });
    const imageUrl = (result.data as { image?: { url: string } })?.image?.url;
    if (!imageUrl) throw new Error('Upscaling did not return an image.');
    return await urlToDataUrl(imageUrl);
  } catch (error) {
    throw normalizeError(error);
  }
};

interface LlmTextOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export const llmText = async ({ prompt, systemPrompt, model = 'google/gemini-2.5-flash', temperature, maxTokens }: LlmTextOptions): Promise<string> => {
  ensureConfigured();
  try {
    const result = await fal.subscribe('openrouter/router', {
      input: {
        prompt,
        ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
        model,
        ...(temperature !== undefined ? { temperature } : {}),
        ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
      },
    });
    const output = (result.data as { output?: string })?.output;
    if (!output) throw new Error('The AI model returned an empty response.');
    return output;
  } catch (error) {
    throw normalizeError(error);
  }
};

const stripJsonFences = (text: string): string => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
};

export const llmJson = async <T>(schema: z.ZodType<T>, options: LlmTextOptions): Promise<T> => {
  const jsonInstruction = '\n\nRespond ONLY with valid JSON. No markdown, no explanations, no code fences.';
  const attempt = async (): Promise<T> => {
    const text = await llmText({
      ...options,
      systemPrompt: (options.systemPrompt ?? '') + jsonInstruction,
    });
    return schema.parse(JSON.parse(stripJsonFences(text)));
  };
  try {
    return await attempt();
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      return await attempt();
    }
    throw error;
  }
};
