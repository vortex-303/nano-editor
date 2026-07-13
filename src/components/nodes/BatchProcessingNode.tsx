import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Layers, Play, Pause, Square, Download, Loader2, AlertCircle, CheckCircle, XCircle, Save, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { NodeData } from '@/types/nodeEditor';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { generateImage } from '@/lib/falClient';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { PromptSnippetModal } from '@/components/PromptSnippetModal';
import { ModelTierSelector } from '@/components/ModelTierSelector';
import { DEFAULT_TIER_ID } from '@/lib/imageModelTiers';

interface BatchProcessingNodeProps {
  data: NodeData;
  id: string;
}

interface ProcessingResult {
  index: number;
  status: 'pending' | 'processing' | 'success' | 'error';
  inputUrl: string;
  outputUrl?: string;
  error?: string;
}

const THROTTLE_DELAY_MS = 4000; // 4 seconds between requests

export function BatchProcessingNode({ id, data }: BatchProcessingNodeProps) {
  const [prompt, setPrompt] = useState('');
  const [editStrength, setEditStrength] = useState(0.7);
  const [inputImages, setInputImages] = useState<string[]>([]);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [connectedPrompt, setConnectedPrompt] = useState<string | null>(null);
  const [connectedContext, setConnectedContext] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);
  const [snippetModalTab, setSnippetModalTab] = useState<'save' | 'load'>('save');
  const [modelTier, setModelTier] = useState<string>(data.modelTier || DEFAULT_TIER_ID);
  
  const pauseRef = useRef(false);
  const cancelRef = useRef(false);
  
  const { updateNodeData, getConnectedNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();
  const { ensureKey } = useOnboarding();

  // Get input images and connected data from nodes
  useEffect(() => {
    const edges = getEdges();
    const connectedEdges = edges.filter(edge => edge.target === id);
    
    const images: string[] = [];
    
    for (const edge of connectedEdges) {
      if (edge.targetHandle === 'batch-input') {
        const batchData = getConnectedNodeData(id, edges, 'batch-input');
        if (Array.isArray(batchData)) {
          images.push(...batchData);
        }
      }
      if (edge.targetHandle === 'prompt') {
        const promptData = getConnectedNodeData(id, edges, 'prompt');
        if (typeof promptData === 'string') {
          setConnectedPrompt(promptData);
        }
      }
      if (edge.targetHandle === 'context') {
        const contextData = getConnectedNodeData(id, edges, 'context');
        if (typeof contextData === 'string') {
          setConnectedContext(contextData);
        }
      }
    }
    
    setInputImages(images);
    
    // Initialize results array
    if (images.length !== results.length || results.length === 0) {
      setResults(images.map((url, index) => ({
        index,
        status: 'pending',
        inputUrl: url
      })));
    }
  }, [id, getEdges, getConnectedNodeData]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const waitForResume = async () => {
    while (pauseRef.current && !cancelRef.current) {
      await delay(500);
    }
  };

  // Convert SVG to PNG using canvas
  const convertSvgToPng = async (svgUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Use a reasonable size for the output
        const size = Math.max(img.width, img.height, 512);
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        
        // Center the image
        const scale = Math.min(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;
        
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.onerror = () => reject(new Error('Failed to load SVG'));
      img.src = svgUrl;
    });
  };

  const processImage = async (imageUrl: string, index: number): Promise<string> => {
    const effectivePrompt = connectedPrompt || prompt;
    if (!effectivePrompt.trim()) {
      throw new Error('No prompt provided');
    }

    // Build prompt with context
    let fullPrompt = effectivePrompt;
    if (connectedContext) {
      fullPrompt = `Context: ${connectedContext}\n\nTask: ${effectivePrompt}`;
    }

    // Convert SVG to PNG if needed
    let processedImageUrl = imageUrl;
    if (imageUrl.includes('image/svg+xml')) {
      console.log('Converting SVG to PNG for AI processing');
      processedImageUrl = await convertSvgToPng(imageUrl);
    }

    if (editStrength < 1) {
      fullPrompt += ` Apply the edit at roughly ${Math.round(editStrength * 100)}% intensity, keeping the rest of the image close to the original.`;
    }

    return await generateImage({
      prompt: fullPrompt,
      images: [processedImageUrl],
      tier: modelTier,
    });
  };

  const handleStart = async () => {
    const effectivePrompt = connectedPrompt || prompt;
    if (!effectivePrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (inputImages.length === 0) {
      toast.error('No images to process');
      return;
    }

    if (!(await ensureKey())) {
      return;
    }

    setProcessing(true);
    setIsPaused(false);
    pauseRef.current = false;
    cancelRef.current = false;
    setCurrentIndex(0);

    // Reset results
    setResults(inputImages.map((url, index) => ({
      index,
      status: 'pending',
      inputUrl: url
    })));

    const outputUrls: string[] = [];

    for (let i = 0; i < inputImages.length; i++) {
      if (cancelRef.current) break;

      await waitForResume();
      if (cancelRef.current) break;

      setCurrentIndex(i);
      
      // Update status to processing
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'processing' } : r
      ));

      try {
        const resultUrl = await processImage(inputImages[i], i);
        outputUrls.push(resultUrl);
        
        // Update status to success
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'success', outputUrl: resultUrl } : r
        ));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Processing failed';
        
        // Update status to error
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'error', error: errorMsg } : r
        ));
        
        console.error(`Error processing image ${i + 1}:`, error);
      }

      // Throttle between requests
      if (i < inputImages.length - 1 && !cancelRef.current) {
        await delay(THROTTLE_DELAY_MS);
      }
    }

    // Update node data with successful results
    updateNodeData(id, {
      batchOutput: outputUrls,
      results: results.filter(r => r.status === 'success').map(r => r.outputUrl)
    });

    setProcessing(false);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    if (cancelRef.current) {
      toast.info('Processing cancelled');
    } else if (errorCount > 0) {
      toast.warning(`Completed: ${successCount} success, ${errorCount} failed`);
    } else {
      toast.success(`All ${successCount} images processed successfully!`);
    }
  };

  const handlePause = () => {
    pauseRef.current = true;
    setIsPaused(true);
  };

  const handleResume = () => {
    pauseRef.current = false;
    setIsPaused(false);
  };

  const handleCancel = () => {
    cancelRef.current = true;
    pauseRef.current = false;
    setProcessing(false);
    setIsPaused(false);
  };

  const handleDownloadAll = async () => {
    const successResults = results.filter(r => r.status === 'success' && r.outputUrl);
    
    if (successResults.length === 0) {
      toast.error('No results to download');
      return;
    }

    if (successResults.length === 1) {
      const a = document.createElement('a');
      a.href = successResults[0].outputUrl!;
      a.download = 'batch-result-1.png';
      a.click();
      return;
    }

    const zip = new JSZip();
    
    for (let i = 0; i < successResults.length; i++) {
      const result = successResults[i];
      try {
        const response = await fetch(result.outputUrl!);
        const blob = await response.blob();
        zip.file(`batch-result-${i + 1}.png`, blob);
      } catch (e) {
        console.error(`Failed to add image ${i + 1} to zip`);
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch-ai-results.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const progressPercent = inputImages.length > 0 
    ? ((successCount + errorCount) / inputImages.length) * 100 
    : 0;
  const remainingTime = (inputImages.length - currentIndex - 1) * (THROTTLE_DELAY_MS / 1000 + 3); // ~3s per image + throttle

  return (
    <>
    <Card className="w-80 shadow-elegant border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-500" />
            <CardTitle className="text-sm">Batch AI Edit</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {inputImages.length} image{inputImages.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Input Preview */}
        {inputImages.length > 0 && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {inputImages.slice(0, 5).map((img, i) => (
              <img 
                key={i} 
                src={img} 
                alt={`Input ${i + 1}`}
                className="w-10 h-10 object-cover rounded border flex-shrink-0"
              />
            ))}
            {inputImages.length > 5 && (
              <div className="w-10 h-10 rounded border flex items-center justify-center bg-muted text-xs flex-shrink-0">
                +{inputImages.length - 5}
              </div>
            )}
          </div>
        )}

        {/* Prompt */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">
              Prompt {connectedPrompt && <span className="text-muted-foreground">(connected)</span>}
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
                  disabled={processing}
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
                  disabled={!prompt.trim() || processing}
                >
                  <Save className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          <Textarea
            value={connectedPrompt || prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Convert to plastic decoration on a table"
            className="min-h-[60px] text-xs resize-none"
            disabled={!!connectedPrompt || processing}
          />
        </div>

        {/* Edit Strength */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <Label className="text-xs">Edit Strength</Label>
            <span className="text-xs text-muted-foreground">{Math.round(editStrength * 100)}%</span>
          </div>
          <Slider
            value={[editStrength]}
            onValueChange={([v]) => setEditStrength(v)}
            min={0.1}
            max={1}
            step={0.1}
            disabled={processing}
            className="h-4"
          />
        </div>

        <div>
          <ModelTierSelector value={modelTier} onChange={setModelTier} disabled={processing} />
        </div>

        {/* Progress Panel */}
        {processing && (
          <div className="space-y-2 p-2 rounded bg-muted/50">
            <div className="flex justify-between text-xs">
              <span>Processing: {currentIndex + 1}/{inputImages.length}</span>
              <span>~{Math.round(remainingTime)}s remaining</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex gap-1">
              {isPaused ? (
                <Button size="sm" variant="outline" className="flex-1 h-6 text-xs" onClick={handleResume}>
                  <Play className="h-3 w-3 mr-1" /> Resume
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="flex-1 h-6 text-xs" onClick={handlePause}>
                  <Pause className="h-3 w-3 mr-1" /> Pause
                </Button>
              )}
              <Button size="sm" variant="destructive" className="flex-1 h-6 text-xs" onClick={handleCancel}>
                <Square className="h-3 w-3 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Start Button */}
        {!processing && (
          <Button 
            onClick={handleStart} 
            disabled={inputImages.length === 0 || (!prompt.trim() && !connectedPrompt)}
            className="w-full h-8"
            size="sm"
          >
            <Play className="h-3 w-3 mr-1" />
            Process {inputImages.length} Image{inputImages.length !== 1 ? 's' : ''}
          </Button>
        )}

        {/* Results Grid */}
        {results.some(r => r.status !== 'pending') && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium">Results</span>
              <div className="flex gap-1">
                {successCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                    {successCount} ✓
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                    {errorCount} ✗
                  </Badge>
                )}
              </div>
            </div>
            <ScrollArea className="h-24">
              <div className="grid grid-cols-4 gap-1">
                {results.map((result, i) => (
                  <div key={i} className="relative">
                    <img 
                      src={result.outputUrl || result.inputUrl} 
                      alt={`Result ${i + 1}`}
                      className={`w-full h-14 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity ${
                        result.status === 'error' ? 'opacity-50' : ''
                      }`}
                      onClick={() => setPreviewImage(result.outputUrl || result.inputUrl)}
                    />
                    <div className="absolute top-0.5 right-0.5">
                      {result.status === 'processing' && (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                      )}
                      {result.status === 'success' && (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                      {result.status === 'error' && (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {successCount > 0 && !processing && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full h-7 text-xs"
                onClick={handleDownloadAll}
              >
                <Download className="h-3 w-3 mr-1" />
                Download {successCount > 1 ? `All (${successCount})` : 'Result'}
              </Button>
            )}
          </div>
        )}

        {/* Connected Status */}
        {(connectedPrompt || connectedContext) && (
          <div className="flex gap-1 flex-wrap">
            {connectedPrompt && (
              <Badge variant="secondary" className="text-[10px]">Prompt connected</Badge>
            )}
            {connectedContext && (
              <Badge variant="secondary" className="text-[10px]">Context connected</Badge>
            )}
          </div>
        )}

        {/* Handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="batch-input"
          style={{ background: '#9333ea', width: 12, height: 12, border: '2px solid white', top: '25%' }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="prompt"
          style={{ background: '#f97316', width: 10, height: 10, border: '2px solid white', top: '50%' }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="context"
          style={{ background: '#06b6d4', width: 10, height: 10, border: '2px solid white', top: '75%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="batch-output"
          style={{ background: '#9333ea', width: 12, height: 12, border: '2px solid white', top: '50%' }}
        />
      </CardContent>
    </Card>

    {previewImage && (
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage}
      />
    )}

    <PromptSnippetModal
      isOpen={isSnippetModalOpen}
      onClose={() => setIsSnippetModalOpen(false)}
      currentPrompt={prompt}
      onLoadSnippet={setPrompt}
      defaultTab={snippetModalTab}
    />
    </>
  );
}
