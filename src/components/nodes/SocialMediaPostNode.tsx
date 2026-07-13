import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Share, Image, Loader2, Sparkles, ChevronRight, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CreditService } from '@/services/creditService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ModelTierSelector } from '@/components/ModelTierSelector';
import { DEFAULT_TIER_ID } from '@/lib/imageModelTiers';

interface SocialMediaPostNodeProps {
  data: NodeData;
  id: string;
}

interface CampaignHook {
  visualConcept: string;
  headline: string;
  bodyCopy: string;
  cta: string;
  targetMood: string;
  negativeSpacePosition: 'left' | 'right' | 'top' | 'bottom';
  selected?: boolean;
}

interface GeneratedPost {
  imageUrl: string;
  hook: CampaignHook;
}

const platformSizes = {
  instagram: {
    square: { width: 1080, height: 1080, label: 'Square Post' },
    story: { width: 1080, height: 1920, label: 'Story' },
    reel: { width: 1080, height: 1920, label: 'Reel' },
    carousel: { width: 1080, height: 1080, label: 'Carousel' }
  },
  facebook: {
    post: { width: 1200, height: 630, label: 'Post' },
    story: { width: 1080, height: 1920, label: 'Story' },
    cover: { width: 1640, height: 856, label: 'Cover Photo' }
  },
  twitter: {
    post: { width: 1200, height: 675, label: 'Post' },
    header: { width: 1500, height: 500, label: 'Header' }
  },
  linkedin: {
    post: { width: 1200, height: 627, label: 'Post' },
    banner: { width: 1584, height: 396, label: 'Banner' }
  },
  tiktok: {
    video: { width: 1080, height: 1920, label: 'Video' }
  }
};

type GenerationPhase = 'idle' | 'strategy' | 'images' | 'complete';

export const SocialMediaPostNode: React.FC<SocialMediaPostNodeProps> = ({ data, id }) => {
  const [platform, setPlatform] = useState('instagram');
  const [postType, setPostType] = useState('square');
  const [campaign, setCampaign] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [ideaCount, setIdeaCount] = useState([3]);
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase>('idle');
  const [campaignHooks, setCampaignHooks] = useState<CampaignHook[]>([]);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelTier, setModelTier] = useState<string>(data.modelTier || DEFAULT_TIER_ID);

  const { getEdges } = useReactFlow();
  const { updateNodeData, getConnectedNodeData, addImageInputNode, getNodeData } = useNodeDataContext();
  const { user, deductCredit } = useAuth();

  const edges = getEdges();
  
  // Get individual image connections for each handle
  const getImageFromHandle = (handleId: string) => {
    const connectedEdge = edges.find(edge => 
      edge.target === id && edge.targetHandle === handleId
    );
    if (!connectedEdge) return null;
    
    const sourceNodeData = getNodeData(connectedEdge.source);
    const imageData = sourceNodeData?.image || sourceNodeData?.result;
    
    if (typeof imageData === 'string') {
      return imageData;
    } else if (Array.isArray(imageData) && imageData.length > 0) {
      return imageData[0];
    }
    
    return null;
  };
  
  const connectedImage1 = getImageFromHandle('image');
  const connectedImage2 = getImageFromHandle('image2');
  const connectedImage3 = getImageFromHandle('image3');
  const connectedImages = [connectedImage1, connectedImage2, connectedImage3].filter(Boolean);
  const connectedPrompt = getConnectedNodeData(id, edges, 'prompt');
  const connectedContext = getConnectedNodeData(id, edges, 'context');

  const currentSize = platformSizes[platform as keyof typeof platformSizes][postType as keyof typeof platformSizes['instagram']];

  const processing = generationPhase === 'strategy' || generationPhase === 'images';

  useEffect(() => {
    const results = generatedPosts.map(p => p.imageUrl);
    updateNodeData(id, { 
      result: results,
      images: results,
      processing,
      error,
      platform,
      postType,
      campaign,
      ideaCount: ideaCount[0],
      campaignHooks,
      generatedPosts
    });
  }, [generatedPosts, processing, error, platform, postType, campaign, ideaCount, campaignHooks, id, updateNodeData]);

  useEffect(() => {
    const availableTypes = Object.keys(platformSizes[platform as keyof typeof platformSizes]);
    if (!availableTypes.includes(postType)) {
      setPostType(availableTypes[0]);
    }
  }, [platform, postType]);

  const handleGenerateStrategy = async () => {
    if (!campaign.trim() && !connectedPrompt?.prompt) {
      setError('Please provide a campaign description');
      return;
    }

    setGenerationPhase('strategy');
    setError(null);
    setCampaignHooks([]);
    setGeneratedPosts([]);

    try {
      if (!user) {
        toast.error('Please sign in to generate content.');
        setGenerationPhase('idle');
        return;
      }

      // Check credits first
      const creditCheckResult = await CreditService.canUserGenerate(user.id);
      if (!creditCheckResult.canGenerate) {
        toast.error(`Insufficient credits: ${creditCheckResult.reason}`);
        setGenerationPhase('idle');
        return;
      }

      const promptText = connectedPrompt?.prompt ? 
        (typeof connectedPrompt.prompt === 'string' ? connectedPrompt.prompt : 
         Array.isArray(connectedPrompt.prompt) ? connectedPrompt.prompt.join(' ') : '') : '';
      
      const contextText = connectedContext ? 
        (typeof connectedContext === 'string' ? connectedContext : 
         Array.isArray(connectedContext) ? connectedContext.join(' ') : '') : '';

      toast.info('Generating campaign strategy...');

      const { data: result, error: supabaseError } = await supabase.functions.invoke('generate-campaign-strategy', {
        body: {
          campaign: promptText || campaign,
          targetAudience: targetAudience || undefined,
          platform,
          postType,
          dimensions: { width: currentSize.width, height: currentSize.height },
          ideaCount: ideaCount[0],
          context: contextText || undefined,
          referenceImages: connectedImages.length > 0 ? connectedImages : undefined
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (!result?.success || !result?.hooks?.length) {
        throw new Error(result?.error || 'Failed to generate campaign strategy');
      }

      // Mark all hooks as selected by default
      const hooksWithSelection = result.hooks.map((hook: CampaignHook) => ({
        ...hook,
        selected: true
      }));

      setCampaignHooks(hooksWithSelection);
      setGenerationPhase('complete');
      toast.success(`Generated ${hooksWithSelection.length} campaign hooks!`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate strategy';
      setError(errorMessage);
      toast.error(errorMessage);
      setGenerationPhase('idle');
    }
  };

  const toggleHookSelection = (index: number) => {
    setCampaignHooks(prev => prev.map((hook, i) => 
      i === index ? { ...hook, selected: !hook.selected } : hook
    ));
  };

  const handleGenerateImages = async () => {
    const selectedHooks = campaignHooks.filter(h => h.selected);
    
    if (selectedHooks.length === 0) {
      toast.error('Please select at least one hook to generate images for');
      return;
    }

    setGenerationPhase('images');
    setError(null);
    setGeneratedPosts([]);

    try {
      if (!user) {
        toast.error('Please sign in to generate images.');
        setGenerationPhase('complete');
        return;
      }

      // Check and deduct credits for each image
      for (let i = 0; i < selectedHooks.length; i++) {
        const canDeduct = await deductCredit();
        if (!canDeduct) {
          toast.error(`Insufficient credits. Could only prepare ${i} of ${selectedHooks.length} images.`);
          if (i === 0) {
            setGenerationPhase('complete');
            return;
          }
          break;
        }
      }

      const results: GeneratedPost[] = [];

      for (let i = 0; i < selectedHooks.length; i++) {
        const hook = selectedHooks[i];
        toast.info(`Generating image ${i + 1} of ${selectedHooks.length}...`);

        const requestBody: any = {
          prompt: hook.visualConcept,
          isSocialPost: true,
          visualConcept: hook.visualConcept,
          negativeSpacePosition: hook.negativeSpacePosition,
          targetMood: hook.targetMood,
          platform,
          postType,
          width: currentSize.width,
          height: currentSize.height,
          // Pass text content to be rendered in the image
          headline: hook.headline,
          bodyCopy: hook.bodyCopy,
          cta: hook.cta,
          modelTier,
        };

        // Add reference images if connected
        if (connectedImages.length > 0) {
          requestBody.images = connectedImages;
        }

        const { data: result, error: supabaseError } = await supabase.functions.invoke('generate-image', {
          body: requestBody
        });

        if (supabaseError) {
          console.error(`Failed to generate image ${i + 1}:`, supabaseError);
          continue;
        }

        if (result?.imageUrl) {
          results.push({ imageUrl: result.imageUrl, hook });
        } else if (result?.image) {
          results.push({ imageUrl: result.image, hook });
        }
      }

      setGeneratedPosts(results);
      setGenerationPhase('complete');

      if (results.length > 0) {
        toast.success(`Generated ${results.length} social media posts!`);
      } else {
        toast.error('No images were generated');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate images';
      setError(errorMessage);
      toast.error(errorMessage);
      setGenerationPhase('complete');
    }
  };

  const handleImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
  };

  const resetToIdle = () => {
    setGenerationPhase('idle');
    setCampaignHooks([]);
    setGeneratedPosts([]);
    setError(null);
  };

  const aspectRatio = currentSize.width / currentSize.height;
  const previewWidth = aspectRatio > 1 ? 120 : 80;
  const previewHeight = aspectRatio > 1 ? 120 / aspectRatio : 80 * aspectRatio;

  const selectedHooksCount = campaignHooks.filter(h => h.selected).length;

  return (
    <>
      <Card className="w-96 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Share size={16} className="text-primary" />
            Social Media Post
            {generationPhase !== 'idle' && (
              <Badge variant="outline" className="ml-auto text-xs">
                {generationPhase === 'strategy' && 'Generating Strategy...'}
                {generationPhase === 'images' && 'Generating Images...'}
                {generationPhase === 'complete' && 'Complete'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Platform Selection */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Platform</label>
              <Select value={platform} onValueChange={setPlatform} disabled={processing}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Post Type</label>
              <Select value={postType} onValueChange={setPostType} disabled={processing}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(platformSizes[platform as keyof typeof platformSizes]).map(([key, size]) => (
                    <SelectItem key={key} value={key}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Size Preview */}
          <div className="flex items-center gap-3">
            <div 
              className="border-2 border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center bg-muted/20 flex-shrink-0"
              style={{ width: previewWidth, height: previewHeight }}
            >
              <span className="text-[10px] text-muted-foreground">{currentSize.width}×{currentSize.height}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              <div className="font-medium">{currentSize.label}</div>
              <div>{currentSize.width} × {currentSize.height}px</div>
            </div>
          </div>

          {/* Connected Images */}
          {connectedImages.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium">Reference Images</label>
              <div className="flex gap-2">
                {connectedImages.slice(0, 3).map((image, idx) => (
                  <div key={idx} className="relative">
                    <img 
                      src={image} 
                      alt={`Reference ${idx + 1}`} 
                      className="w-12 h-12 object-cover rounded border"
                    />
                    <Badge variant="secondary" className="absolute -top-1 -right-1 text-xs px-1 py-0">{idx + 1}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campaign Input - Only show in idle state */}
          {generationPhase === 'idle' && (
            <>
              {!connectedPrompt?.prompt && (
                <div className="space-y-1">
                  <label className="text-xs font-medium">Campaign Brief</label>
                  <Textarea
                    placeholder="Describe your ad campaign and key message..."
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    className="min-h-16 text-xs"
                  />
                </div>
              )}

              {connectedPrompt?.prompt && (
                <div className="space-y-1">
                  <label className="text-xs font-medium">Connected Prompt</label>
                  <div className="text-xs p-2 bg-muted rounded border line-clamp-2">
                    {typeof connectedPrompt.prompt === 'string' 
                      ? connectedPrompt.prompt.substring(0, 100) 
                      : Array.isArray(connectedPrompt.prompt) 
                        ? connectedPrompt.prompt.join(' ').substring(0, 100)
                        : ''
                    }...
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium">Target Audience (Optional)</label>
                <Input
                  placeholder="e.g., Young professionals aged 25-35..."
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Creative Ideas ({ideaCount[0]})
                </label>
                <Slider
                  value={ideaCount}
                  onValueChange={setIdeaCount}
                  max={5}
                  min={1}
                  step={1}
                  className="py-2"
                />
              </div>

              {/* Connection Status */}
              <div className="flex flex-wrap gap-2 text-xs">
                {connectedImages.length > 0 && (
                  <Badge variant="secondary" className="text-blue-600">
                    {connectedImages.length} image(s)
                  </Badge>
                )}
                {connectedPrompt?.prompt && (
                  <Badge variant="secondary" className="text-green-600">
                    Prompt connected
                  </Badge>
                )}
                {connectedContext && (
                  <Badge variant="secondary" className="text-orange-600">
                    Context connected
                  </Badge>
                )}
              </div>

              {/* Generate Strategy Button */}
              <Button 
                onClick={handleGenerateStrategy}
                disabled={processing || (!campaign.trim() && !connectedPrompt?.prompt)}
                className="w-full h-9"
              >
                <Sparkles size={14} className="mr-2" />
                Generate Strategy (1 credit)
              </Button>
            </>
          )}

          {/* Campaign Hooks Preview */}
          {campaignHooks.length > 0 && generationPhase === 'complete' && generatedPosts.length === 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Campaign Hooks ({selectedHooksCount}/{campaignHooks.length} selected)</label>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={resetToIdle}>
                  <X size={12} className="mr-1" /> Reset
                </Button>
              </div>
              <ScrollArea className="h-48 pr-2">
                <div className="space-y-2">
                  {campaignHooks.map((hook, index) => (
                    <div 
                      key={index}
                      onClick={() => toggleHookSelection(index)}
                      className={`p-2 rounded border cursor-pointer transition-colors ${
                        hook.selected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          hook.selected ? 'bg-primary border-primary' : 'border-muted-foreground/50'
                        }`}>
                          {hook.selected && <Check size={10} className="text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs line-clamp-1">{hook.headline}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{hook.bodyCopy}</div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">{hook.targetMood}</Badge>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">{hook.cta}</Badge>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">Space: {hook.negativeSpacePosition}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div>
                <ModelTierSelector value={modelTier} onChange={setModelTier} disabled={processing} />
              </div>

              {/* Generate Images Button */}
              <Button 
                onClick={handleGenerateImages}
                disabled={selectedHooksCount === 0}
                className="w-full h-9"
              >
                <Image size={14} className="mr-2" />
                Generate Images ({selectedHooksCount} credit{selectedHooksCount !== 1 ? 's' : ''})
                <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          )}

          {/* Processing State */}
          {processing && (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Loader2 size={24} className="animate-spin text-primary" />
              <div className="text-sm text-muted-foreground">
                {generationPhase === 'strategy' ? 'Generating campaign strategy...' : 'Creating images...'}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="text-xs text-destructive p-2 bg-destructive/10 rounded border border-destructive/20">
              {error}
            </div>
          )}

          {/* Generated Posts Results */}
          {generatedPosts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Generated Posts ({generatedPosts.length})</label>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={resetToIdle}>
                  <X size={12} className="mr-1" /> New Campaign
                </Button>
              </div>
              <ScrollArea className="h-64 pr-2">
                <div className="space-y-3">
                  {generatedPosts.map((post, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      {/* Image with text overlay visualization */}
                      <div 
                        className="relative cursor-pointer" 
                        onClick={() => handleImagePreview(post.imageUrl)}
                      >
                        <img
                          src={post.imageUrl}
                          alt={`Generated post ${index + 1}`}
                          className="w-full aspect-square object-cover"
                        />
                        {/* Text overlay indicator */}
                        <div className={`absolute p-2 ${
                          post.hook.negativeSpacePosition === 'left' ? 'left-0 top-0 bottom-0 w-1/3' :
                          post.hook.negativeSpacePosition === 'right' ? 'right-0 top-0 bottom-0 w-1/3' :
                          post.hook.negativeSpacePosition === 'top' ? 'top-0 left-0 right-0 h-1/3' :
                          'bottom-0 left-0 right-0 h-1/3'
                        } bg-black/30 flex flex-col justify-center`}>
                          <div className="text-white text-xs font-bold line-clamp-2 drop-shadow-lg">
                            {post.hook.headline}
                          </div>
                        </div>
                      </div>
                      {/* Post details */}
                      <div className="p-2 bg-muted/30 space-y-1">
                        <div className="text-xs text-muted-foreground line-clamp-2">{post.hook.bodyCopy}</div>
                        <div className="flex gap-1">
                          <Badge className="text-[10px] px-1 py-0">{post.hook.cta}</Badge>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{post.hook.targetMood}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>

        {/* Image Input Handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="image"
          style={{ top: '12%' }}
          className="w-3 h-3 bg-blue-500 border-2 border-white"
        />
        
        <Handle
          type="target"
          position={Position.Left}
          id="image2"
          style={{ top: '20%' }}
          className="w-3 h-3 bg-blue-500 border-2 border-white"
        />
        
        <Handle
          type="target"
          position={Position.Left}
          id="image3"
          style={{ top: '28%' }}
          className="w-3 h-3 bg-blue-500 border-2 border-white"
        />
        
        {/* Prompt Input Handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="prompt"
          style={{ top: '40%' }}
          className="w-3 h-3 bg-green-500 border-2 border-white"
        />
        
        {/* Context Input Handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="context"
          style={{ top: '52%' }}
          className="w-3 h-3 bg-orange-500 border-2 border-white"
        />

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="images"
          style={{ top: '50%' }}
          className="w-3 h-3 bg-purple-500 border-2 border-white"
        />
      </Card>

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage}
          showAddToBoard={true}
          onAddToBoard={(imageUrl) => {
            addImageInputNode?.(imageUrl);
            toast.success('Image added to board as new input node');
            setPreviewImage(null);
          }}
        />
      )}
    </>
  );
};
