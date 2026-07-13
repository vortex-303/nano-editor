import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Download } from 'lucide-react';
import { toast } from 'sonner';

interface ImagePropsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (props: ImageProps, processedImageUrl: string) => void;
  imageUrl: string;
  initialProps: ImageProps;
}

interface ImageProps {
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  scale: number;
  flipX: boolean;
  flipY: boolean;
}

export const ImagePropsModal: React.FC<ImagePropsModalProps> = ({
  isOpen,
  onClose,
  onApply,
  imageUrl,
  initialProps
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [props, setProps] = useState<ImageProps>(initialProps);
  const [isLoading, setIsLoading] = useState(true);

  // Load and initialize the image
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    setIsLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      originalImageRef.current = img;
      setIsLoading(false);
      applyFilters();
    };
    
    img.onerror = () => {
      toast.error('Failed to load image');
      setIsLoading(false);
    };
    
    img.src = imageUrl;
  }, [isOpen, imageUrl]);

  // Apply filters whenever props change
  useEffect(() => {
    if (!isLoading && originalImageRef.current) {
      applyFilters();
    }
  }, [props, isLoading]);

  const applyFilters = () => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate canvas dimensions based on rotation and scale
    const radians = (props.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    
    const scaledWidth = (img.width * props.scale) / 100;
    const scaledHeight = (img.height * props.scale) / 100;
    
    const newWidth = scaledWidth * cos + scaledHeight * sin;
    const newHeight = scaledWidth * sin + scaledHeight * cos;
    
    canvas.width = Math.ceil(newWidth);
    canvas.height = Math.ceil(newHeight);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply CSS filters
    ctx.filter = `
      brightness(${props.brightness}%)
      contrast(${props.contrast}%)
      saturate(${props.saturation}%)
      blur(${props.blur}px)
    `;

    // Save context state
    ctx.save();

    // Move to center
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Apply rotation
    ctx.rotate(radians);

    // Apply flipping
    ctx.scale(
      props.flipX ? -1 : 1,
      props.flipY ? -1 : 1
    );

    // Draw the image
    ctx.drawImage(
      img,
      (-scaledWidth) / 2,
      (-scaledHeight) / 2,
      scaledWidth,
      scaledHeight
    );

    // Restore context
    ctx.restore();
  };

  const handlePropChange = (key: keyof ImageProps, value: any) => {
    setProps(prev => ({ ...prev, [key]: value }));
  };

  const handleRotate = (degrees: number) => {
    setProps(prev => ({ ...prev, rotation: (prev.rotation + degrees) % 360 }));
  };

  const handleReset = () => {
    setProps({
      rotation: 0,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      scale: 100,
      flipX: false,
      flipY: false
    });
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const processedImageUrl = canvas.toDataURL('image/png', 0.9);
      onApply(props, processedImageUrl);
      toast.success('Image properties applied!');
    } catch (error) {
      toast.error('Failed to apply properties');
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const link = document.createElement('a');
      link.download = 'edited-image.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Image Properties</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Canvas Preview */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              {isLoading ? (
                <div className="text-muted-foreground">Loading image...</div>
              ) : (
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download size={14} className="mr-1" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={handleReset}>
                Reset All
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Rotation */}
            <div className="space-y-3">
              <Label className="font-medium">Rotation</Label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRotate(-90)}
                >
                  <RotateCcw size={14} />
                </Button>
                <div className="flex-1 text-center text-sm">
                  {props.rotation}°
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRotate(90)}
                >
                  <RotateCw size={14} />
                </Button>
              </div>
              <Slider
                value={[props.rotation]}
                onValueChange={([value]) => handlePropChange('rotation', value)}
                max={360}
                min={0}
                step={1}
              />
            </div>

            {/* Scale */}
            <div className="space-y-2">
              <Label className="font-medium">Scale ({props.scale}%)</Label>
              <Slider
                value={[props.scale]}
                onValueChange={([value]) => handlePropChange('scale', value)}
                max={200}
                min={10}
                step={5}
              />
            </div>

            {/* Brightness */}
            <div className="space-y-2">
              <Label className="font-medium">Brightness ({props.brightness}%)</Label>
              <Slider
                value={[props.brightness]}
                onValueChange={([value]) => handlePropChange('brightness', value)}
                max={200}
                min={0}
                step={5}
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <Label className="font-medium">Contrast ({props.contrast}%)</Label>
              <Slider
                value={[props.contrast]}
                onValueChange={([value]) => handlePropChange('contrast', value)}
                max={200}
                min={0}
                step={5}
              />
            </div>

            {/* Saturation */}
            <div className="space-y-2">
              <Label className="font-medium">Saturation ({props.saturation}%)</Label>
              <Slider
                value={[props.saturation]}
                onValueChange={([value]) => handlePropChange('saturation', value)}
                max={200}
                min={0}
                step={5}
              />
            </div>

            {/* Blur */}
            <div className="space-y-2">
              <Label className="font-medium">Blur ({props.blur}px)</Label>
              <Slider
                value={[props.blur]}
                onValueChange={([value]) => handlePropChange('blur', value)}
                max={10}
                min={0}
                step={0.5}
              />
            </div>

            {/* Flip Controls */}
            <div className="space-y-3">
              <Label className="font-medium">Flip</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FlipHorizontal size={16} />
                  <Switch
                    checked={props.flipX}
                    onCheckedChange={(checked) => handlePropChange('flipX', checked)}
                  />
                  <span className="text-sm">Horizontal</span>
                </div>
                <div className="flex items-center gap-2">
                  <FlipVertical size={16} />
                  <Switch
                    checked={props.flipY}
                    onCheckedChange={(checked) => handlePropChange('flipY', checked)}
                  />
                  <span className="text-sm">Vertical</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleApply} className="flex-1">
                Apply Changes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};