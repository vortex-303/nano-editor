import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Download, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import DOMPurify from 'dompurify';
// @ts-ignore
import ImageTracer from 'imagetracerjs';

interface VectorizeNodeProps {
  id: string;
  data: any;
}

type PresetType = 'default' | 'posterized' | 'detailed' | 'photo';

const PRESETS = {
  default: {
    numberofcolors: 16,
    mincolorratio: 0.02,
    strokewidth: 1,
    linefilter: true,
    scale: 1,
  },
  posterized: {
    numberofcolors: 8,
    colorquantcycles: 3,
    strokewidth: 1,
    linefilter: true,
    scale: 1,
  },
  detailed: {
    numberofcolors: 64,
    pathomit: 1,
    strokewidth: 0.5,
    linefilter: false,
    scale: 1,
  },
  photo: {
    numberofcolors: 32,
    blur: 2,
    strokewidth: 1,
    linefilter: true,
    scale: 1,
  },
};

export function VectorizeNode({ id, data }: VectorizeNodeProps) {
  const { getNodeData, updateNodeData, getConnectedNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();
  const nodeData = getNodeData(id);

  const [preset, setPreset] = useState<PresetType>('default');
  const [colorCount, setColorCount] = useState(16);
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [svgResult, setSvgResult] = useState<string>('');
  const [inputImage, setInputImage] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [processingStage, setProcessingStage] = useState('');

  // Get input image from connected node
  useEffect(() => {
    const edges = getEdges();
    const connectedImage = getConnectedNodeData(id, edges, 'image-input');
    if (connectedImage) {
      const imageUrl = Array.isArray(connectedImage) ? connectedImage[0] : connectedImage;
      setInputImage(imageUrl);
    }
  }, [id, getConnectedNodeData, getEdges]);

  const handlePresetChange = (value: PresetType) => {
    setPreset(value);
    const presetConfig = PRESETS[value];
    setColorCount(presetConfig.numberofcolors || 16);
    setStrokeWidth(presetConfig.strokewidth || 1);
  };

  const handleVectorize = async () => {
    if (!inputImage) {
      toast.error('No input image connected');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setProcessingStage('Loading image...');

    try {
      // Load and validate image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = inputImage;
      });

      setProgress(20);
      setProcessingStage('Preparing image...');

      // Resize if too large
      const MAX_SIZE = 1024;
      let canvas = document.createElement('canvas');
      let ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');

      let width = img.width;
      let height = img.height;

      if (width > MAX_SIZE || height > MAX_SIZE) {
        const scale = MAX_SIZE / Math.max(width, height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
        toast.info(`Image resized to ${width}x${height} for optimal processing`);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      setProgress(40);
      setProcessingStage('Analyzing colors...');

      // Get current preset config
      const baseConfig = PRESETS[preset];
      const options = {
        ...baseConfig,
        numberofcolors: colorCount,
        strokewidth: strokeWidth,
      };

      // Simulate progress during tracing
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      setProcessingStage('Tracing paths...');

      // Perform vectorization - imagetracerjs uses callback-based API
      const svg = await new Promise<string>((resolve, reject) => {
        try {
          const result = ImageTracer.imageToSVG(
            canvas.toDataURL(),
            (svgstr: string) => {
              resolve(svgstr);
            },
            options
          );
          // If it returns synchronously instead of using callback
          if (typeof result === 'string') {
            resolve(result);
          }
        } catch (err) {
          reject(err);
        }
      });

      clearInterval(progressInterval);
      setProgress(100);
      setProcessingStage('Complete!');

      console.log('SVG generated, length:', svg?.length);

      if (!svg || svg.length === 0) {
        throw new Error('No SVG generated');
      }

      setSvgResult(svg);
      updateNodeData(id, { result: svg, svgOutput: svg });

      // Calculate sizes
      const originalSize = (inputImage.length * 0.75 / 1024).toFixed(2);
      const svgSize = (new Blob([svg]).size / 1024).toFixed(2);
      
      toast.success(`Vectorized! Original: ${originalSize}KB → SVG: ${svgSize}KB`);
    } catch (error) {
      console.error('Vectorization error:', error);
      toast.error('Failed to vectorize image');
      setProcessingStage('Error');
    } finally {
      setProcessing(false);
      setTimeout(() => {
        setProgress(0);
        setProcessingStage('');
      }, 2000);
    }
  };

  const handleDownload = () => {
    if (!svgResult) return;

    const blob = new Blob([svgResult], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vectorized-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SVG downloaded');
  };

  return (
    <Card className="min-w-[320px] max-w-[400px]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5" />
          Vectorize to SVG
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Preview */}
        {inputImage && (
          <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
            <img 
              src={inputImage} 
              alt="Input" 
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-background/80 rounded text-xs">
              Input
            </div>
          </div>
        )}

        {/* Preset Selection */}
        <div className="space-y-2">
          <Label>Preset</Label>
          <Select value={preset} onValueChange={(value) => handlePresetChange(value as PresetType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (Balanced)</SelectItem>
              <SelectItem value="posterized">Posterized (Fewer Colors)</SelectItem>
              <SelectItem value="detailed">Detailed (Max Quality)</SelectItem>
              <SelectItem value="photo">Photo (Optimized)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Options */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Advanced Options</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Colors: {colorCount}</Label>
              <Slider
                value={[colorCount]}
                onValueChange={([value]) => setColorCount(value)}
                min={2}
                max={64}
                step={1}
                disabled={processing}
              />
            </div>
            <div className="space-y-2">
              <Label>Stroke Width: {strokeWidth}</Label>
              <Slider
                value={[strokeWidth]}
                onValueChange={([value]) => setStrokeWidth(value)}
                min={0.5}
                max={3}
                step={0.5}
                disabled={processing}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Processing Progress */}
        {processing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-center">{processingStage}</p>
          </div>
        )}

        {/* Vectorize Button */}
        <Button 
          onClick={handleVectorize} 
          disabled={!inputImage || processing}
          className="w-full"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Vectorize
            </>
          )}
        </Button>

        {/* SVG Output Preview */}
        {svgResult && (
          <>
            <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
              <div 
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svgResult, { USE_PROFILES: { svg: true, svgFilters: true } }) }}
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
              />
              <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-background/80 rounded text-xs">
                SVG Output
              </div>
            </div>
            <Button 
              onClick={handleDownload} 
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download SVG
            </Button>
          </>
        )}

        {/* Handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="image-input"
          className="w-3 h-3"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="svg-output"
          className="w-3 h-3"
        />
      </CardContent>
    </Card>
  );
}
