import { z } from 'zod';
import { llmJson } from './falClient';

export interface CampaignHook {
  visualConcept: string;
  headline: string;
  bodyCopy: string;
  cta: string;
  targetMood: string;
  negativeSpacePosition: 'left' | 'right' | 'top' | 'bottom';
}

const hooksSchema = z.object({
  hooks: z.array(
    z.object({
      visualConcept: z.string(),
      headline: z.string(),
      bodyCopy: z.string(),
      cta: z.string(),
      targetMood: z.string(),
      negativeSpacePosition: z.enum(['left', 'right', 'top', 'bottom']),
    })
  ).min(1),
});

interface CampaignStrategyParams {
  campaign: string;
  targetAudience?: string;
  platform: string;
  postType: string;
  dimensions: { width: number; height: number };
  ideaCount?: number;
  context?: string;
  referenceImages?: string[];
}

export const generateCampaignHooks = async ({
  campaign,
  targetAudience,
  platform,
  postType,
  dimensions,
  ideaCount = 3,
  context,
  referenceImages,
}: CampaignStrategyParams): Promise<CampaignHook[]> => {
  const systemPrompt = `You are an Elite Ad Agency Creative Director. Your task is to take a business concept and generate ${ideaCount} distinct campaign 'hooks' for ${platform} ${postType} format.

For each hook, you MUST provide:

1. "visualConcept": A detailed description for an image generator (photorealistic or high-end graphic design). Include specific details about composition, lighting, colors, subjects, atmosphere, and visual style. This should be highly detailed and actionable for AI image generation.

2. "headline": A punchy, 5-10 word attention-grabber that will be overlaid on the image.

3. "bodyCopy": A compelling 15-25 word persuasive description for the post caption.

4. "cta": A clear Call to Action (e.g., 'Shop Now', 'Book a Demo', 'Learn More', 'Get Started').

5. "targetMood": The overall emotional tone (e.g., Luxury, High-Energy, Minimalist, Trustworthy, Bold, Playful, Professional, Inspirational).

6. "negativeSpacePosition": Where to leave empty space for text overlay - must be exactly one of: "left", "right", "top", or "bottom". Choose based on what works best for the visual concept and platform format.

Consider:
- Platform: ${platform} (optimize for this platform's audience and format)
- Format: ${postType} at ${dimensions.width}x${dimensions.height} pixels
- Aspect ratio: ${dimensions.width > dimensions.height ? 'Landscape' : dimensions.width < dimensions.height ? 'Portrait/Vertical' : 'Square'}
${targetAudience ? `- Target Audience: ${targetAudience}` : ''}
${context ? `- Additional Context: ${context}` : ''}

Generate ${ideaCount} distinct hooks with different creative approaches. Ensure variety in visual concepts, moods, and messaging angles.

Return a JSON object of this exact shape:
{"hooks": [{"visualConcept": string, "headline": string, "bodyCopy": string, "cta": string, "targetMood": string, "negativeSpacePosition": "left"|"right"|"top"|"bottom"}]}`;

  const userPrompt = `Generate a ${ideaCount}-hook ad campaign strategy for:

Campaign Brief: ${campaign}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}
${referenceImages?.length ? `\nNote: the user provided ${referenceImages.length} reference image(s); align the visual concepts with a cohesive campaign look.` : ''}

Return the hooks as JSON.`;

  const result = await llmJson(hooksSchema, {
    prompt: userPrompt,
    systemPrompt,
    model: 'google/gemini-2.5-pro',
    maxTokens: 4096,
  });
  return result.hooks;
};

interface SocialPostPromptParams {
  hook: CampaignHook;
  platform: string;
  postType: string;
  width: number;
  height: number;
  hasReferenceImages: boolean;
  extraContext?: string;
}

export const buildSocialPostPrompt = ({ hook, platform, postType, width, height, hasReferenceImages, extraContext }: SocialPostPromptParams): string => {
  const negativeSpaceMap: Record<string, string> = {
    left: 'left side',
    right: 'right side',
    top: 'top portion',
    bottom: 'bottom portion',
  };
  const spacePosition = negativeSpaceMap[hook.negativeSpacePosition] || 'appropriate area';
  const mood = hook.targetMood || 'professional';

  return `Create a professional social media advertising graphic with integrated text.

Visual Concept: ${hook.visualConcept}

TEXT TO INCLUDE IN THE IMAGE:
${hook.headline ? `- HEADLINE (prominent, large): "${hook.headline}"` : ''}
${hook.bodyCopy ? `- BODY TEXT (smaller, supporting): "${hook.bodyCopy}"` : ''}
${hook.cta ? `- CALL TO ACTION (button or highlighted text): "${hook.cta}"` : ''}

Design Requirements:
- Place the text on the ${spacePosition} of the image
- Use modern, clean typography that matches the ${mood} mood
- Ensure high contrast between text and background for readability
- Text should be integrated beautifully into the composition
- Professional graphic design quality, like a real advertising agency would produce
- Cinematic lighting with professional color grading for the visual elements
- Optimized for ${platform} ${postType} at ${width}x${height} dimensions

${hasReferenceImages ? 'Reference Image Instructions: Use the provided reference image(s) as inspiration for style, subject, or composition while following the visual concept above.' : ''}

${extraContext ? `Additional context: ${extraContext}` : ''}

Output: Return ONLY the final social media graphic with all text elements integrated into the design.`;
};
