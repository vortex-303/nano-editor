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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface UpscaleNodeProps {
  id: string;
  data: any;
}

export default function UpscaleNode({ id, data }: UpscaleNodeProps) {
  const { getConnectedNodeData, updateNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();
  const { deductCredit } = useAuth();
  const edges = getEdges();
  
  const [imageUrl, setImageUrl] = useState<string>('');
  const [scale, setScale] = useState<number>(2);
  const [faceEnhance, setFaceEnhance] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  // Get connected image data
  const connectedImage = getConnectedNodeData(id, edges, 'image');

  useEffect(() => {
    console.log('UpscaleNode - Connected image:', connectedImage);
    
    if (connectedImage) {
      const img = Array.isArray(connectedImage) ? connectedImage[0] : connectedImage;
      console.log('UpscaleNode - Setting imageUrl:', img);
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

  const resizeImageIfNeeded = async (url: string): Promise<string> => {
    const MAX_PIXELS = 2000000; // Safe limit below Replicate's 2096704
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const totalPixels = img.width * img.height;
        
        // If image is within limits, return original URL
        if (totalPixels <= MAX_PIXELS) {
          resolve(url);
          return;
        }
        
        // Calculate scale factor to fit within pixel limit
        const scaleFactor = Math.sqrt(MAX_PIXELS / totalPixels);
        const newWidth = Math.floor(img.width * scaleFactor);
        const newHeight = Math.floor(img.height * scaleFactor);
        
        console.log(`Resizing image from ${img.width}x${img.height} to ${newWidth}x${newHeight}`);
        
        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Convert to base64
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.95);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  };

  const handleUpscale = async () => {
    if (!imageUrl) {
      toast.error('No image to upscale');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    const startTime = Date.now();

    try {
      // Check and deduct credit before processing
      const canDeduct = await deductCredit();
      if (!canDeduct) {
        toast.error('Insufficient credits. Please upgrade your plan.');
        setIsProcessing(false);
        return;
      }

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      // Resize image if needed to fit Replicate's GPU memory limits
      const processedImageUrl = await resizeImageIfNeeded(imageUrl);
      
      console.log('Starting upscale with:', { imageUrl: processedImageUrl, scale, faceEnhance });

      const { data: functionData, error: functionError } = await supabase.functions.invoke('upscale-image', {
        body: { 
          image: processedImageUrl,
          scale,
          faceEnhance
        }
      });

      clearInterval(progressInterval);

      if (functionError) {
        throw functionError;
      }

      console.log('Upscale response:', functionData);

      let upscaledUrl = functionData.output;
      
      // Handle array response
      if (Array.isArray(upscaledUrl)) {
        upscaledUrl = upscaledUrl[0];
      }

      if (!upscaledUrl) {
        throw new Error('No upscaled image returned');
      }

      const endTime = Date.now();
      const timeElapsed = (endTime - startTime) / 1000;

      setResult(upscaledUrl);
      setProcessingTime(timeElapsed);
      setProgress(100);
      updateNodeData(id, { 
        result: upscaledUrl,
        upscaledImage: upscaledUrl,
        scale,
        processingTime: timeElapsed
      });

      toast.success(`Image upscaled ${scale}x in ${timeElapsed.toFixed(1)}s`);
    } catch (error: any) {
      console.error('Upscale error:', error);
      toast.error(error.message || 'Failed to upscale image');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    
    const link = document.createElement('a');
    link.href = result;
    link.download = `upscaled-${scale}x-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const estimatedCost = 0.0022; // Cost per upscale in USD

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
          {originalDimensions && (
            <p className="text-xs text-muted-foreground">
              Output: {originalDimensions.width * scale} × {originalDimensions.height * scale}
            </p>
          )}
        </div>

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

        <div className="bg-muted/50 p-3 rounded-md space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Credit cost:</span>
            <span className="font-medium">1 credit</span>
          </div>
          {processingTime && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Processing time:</span>
              <span className="font-medium">{processingTime.toFixed(1)}s</span>
            </div>
          )}
        </div>

        <Button 
          onClick={handleUpscale} 
          disabled={!imageUrl || isProcessing}
          className="w-full"
        >
          {isProcessing ? 'Upscaling...' : `Upscale ${scale}x`}
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
              {progress}% complete
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
              Download {scale}x Image
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
