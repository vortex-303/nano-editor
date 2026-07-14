import { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Maximize2, Download, Info } from 'lucide-react';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { toast } from 'sonner';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { upscale } from '@/lib/falClient';
import { superResolution, type LocalUpscaleFactor } from '@/lib/localAi';

interface UpscaleNodeProps {
  id: string;
  data: any;
}

type UpscaleEngine = 'local' | 'fal';

export default function UpscaleNode({ id, data }: UpscaleNodeProps) {
  const { getConnectedNodeData, updateNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();
  const { ensureKey } = useOnboarding();
  const edges = getEdges();

  const [imageUrl, setImageUrl] = useState<string>('');
  const [engine, setEngine] = useState<UpscaleEngine>(data.upscaleEngine || 'local');
  const [scale, setScale] = useState<number>(2);
  const [faceEnhance, setFaceEnhance] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  // Get connected image data
  const connectedImage = getConnectedNodeData(id, edges, 'image');

  useEffect(() => {
    if (connectedImage) {
      const img = Array.isArray(connectedImage) ? connectedImage[0] : connectedImage;
      setImageUrl(img);
      loadImageDimensions(img);
    }
  }, [connectedImage]);

  const loadImageDimensions = (url: string) => {
    const img = new Image();
    img.onload = () => {
      setOriginalDimensions({ width: img.width, height: img.height });
    };
    img.src = url;
  };

  const effectiveScale = scale;

  const handleUpscale = async () => {
    if (!imageUrl) {
      toast.error('No image to upscale');
      return;
    }

    if (engine === 'fal' && !(await ensureKey())) {
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('');
    const startTime = Date.now();

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 90));
    }, 500);

    try {
      let upscaledUrl: string;
      if (engine === 'local') {
        upscaledUrl = await superResolution(imageUrl, scale as LocalUpscaleFactor, setProgressMessage);
      } else {
        upscaledUrl = await upscale({ image: imageUrl, scale, faceEnhance });
      }

      const endTime = Date.now();
      const timeElapsed = (endTime - startTime) / 1000;

      setResult(upscaledUrl);
      setProcessingTime(timeElapsed);
      setProgress(100);
      updateNodeData(id, {
        result: upscaledUrl,
        upscaledImage: upscaledUrl,
        scale: effectiveScale,
        upscaleEngine: engine,
        processingTime: timeElapsed
      });

      toast.success(`Image upscaled ${effectiveScale}x in ${timeElapsed.toFixed(1)}s`);
    } catch (error: any) {
      console.error('Upscale error:', error);
      toast.error(error.message || 'Failed to upscale image');
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setProgressMessage('');
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const link = document.createElement('a');
    link.href = result;
    link.download = `upscaled-${effectiveScale}x-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-[400px] shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Maximize2 className="w-4 h-4" />
          Upscale Image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="image"
          className="w-3 h-3 bg-blue-500"
        />
        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="result"
          className="w-3 h-3 bg-blue-500"
        />

        {imageUrl && (
          <div className="space-y-2">
            <img
              src={imageUrl}
              alt="Source"
              className="w-full h-32 object-cover rounded border"
            />
            {originalDimensions && (
              <p className="text-xs text-muted-foreground text-center">
                Original: {originalDimensions.width} × {originalDimensions.height}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Engine</Label>
          <Select value={engine} onValueChange={(v) => setEngine(v as UpscaleEngine)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local AI — free, 2x/4x, runs in browser</SelectItem>
              <SelectItem value="fal">fal.ai ESRGAN — 2x/4x + face enhance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Scale Factor</Label>
          <Select value={scale.toString()} onValueChange={(v) => setScale(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2x (Double)</SelectItem>
              <SelectItem value="4">4x (Quadruple)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {engine === 'fal' && (
          <div className="flex items-center justify-between">
            <Label htmlFor="face-enhance" className="flex items-center gap-2">
              Face Enhancement
              <Info className="w-3 h-3 text-muted-foreground" />
            </Label>
            <Switch
              id="face-enhance"
              checked={faceEnhance}
              onCheckedChange={setFaceEnhance}
            />
          </div>
        )}

        {originalDimensions && (
          <p className="text-xs text-muted-foreground">
            Output: {originalDimensions.width * effectiveScale} × {originalDimensions.height * effectiveScale}
          </p>
        )}

        {engine === 'local' && (
          <p className="text-xs text-muted-foreground">
            Free Swin2SR models (~60MB each, download once and stay cached). Large images are capped at {scale === 4 ? '384' : '512'}px input to keep processing manageable.
          </p>
        )}

        <Button
          onClick={handleUpscale}
          disabled={!imageUrl || isProcessing}
          className="w-full"
        >
          {isProcessing ? 'Upscaling...' : `Upscale ${effectiveScale}x`}
        </Button>

        {!imageUrl && (
          <p className="text-xs text-muted-foreground text-center">
            Connect an image to enable upscaling
          </p>
        )}

        {isProcessing && (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-center">
              {progressMessage || `${progress}% complete`}
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <Label>Upscaled Result</Label>
            <img
              src={result}
              alt="Upscaled"
              className="w-full rounded border"
            />
            <Button
              onClick={handleDownload}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download {effectiveScale}x Image
            </Button>
          </div>
        )}

        {processingTime && !isProcessing && (
          <p className="text-xs text-muted-foreground text-center">
            Processed in {processingTime.toFixed(1)}s
          </p>
        )}
      </CardContent>
    </Card>
  );
}
