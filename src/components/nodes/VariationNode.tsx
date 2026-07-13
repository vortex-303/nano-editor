import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Play, AlertCircle } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { toast } from 'sonner';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { generateImage } from '@/lib/falClient';
import { ImagePreviewModal } from '../ImagePreviewModal';
import { ModelTierSelector } from '../ModelTierSelector';
import { DEFAULT_TIER_ID } from '@/lib/imageModelTiers';

interface VariationNodeProps {
  data: NodeData;
  id: string;
}

export const VariationNode: React.FC<VariationNodeProps> = ({ data, id }) => {
  const [variationCount, setVariationCount] = useState('4');
  const [prompt, setPrompt] = useState('');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [modelTier, setModelTier] = useState<string>(data.modelTier || DEFAULT_TIER_ID);
  
  const { getEdges } = useReactFlow();
  const { updateNodeData, getConnectedNodeData, getAllConnectedNodeData } = useNodeDataContext();
  const { ensureKey } = useOnboarding();

  // Get connected data
  const edges = getEdges();
  const connectedImages = getAllConnectedNodeData(id, edges, 'image');
  const connectedPrompt = getConnectedNodeData(id, edges, 'prompt');

  // Debug logging
  console.log('VariationNode - Connected images:', connectedImages);
  console.log('VariationNode - First connected image:', connectedImages?.[0]);

  useEffect(() => {
    if (connectedPrompt?.prompt) {
      setPrompt(connectedPrompt.prompt);
    }
  }, [connectedPrompt]);

  useEffect(() => {
    updateNodeData(id, { 
      result: results,
      processing,
      error,
      variantCount: results.length,
      modelTier,
    });
  }, [id, results, processing, error, modelTier, updateNodeData]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please provide a prompt describing the variations');
      return;
    }

    if (!connectedImages?.length) {
      setError('Please connect an image to create variations from');
      return;
    }

    // Validate that we have a valid image URL
    const imageUrl = connectedImages[0]; // connectedImages is array of strings, not objects
    if (!imageUrl || typeof imageUrl !== 'string') {
      setError('Connected image does not have a valid URL');
      console.log('Invalid image URL:', imageUrl, typeof imageUrl);
      return;
    }

    setProcessing(true);
    setError(null);
    setResults([]);
    const count = Math.min(Math.max(parseInt(variationCount), 2), 6);
    setProgress({ current: 0, total: count });

    if (!(await ensureKey())) {
      setProcessing(false);
      return;
    }

    try {
      const newResults: string[] = [];

      console.log(`Starting generation of ${count} variants`);

      for (let i = 0; i < count; i++) {
        console.log(`Generating variant ${i + 1} of ${count}`);
        setProgress({ current: i, total: count });

        // Create variation prompts to encourage diversity based on the input image
        const variationPrompts = [
          `${prompt}`,
          `Alternative style: ${prompt}`,
          `Different interpretation: ${prompt}`,
          `Variant approach: ${prompt}`,
          `Modified version: ${prompt}`,
          `Alternative take: ${prompt}`
        ];

        const variantPrompt = variationPrompts[i % variationPrompts.length];

        try {
          const resultUrl = await generateImage({
            prompt: variantPrompt,
            images: [imageUrl],
            tier: modelTier,
          });
          newResults.push(resultUrl);
          console.log(`Successfully generated variant ${i + 1}, total results: ${newResults.length}`);
        } catch (variantError) {
          console.error(`Error generating variant ${i + 1}:`, variantError);
          toast.error(`Failed to generate variant ${i + 1}`);
        }
      }

      setResults(newResults);
      setProgress({ current: count, total: count });
      console.log(`Final results:`, newResults);
      
      if (newResults.length === 0) {
        setError('Failed to generate any variants');
        toast.error('Failed to generate variants');
      } else if (newResults.length < count) {
        toast.success(`Generated ${newResults.length} of ${count} variants`);
      } else {
        toast.success(`Generated ${newResults.length} variants successfully`);
      }
    } catch (err) {
      console.error('Error generating variants:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate variants');
      toast.error('Failed to generate variants');
    } finally {
      setProcessing(false);
    }
  };

  const handleImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setShowPreviewModal(true);
  };

  const hasConnectedInputs = connectedImages?.length > 0 || connectedPrompt?.prompt;

  return (
    <Card className="w-72 p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Copy size={16} className="text-primary" />
          <span className="text-sm font-medium">Variants</span>
        </div>

        {/* Connected Inputs Display */}
        <div className="space-y-2 p-2 bg-muted/50 rounded-md">
          <Label className="text-xs text-muted-foreground">Required Inputs</Label>
          <div className="text-xs">
            📸 Image: {connectedImages?.length > 0 ? '✅ Connected' : '❌ Required'}
          </div>
          <div className="text-xs">
            💬 Prompt: {(connectedPrompt?.prompt || prompt.trim()) ? '✅ Connected' : '❌ Required'}
          </div>
        </div>

        {/* Show connected image preview */}
        {connectedImages?.length > 0 && typeof connectedImages[0] === 'string' && (
          <div className="space-y-1">
            <Label className="text-xs">Base Image</Label>
            <img 
              src={connectedImages[0]} 
              alt="Base for variations"
              className="w-full h-20 object-cover rounded border"
            />
          </div>
        )}

        {/* Local prompt input (fallback) */}
        {!connectedPrompt?.prompt && (
          <div className="space-y-2">
            <Label className="text-xs">Variation Prompt</Label>
            <Input
              placeholder="e.g., 'add different animals', 'change colors'..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="text-xs"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Number of Variants</Label>
          <Input
            type="number"
            value={variationCount}
            onChange={(e) => setVariationCount(e.target.value)}
            min="2"
            max="6"
            className="text-xs"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          Create {variationCount} different variations of the connected image.
        </div>

        <div>
          <ModelTierSelector value={modelTier} onChange={setModelTier} disabled={processing} />
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={handleGenerate}
          disabled={processing || (!prompt.trim() && !connectedPrompt?.prompt) || !connectedImages?.length}
        >
          <Play size={14} />
          {processing ? `Creating ${progress.current + 1}/${progress.total}...` : `Create ${variationCount} Variations`}
        </Button>

        {processing && (
          <div className="space-y-2">
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className="text-xs text-center text-muted-foreground">
              Creating variation {progress.current + 1}/{progress.total}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle size={12} />
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Results ({results.length})</Label>
            <div className="grid grid-cols-2 gap-1">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="w-full h-16 bg-muted rounded border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => handleImagePreview(result)}
                >
                  <img 
                    src={result} 
                    alt={`Variant ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        className="w-3 h-3"
        style={{ 
          top: '40%',
          background: '#3b82f6', // Blue for image input
          border: '2px solid #1e40af'
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        className="w-3 h-3"
        style={{ 
          top: '60%',
          background: '#10b981', // Green for prompt input
          border: '2px solid #047857'
        }}
      />
      
      
      {/* Batch output handle for all images */}
      <Handle
        type="source"
        position={Position.Right}
        id="batch"
        className="w-3 h-3 bg-purple-500"
        style={{ top: '50%' }}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        imageUrl={previewImage}
      />
    </Card>
  );
};