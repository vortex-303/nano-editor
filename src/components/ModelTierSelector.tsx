import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import { IMAGE_MODEL_TIERS, DEFAULT_TIER_ID, type ImageModelTierId } from '@/lib/imageModelTiers';

interface ModelTierSelectorProps {
  value?: string;
  onChange: (value: ImageModelTierId) => void;
  disabled?: boolean;
}

export const ModelTierSelector: React.FC<ModelTierSelectorProps> = ({ value, onChange, disabled }) => {
  const current = value || DEFAULT_TIER_ID;
  const currentTier = IMAGE_MODEL_TIERS.find(t => t.id === current) ?? IMAGE_MODEL_TIERS[1];

  return (
    <Select value={current} onValueChange={(v) => onChange(v as ImageModelTierId)} disabled={disabled}>
      <SelectTrigger className="h-8 w-full text-xs nodrag gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="font-medium">{currentTier.label}</span>
          <span className="text-muted-foreground">{currentTier.cost}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {IMAGE_MODEL_TIERS.map(tier => (
          <SelectItem key={tier.id} value={tier.id} className="text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium">{tier.label}</span>
              <span className="text-muted-foreground">{tier.cost}</span>
              <span className="text-muted-foreground text-[10px]">{tier.model.replace('google/', '')}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
