import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Zap, Loader2, Save, FolderOpen } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { toast } from 'sonner';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { generateImage } from '@/lib/falClient';
import { ImagePreviewModal } from '../ImagePreviewModal';
import { PromptSnippetModal } from '../PromptSnippetModal';
import { ModelTierSelector } from '../ModelTierSelector';
import { DEFAULT_TIER_ID } from '@/lib/imageModelTiers';
interface PromptNodeProps {
  data: NodeData;
  id: string;
}

export const PromptNode: React.FC<PromptNodeProps> = ({ data, id }) => {
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(data.image || '');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);
  const [snippetModalTab, setSnippetModalTab] = useState<'save' | 'load'>('save');
  const [modelTier, setModelTier] = useState<string>(data.modelTier || DEFAULT_TIER_ID);
  const { updateNodeData, getNodeData } = useNodeDataContext();
  const { ensureKey } = useOnboarding();
  
  const characterCount = prompt.length;
  const maxCharacters = 1000;

  // Sync with node data context - ensures imported data is reflected
  useEffect(() => {
    const contextData = getNodeData(id);
    console.log(`PromptNode ${id} - Context data:`, contextData);
    if (contextData.prompt && contextData.prompt !== prompt) {
      console.log(`PromptNode ${id} - Setting prompt from context:`, contextData.prompt);
      setPrompt(contextData.prompt);
    }
    if (contextData.image && contextData.image !== generatedImage) {
      console.log(`PromptNode ${id} - Setting image from context:`, contextData.image ? contextData.image.substring(0, 50) + '...' : 'undefined');
      setGeneratedImage(contextData.image);
    }
  }, [getNodeData, id]);

  // Update node data when prompt or image changes
  useEffect(() => {
    updateNodeData(id, { prompt, image: generatedImage, modelTier });
  }, [prompt, generatedImage, modelTier, id, updateNodeData]);

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = event.target.value;
    if (newPrompt.length <= maxCharacters) {
      setPrompt(newPrompt);
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first');
      return;
    }

    setGenerating(true);
    setGeneratedImage(''); // Clear old image when starting new generation

    if (!(await ensureKey())) {
      setGenerating(false);
      return;
    }

    try {
      const imageUrl = await generateImage({ prompt, tier: modelTier });
      setGeneratedImage(imageUrl);
      toast.success('Image generated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate image';
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const getCharacterCountColor = () => {
    if (characterCount > maxCharacters * 0.9) return 'destructive';
    if (characterCount > maxCharacters * 0.7) return 'secondary';
    return 'default';
  };

  return (
    <Card className="w-64 p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" />
            <span className="text-sm font-medium">Prompt</span>
          </div>
          <Badge variant={getCharacterCountColor()} className="text-xs">
            {characterCount}/{maxCharacters}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Label className="text-xs">Instructions</Label>
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateImage}
              disabled={generating || !prompt.trim()}
              className="h-6 px-2 text-xs"
            >
              {generating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 mr-1" />
                  Generate
                </>
              )}
            </Button>
          </div>
          <Textarea
            placeholder="Describe what you want to create or modify..."
            value={prompt}
            onChange={handlePromptChange}
            className="min-h-[80px] text-xs resize-none nodrag"
          />
          <div>
            <ModelTierSelector value={modelTier} onChange={setModelTier} disabled={generating} />
          </div>
        </div>

        {generatedImage && (
          <div className="space-y-2">
            <Label className="text-xs">Generated Image</Label>
            <img
              src={generatedImage}
              alt="Generated"
              className="w-full h-24 object-cover rounded border cursor-pointer"
              onClick={() => setIsPreviewOpen(true)}
            />
          </div>
        )}

      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="prompt"
        style={{ top: '30%' }}
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="image"
        style={{ top: '70%' }}
        className="w-3 h-3 bg-blue-500"
      />

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={generatedImage}
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