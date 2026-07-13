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
    model: 'google/gemini-2.5-flash-image',
    cost: '$',
    description: 'Fastest and cheapest. Good for quick drafts and iterations.',
  },
  {
    id: 'standard',
    label: 'Standard',
    model: 'google/gemini-3.1-flash-image-preview',
    cost: '$$',
    description: 'High quality with fast rendering. Best balance of cost and quality.',
  },
  {
    id: 'ultra',
    label: 'Ultra',
    model: 'google/gemini-3-pro-image-preview',
    cost: '$$$',
    description: 'Highest quality, slower and most expensive. Best for hero shots and text-in-image.',
  },
];

export const DEFAULT_TIER_ID: ImageModelTierId = 'standard';

export const getTierModel = (id?: string): string => {
  const tier = IMAGE_MODEL_TIERS.find(t => t.id === id);
  return (tier ?? IMAGE_MODEL_TIERS.find(t => t.id === DEFAULT_TIER_ID)!).model;
};
