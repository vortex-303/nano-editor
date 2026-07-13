import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface ImageMarkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (imageDataUrl: string) => void;
  imageUrl: string;
}

export const ImageMarkingModal = ({ isOpen, onClose, onSubmit, imageUrl }: ImageMarkingModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(15);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Wait for canvas to be ready then load image
  useEffect(() => {
    if (!isOpen) {
      setImageLoaded(false);
      return;
    }
    
    // Small delay to ensure canvas is rendered
    const timer = setTimeout(() => {
      if (!canvasRef.current || !imageUrl) {
        console.log('Canvas ref or imageUrl missing after delay:', { 
          canvas: !!canvasRef.current, 
          imageUrl: !!imageUrl 
        });
        setImageLoaded(false);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get canvas context');
        return;
      }

      console.log('Canvas ready, starting image load');
      setImageLoaded(false);

      // Canvas size will be set after image loads to match image dimensions

      // Create and load the image
      const img = new Image();
      imageRef.current = img;
      
      img.onload = () => {
        console.log('Image onload triggered, dimensions:', img.width, 'x', img.height);
        
        try {
          // Calculate canvas size to match image while fitting in viewport
          const maxWidth = 800;
          const maxHeight = 600;
          let canvasWidth = img.width;
          let canvasHeight = img.height;
          
          // Scale down if image is too large
          if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
            const scale = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight);
            canvasWidth = canvasWidth * scale;
            canvasHeight = canvasHeight * scale;
          }
          
          // Set canvas to exact image dimensions (scaled)
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          
          // Fill with white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          
          // Draw the image to fill entire canvas
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
          console.log('Image drawn to canvas successfully');
          
          // Set up drawing context for bold pink marking
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = brushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalCompositeOperation = 'source-over';
          
          setImageLoaded(true);
          console.log('Image loading completed successfully');
        } catch (error) {
          console.error('Error drawing image to canvas:', error);
          setImageLoaded(false);
        }
      };
      
      img.onerror = (error) => {
        console.error('Image failed to load:', error);
        setImageLoaded(false);
      };
      
      // Start loading - no crossOrigin for data URLs
      if (imageUrl.startsWith('data:')) {
        console.log('Loading data URL image');
      } else {
        console.log('Loading external URL image');
        img.crossOrigin = 'anonymous';
      }
      
      img.src = imageUrl;
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, [isOpen, imageUrl, brushSize]);

  // Update brush settings when brush size changes
  useEffect(() => {
    if (!canvasRef.current || !imageLoaded) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [brushSize, imageLoaded]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the scale factor between displayed canvas and actual canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    setLastPoint(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPoint || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPos = getMousePos(e);
    
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();
    
    setLastPoint(currentPos);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  const handleClear = () => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    if (!ctx) return;

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Redraw the image to fill entire canvas
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Reset drawing context
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handleSubmit = () => {
    if (!canvasRef.current) return;
    
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSubmit(dataUrl);
    handleClear();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Mark Image</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Brush Size:</span>
            <div className="flex-1 max-w-xs">
              <Slider
                value={[brushSize]}
                onValueChange={(value) => setBrushSize(value[0])}
                max={40}
                min={5}
                step={1}
                className="w-full"
              />
            </div>
            <span className="text-sm text-muted-foreground">{brushSize}px</span>
          </div>
          
          <div className="border border-border rounded-lg overflow-hidden bg-muted">
            {!imageLoaded && (
              <div className="w-full h-96 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <div>Loading image...</div>
                </div>
              </div>
            )}
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`cursor-crosshair max-w-full block mx-auto ${!imageLoaded ? 'hidden' : ''}`}
              style={{ maxHeight: '60vh' }}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClear}>
              Clear Marks
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Add Marked Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};