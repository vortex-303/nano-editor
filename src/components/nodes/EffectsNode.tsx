import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2, Wand2, Download } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { toast } from 'sonner';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { removeBackground, superResolution2x } from '@/lib/localAi';
import { ImagePreviewModal } from '../ImagePreviewModal';

interface EffectsNodeProps {
  data: NodeData;
  id: string;
}

type EffectType = 
  | 'grayscale' | 'invert'
  | 'removeBackground'
  | 'edgeDetection'
  | 'superResolution'
  | 'pixelation' | 'mosaic'
  | 'swirl' | 'ripple'
  | 'sketch' | 'aging';

const effectOptions = [
  // AI Background Removal - moved to top
  { value: 'removeBackground', label: 'Remove Background', description: 'AI background removal with RMBG V1.4', category: 'AI Background' },
  
  // Basic Effects
  { value: 'grayscale', label: 'Grayscale', description: 'Convert to grayscale', category: 'Basic' },
  { value: 'invert', label: 'Invert', description: 'Invert colors', category: 'Basic' },
  
  // Artistic Effects
  { value: 'pixelation', label: 'Pixelation', description: 'Pixelate the image with adjustable size', category: 'Artistic' },
  { value: 'mosaic', label: 'Mosaic', description: 'Create mosaic tile effect', category: 'Artistic' },
  { value: 'swirl', label: 'Swirl Effect', description: 'Swirl/twirl distortion effect', category: 'Artistic' },
  { value: 'ripple', label: 'Ripple Effect', description: 'Water ripple distortion', category: 'Artistic' },
  { value: 'sketch', label: 'Sketch Effect', description: 'Pencil sketch artistic filter', category: 'Artistic' },
  { value: 'aging', label: 'Aging Effect', description: 'Vintage aging filter', category: 'Artistic' },
  
  // Computer Vision Effects
  { value: 'edgeDetection', label: 'Edge Detection', description: 'Sobel edge detection filter', category: 'Computer Vision' },
  
  // AI Enhancement
  { value: 'superResolution', label: 'Super Resolution', description: '2x upscaling with AI', category: 'AI Enhancement' },
];

const MAX_IMAGE_DIMENSION = 1024;

export const EffectsNode: React.FC<EffectsNodeProps> = ({ data, id }) => {
  const [selectedEffect, setSelectedEffect] = useState<EffectType>(data.selectedEffect || 'removeBackground');
  const [intensity, setIntensity] = useState(data.intensity || [1]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(data.result || '');
  const [error, setError] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getConnectedNodeData, updateNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();

  // Get connected input data
  const edges = getEdges();
  const connectedImage = getConnectedNodeData(id, edges, 'image');

  // Update node data when result changes
  useEffect(() => {
    updateNodeData(id, { result, processing, error, selectedEffect, intensity: intensity[0] });
  }, [result, processing, error, selectedEffect, intensity, id, updateNodeData]);

  const resizeImageIfNeeded = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) => {
    let width = image.naturalWidth;
    let height = image.naturalHeight;

    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      if (width > height) {
        height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
        width = MAX_IMAGE_DIMENSION;
      } else {
        width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
        height = MAX_IMAGE_DIMENSION;
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    return { width, height };
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Edge Detection using Sobel filter
  const applyEdgeDetection = async (imageElement: HTMLImageElement): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    resizeImageIfNeeded(canvas, ctx, imageElement);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    const output = new Uint8ClampedArray(data.length);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let pixelX = 0, pixelY = 0;
        
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const idx = ((y + i) * width + (x + j)) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            const kernelIdx = (i + 1) * 3 + (j + 1);
            pixelX += gray * sobelX[kernelIdx];
            pixelY += gray * sobelY[kernelIdx];
          }
        }
        
        const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
        const outputIdx = (y * width + x) * 4;
        output[outputIdx] = magnitude;
        output[outputIdx + 1] = magnitude;
        output[outputIdx + 2] = magnitude;
        output[outputIdx + 3] = 255;
      }
    }
    
    const outputImageData = new ImageData(output, width, height);
    ctx.putImageData(outputImageData, 0, 0);
    return canvas.toDataURL('image/png', 1.0);
  };


  const applyCanvasEffect = async (imageElement: HTMLImageElement, effect: EffectType, intensityValue: number): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    resizeImageIfNeeded(canvas, ctx, imageElement);

    switch (effect) {
      case 'grayscale': {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = gray * intensityValue + data[i] * (1 - intensityValue);
          data[i + 1] = gray * intensityValue + data[i + 1] * (1 - intensityValue);
          data[i + 2] = gray * intensityValue + data[i + 2] * (1 - intensityValue);
        }
        
        ctx.putImageData(imageData, 0, 0);
        break;
      }
      
      
      case 'invert': {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const invR = 255 - data[i];
          const invG = 255 - data[i + 1];
          const invB = 255 - data[i + 2];
          
          data[i] = invR * intensityValue + data[i] * (1 - intensityValue);
          data[i + 1] = invG * intensityValue + data[i + 1] * (1 - intensityValue);
          data[i + 2] = invB * intensityValue + data[i + 2] * (1 - intensityValue);
        }
        
        ctx.putImageData(imageData, 0, 0);
        break;
      }

      case 'pixelation': {
        const blockSize = Math.max(2, Math.round(8 * intensityValue));
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let y = 0; y < canvas.height; y += blockSize) {
          for (let x = 0; x < canvas.width; x += blockSize) {
            let r = 0, g = 0, b = 0, count = 0;
            
            // Calculate average color in block
            for (let dy = 0; dy < blockSize && y + dy < canvas.height; dy++) {
              for (let dx = 0; dx < blockSize && x + dx < canvas.width; dx++) {
                const idx = ((y + dy) * canvas.width + (x + dx)) * 4;
                r += data[idx];
                g += data[idx + 1];
                b += data[idx + 2];
                count++;
              }
            }
            
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            
            // Fill block with average color
            for (let dy = 0; dy < blockSize && y + dy < canvas.height; dy++) {
              for (let dx = 0; dx < blockSize && x + dx < canvas.width; dx++) {
                const idx = ((y + dy) * canvas.width + (x + dx)) * 4;
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
              }
            }
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        break;
      }

      case 'mosaic': {
        const tileSize = Math.max(4, Math.round(16 * intensityValue));
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let y = 0; y < canvas.height; y += tileSize) {
          for (let x = 0; x < canvas.width; x += tileSize) {
            // Get center pixel color
            const centerY = Math.min(y + Math.floor(tileSize / 2), canvas.height - 1);
            const centerX = Math.min(x + Math.floor(tileSize / 2), canvas.width - 1);
            const centerIdx = (centerY * canvas.width + centerX) * 4;
            const centerR = data[centerIdx];
            const centerG = data[centerIdx + 1];
            const centerB = data[centerIdx + 2];
            
            // Fill tile with center color and add border
            for (let dy = 0; dy < tileSize && y + dy < canvas.height; dy++) {
              for (let dx = 0; dx < tileSize && x + dx < canvas.width; dx++) {
                const idx = ((y + dy) * canvas.width + (x + dx)) * 4;
                const isBorder = dx === 0 || dy === 0 || dx === tileSize - 1 || dy === tileSize - 1;
                
                if (isBorder) {
                  data[idx] = Math.max(0, centerR - 40);
                  data[idx + 1] = Math.max(0, centerG - 40);
                  data[idx + 2] = Math.max(0, centerB - 40);
                } else {
                  data[idx] = centerR;
                  data[idx + 1] = centerG;
                  data[idx + 2] = centerB;
                }
              }
            }
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        break;
      }

      case 'swirl': {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY);
        const strength = intensityValue * 0.02;
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const outputData = new Uint8ClampedArray(data);
        
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < radius) {
              const angle = Math.atan2(dy, dx);
              const swirl = strength * (radius - distance) / radius;
              const newAngle = angle + swirl;
              
              const sourceX = Math.round(centerX + distance * Math.cos(newAngle));
              const sourceY = Math.round(centerY + distance * Math.sin(newAngle));
              
              if (sourceX >= 0 && sourceX < canvas.width && sourceY >= 0 && sourceY < canvas.height) {
                const sourceIdx = (sourceY * canvas.width + sourceX) * 4;
                const targetIdx = (y * canvas.width + x) * 4;
                
                outputData[targetIdx] = data[sourceIdx];
                outputData[targetIdx + 1] = data[sourceIdx + 1];
                outputData[targetIdx + 2] = data[sourceIdx + 2];
                outputData[targetIdx + 3] = data[sourceIdx + 3];
              }
            }
          }
        }
        
        const outputImageData = new ImageData(outputData, canvas.width, canvas.height);
        ctx.putImageData(outputImageData, 0, 0);
        break;
      }

      case 'ripple': {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const amplitude = 20 * intensityValue;
        const frequency = 0.02 + (intensityValue * 0.03);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const outputData = new Uint8ClampedArray(data);
        
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const ripple = amplitude * Math.sin(distance * frequency);
            const sourceX = Math.round(x + ripple * (dx / distance || 0));
            const sourceY = Math.round(y + ripple * (dy / distance || 0));
            
            if (sourceX >= 0 && sourceX < canvas.width && sourceY >= 0 && sourceY < canvas.height) {
              const sourceIdx = (sourceY * canvas.width + sourceX) * 4;
              const targetIdx = (y * canvas.width + x) * 4;
              
              outputData[targetIdx] = data[sourceIdx];
              outputData[targetIdx + 1] = data[sourceIdx + 1];
              outputData[targetIdx + 2] = data[sourceIdx + 2];
              outputData[targetIdx + 3] = data[sourceIdx + 3];
            }
          }
        }
        
        const outputImageData = new ImageData(outputData, canvas.width, canvas.height);
        ctx.putImageData(outputImageData, 0, 0);
        break;
      }

      case 'sketch': {
        // Convert to grayscale and apply edge detection for sketch effect
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const grayData = new Uint8ClampedArray(data.length);
        
        // Convert to grayscale
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          grayData[i] = gray;
          grayData[i + 1] = gray;
          grayData[i + 2] = gray;
          grayData[i + 3] = data[i + 3];
        }
        
        // Apply edge detection with sketch styling
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            let pixelX = 0, pixelY = 0;
            
            for (let i = -1; i <= 1; i++) {
              for (let j = -1; j <= 1; j++) {
                const idx = ((y + i) * canvas.width + (x + j)) * 4;
                const gray = grayData[idx];
                const kernelIdx = (i + 1) * 3 + (j + 1);
                pixelX += gray * sobelX[kernelIdx];
                pixelY += gray * sobelY[kernelIdx];
              }
            }
            
            const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
            const sketch = 255 - Math.min(255, magnitude * intensityValue);
            const outputIdx = (y * canvas.width + x) * 4;
            
            data[outputIdx] = sketch;
            data[outputIdx + 1] = sketch;
            data[outputIdx + 2] = sketch;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        break;
      }

      case 'aging': {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          // Apply sepia tone
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const sepiaR = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
          const sepiaG = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
          const sepiaB = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
          
          // Add grain and reduce contrast for aging effect
          const grain = (Math.random() - 0.5) * 30 * intensityValue;
          const contrast = 0.8 + (0.2 * (1 - intensityValue));
          
          data[i] = Math.max(0, Math.min(255, (sepiaR * contrast) + grain));
          data[i + 1] = Math.max(0, Math.min(255, (sepiaG * contrast) + grain));
          data[i + 2] = Math.max(0, Math.min(255, (sepiaB * contrast) + grain));
        }
        
        // Add vignette effect
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const vignette = 1 - (distance / maxDistance) * intensityValue * 0.7;
            
            const idx = (y * canvas.width + x) * 4;
            data[idx] *= vignette;
            data[idx + 1] *= vignette;
            data[idx + 2] *= vignette;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        break;
      }
    }

    return canvas.toDataURL('image/png', 1.0);
  };

  const handleApplyEffect = useCallback(async () => {
    if (!connectedImage) {
      toast.error('Please connect an image to apply effects');
      return;
    }

    setProcessing(true);
    setError('');
    setProgress('');

    try {
      const imageUrl = typeof connectedImage === 'string' ? connectedImage : connectedImage[0];
      const imageElement = await loadImage(imageUrl);
      let resultUrl: string;

      // Route to appropriate effect handler
      switch (selectedEffect) {
        case 'removeBackground':
          resultUrl = await removeBackground(imageUrl, setProgress);
          toast.success('Background removed with RMBG V1.4!');
          break;
        case 'edgeDetection':
          setProgress('Applying edge detection...');
          resultUrl = await applyEdgeDetection(imageElement);
          toast.success('Edge detection applied!');
          break;
        case 'superResolution':
          resultUrl = await superResolution2x(imageUrl, setProgress);
          toast.success('Super resolution applied (2x upscaling)');
          break;
        default:
          // Basic and artistic effects (grayscale, invert, pixelation, mosaic, swirl, ripple, sketch, aging)
          resultUrl = await applyCanvasEffect(imageElement, selectedEffect, intensity[0]);
          toast.success(`${effectOptions.find(e => e.value === selectedEffect)?.label} applied successfully!`);
      }

      setResult(resultUrl);
      
      // Update node data to propagate result to connected nodes
      updateNodeData(id, { 
        result: resultUrl,
        selectedEffect,
        intensity
      });
    } catch (err) {
      console.error('Effect processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Effect processing failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
      setProgress('');
    }
  }, [connectedImage, selectedEffect, intensity]);

  const handleDownload = () => {
    if (!result) return;
    
    const link = document.createElement('a');
    link.href = typeof result === 'string' ? result : result[0] || '';
    link.download = `effect-${selectedEffect}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedEffectOption = effectOptions.find(e => e.value === selectedEffect);
  const needsIntensity = !['removeBackground', 'edgeDetection', 'superResolution'].includes(selectedEffect);

  return (
    <Card className="w-80 p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 size={16} className="text-primary" />
          <span className="text-sm font-medium">Effects</span>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Effect Type</Label>
            <Select value={selectedEffect} onValueChange={(value: EffectType) => setSelectedEffect(value)}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {effectOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsIntensity && (
            <div>
              <Label className="text-xs">Intensity</Label>
              <div className="px-2">
                <Slider
                  value={intensity}
                  onValueChange={setIntensity}
                  max={2}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Subtle</span>
                  <span>{intensity[0].toFixed(1)}</span>
                  <span>Strong</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {connectedImage ? (
                <div className="text-blue-500">✓ Image connected</div>
              ) : (
                <div className="text-gray-500">⚠ No image connected</div>
              )}
               {connectedImage && (
                 <img
                   src={typeof connectedImage === 'string' ? connectedImage : connectedImage[0]}
                   alt="Input"
                   className="w-full h-20 object-cover rounded border mt-2 cursor-pointer"
                   onClick={() => {
                     setPreviewImage(typeof connectedImage === 'string' ? connectedImage : connectedImage[0]);
                     setIsPreviewOpen(true);
                   }}
                 />
               )}
            </div>
            
            <Button 
              onClick={handleApplyEffect} 
              disabled={processing || !connectedImage}
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
                  <Wand2 className="mr-2 h-4 w-4" />
                  Apply {selectedEffectOption?.label}
                </>
              )}
            </Button>
          </div>

          {progress && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              {progress}
            </div>
          )}

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Result</Label>
                <Button onClick={handleDownload} size="sm" variant="outline" className="h-6 px-2">
                  <Download size={12} />
                </Button>
              </div>
              <img
                src={typeof result === 'string' ? result : result[0] || ''}
                alt="Effect result"
                className="w-full aspect-square object-cover rounded border cursor-pointer"
                onClick={() => {
                  setPreviewImage(typeof result === 'string' ? result : result[0] || '');
                  setIsPreviewOpen(true);
                }}
              />
            </div>
          )}
        </div>
      </div>

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

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={previewImage}
      />
    </Card>
  );
};