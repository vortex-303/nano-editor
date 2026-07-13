import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Edit3, Save, FolderOpen } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { CreditService } from '@/services/creditService';
import { ImagePreviewModal } from '../ImagePreviewModal';
import { PromptSnippetModal } from '../PromptSnippetModal';
import { ModelTierSelector } from '../ModelTierSelector';
import { DEFAULT_TIER_ID } from '@/lib/imageModelTiers';

interface ProcessingNodeProps {
  data: NodeData;
  id: string;
}


export const ProcessingNode: React.FC<ProcessingNodeProps> = ({ data, id }) => {
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [strength, setStrength] = useState(data.strength || [0.8]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(data.result || '');
  const [error, setError] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);
  const [snippetModalTab, setSnippetModalTab] = useState<'save' | 'load'>('save');
  const [modelTier, setModelTier] = useState<string>(data.modelTier || DEFAULT_TIER_ID);
  const { getConnectedNodeData, getAllConnectedNodeData, updateNodeData, nodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();
  const { user, deductCredit } = useAuth();

  // Get connected input data
  const edges = getEdges();
  const connectedImages = getAllConnectedNodeData(id, edges, 'image');
  const connectedPrompt = getConnectedNodeData(id, edges, 'prompt');
  const connectedContext = getConnectedNodeData(id, edges, 'context');
  
  console.log('ProcessingNode - All edges:', edges);
  console.log('ProcessingNode - Edges targeting this node:', edges.filter(e => e.target === id));
  console.log('ProcessingNode - Connected images:', connectedImages);
  console.log('ProcessingNode - Node data state:', nodeData);

  // Update prompt when connected prompt node changes
  useEffect(() => {
    if (connectedPrompt && connectedPrompt !== prompt) {
      setPrompt(connectedPrompt);
    }
  }, [connectedPrompt]);

  // Update node data when result changes
  useEffect(() => {
    updateNodeData(id, { result, processing, error, modelTier });
  }, [result, processing, error, modelTier, id, updateNodeData]);

  const handleProcess = useCallback(async () => {
    const finalPrompt = connectedPrompt || prompt;
    
    if (!finalPrompt.trim()) {
      toast.error('Please enter a prompt or connect a prompt node');
      return;
    }

    setProcessing(true);
    setError('');

    // Check authentication and credits
    if (!user) {
      toast.error('Please sign up to generate images.');
      setProcessing(false);
      return;
    }

    const canDeduct = await deductCredit();
    if (!canDeduct) {
      toast.error('Insufficient credits. Please upgrade your plan.');
      setProcessing(false);
      return;
    }

    try {
      // Enhanced prompt for edit functionality with context if available
      let enhancedPrompt = `Edit the image: ${finalPrompt}. Maintain the overall composition while making the requested changes.`;
      if (connectedContext) {
        enhancedPrompt += `\n\nAdditional context: ${connectedContext}`;
      }

      const requestBody: any = {
        prompt: enhancedPrompt,
        strength: strength[0],
        modelTier,
      };

      // Include connected images if available
      if (connectedImages && connectedImages.length > 0) {
        console.log('Sending images to edge function:', connectedImages);
        
        // For multiple images, send them as base64 data if they are data URLs
        const processedImages = connectedImages.map(imageUrl => {
          if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
            // It's a base64 data URL
            const [header, data] = imageUrl.split(',');
            const mimeType = header.split(':')[1].split(';')[0];
            return {
              data: data,
              type: mimeType
            };
          } else {
            // It's a regular URL
            return imageUrl;
          }
        });
        
        requestBody.images = processedImages;
      }

      const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-image', {
        body: requestBody,
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (functionData?.imageUrl) {
        setResult(functionData.imageUrl);
        toast.success('Image processed successfully!');
      } else {
        throw new Error(functionData?.error || 'Processing failed');
      }
    } catch (err) {
      console.error('Processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  }, [connectedPrompt, prompt, strength, connectedImages, connectedContext]);

  return (
    <Card className="w-80 p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Edit3 size={16} className="text-primary" />
          <span className="text-sm font-medium">AI Edit</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">
                Prompt {connectedPrompt && <span className="text-green-500">(Connected)</span>}
              </Label>
              {!connectedPrompt && (
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => {
                      setSnippetModalTab('load');
                      setIsSnippetModalOpen(true);
                    }}
                    title="Load Snippet"
                  >
                    <FolderOpen className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => {
                      setSnippetModalTab('save');
                      setIsSnippetModalOpen(true);
                    }}
                    title="Save as Snippet"
                    disabled={!prompt.trim()}
                  >
                    <Save className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            <Textarea
              placeholder={connectedPrompt ? "Using connected prompt..." : "Enter edit instructions..."}
              value={connectedPrompt || prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[80px] text-xs resize-none nodrag"
              disabled={!!connectedPrompt}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {(connectedPrompt || prompt).length}/500 characters
            </div>
          </div>

          <div>
            <Label className="text-xs">Edit Strength</Label>
            <div className="px-2">
              <Slider
                value={strength}
                onValueChange={setStrength}
                max={1}
                min={0.1}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Subtle</span>
                <span>{strength[0].toFixed(1)}</span>
                <span>Strong</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground space-y-1">
              {connectedImages.length > 0 && (
                <div className="text-blue-500">
                  ✓ {connectedImages.length} image{connectedImages.length > 1 ? 's' : ''} connected
                </div>
              )}
              {connectedPrompt && (
                <div className="text-green-500">✓ Prompt connected</div>
              )}
              {connectedContext && (
                <div className="text-orange-500">✓ Context connected</div>
              )}
              {connectedImages.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                   {connectedImages.slice(0, 3).map((img, idx) => (
                     <img
                       key={idx}
                       src={img}
                       alt={`Input ${idx + 1}`}
                       className="w-8 aspect-square object-cover rounded border cursor-pointer"
                       onClick={() => {
                         setPreviewImage(img);
                         setIsPreviewOpen(true);
                       }}
                     />
                   ))}
                  {connectedImages.length > 3 && (
                    <div className="w-8 h-8 bg-muted rounded border flex items-center justify-center text-xs">
                      +{connectedImages.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <ModelTierSelector value={modelTier} onChange={setModelTier} disabled={processing} />
            </div>

            <Button 
              onClick={handleProcess} 
              disabled={processing || !(connectedPrompt || prompt.trim())}
              className="w-full"
              size="sm"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Image
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}

          {result && typeof result === 'string' && (
            <div className="space-y-2">
              <Label className="text-xs">Result</Label>
              <img
                src={result}
                alt="Processing result"
                className="w-full aspect-square object-cover rounded border cursor-pointer"
                onClick={() => {
                  setPreviewImage(result);
                  setIsPreviewOpen(true);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Input Handles - Multiple Image Inputs */}
      <Handle
        type="target"
        position={Position.Left}
        id="image-1"
        style={{ top: '20%' }}
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="image-2"
        style={{ top: '35%' }}
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="image-3"
        style={{ top: '50%' }}
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        style={{ top: '65%' }}
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="context"
        style={{ top: '80%' }}
        className="w-3 h-3 bg-orange-500"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="result"
        className="w-3 h-3 bg-blue-500"
      />

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={previewImage}
      />

      <PromptSnippetModal
        isOpen={isSnippetModalOpen}
        onClose={() => setIsSnippetModalOpen(false)}
        currentPrompt={prompt}
        onLoadSnippet={setPrompt}
        defaultTab={snippetModalTab}
      />
    </Card>
  );
};