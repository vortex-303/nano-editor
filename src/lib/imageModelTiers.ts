export type ImageModelTierId = 'draft' | 'standard' | 'ultra';

export interface ImageModelTier {
  id: ImageModelTierId;
  label: string;
  model: string;
  cost: string;
  description: string;
}

export const IMAGE_MODEL_TIERS: ImageModelTier[] = [
  {
    id: 'draft',
    label: 'Draft',
    model: 'fal-ai/nano-banana',
    cost: '$',
    description: 'Fastest and cheapest (Nano Banana / Gemini Flash Image). Good for quick drafts and iterations.',
  },
  {
    id: 'standard',
    label: 'Standard',
    model: 'fal-ai/nano-banana-pro',
    cost: '$$',
    description: 'High quality (Nano Banana Pro / Gemini 3 Pro Image). Best balance of cost and quality.',
  },
  {
    id: 'ultra',
    label: 'Ultra',
    model: 'fal-ai/nano-banana-pro',
    cost: '$$$',
    description: 'Highest quality (Nano Banana Pro). Best for hero shots and text-in-image.',
  },
];

export const DEFAULT_TIER_ID: ImageModelTierId = 'standard';

export const getTierModel = (id?: string): string => {
  const tier = IMAGE_MODEL_TIERS.find(t => t.id === id);
  return (tier ?? IMAGE_MODEL_TIERS.find(t => t.id === DEFAULT_TIER_ID)!).model;
};
