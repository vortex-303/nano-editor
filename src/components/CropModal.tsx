import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Crop, RotateCw, Check, X } from 'lucide-react';
import { toast } from 'sonner';

type CropMode = 'free' | 'square' | '16:9' | '4:3' | '3:2' | '9:16' | '3:4' | '2:3';

const cropModes = [
  { value: 'free', label: 'Free Crop', ratio: null },
  { value: 'square', label: 'Square (1:1)', ratio: 1 },
  { value: '16:9', label: 'Landscape (16:9)', ratio: 16/9 },
  { value: '4:3', label: 'Standard (4:3)', ratio: 4/3 },
  { value: '3:2', label: 'Photo (3:2)', ratio: 3/2 },
  { value: '9:16', label: 'Portrait (9:16)', ratio: 9/16 },
  { value: '3:4', label: 'Portrait (3:4)', ratio: 3/4 },
  { value: '2:3', label: 'Portrait (2:3)', ratio: 2/3 },
];

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | null;

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCrop: (result: string) => void;
}

export const CropModal: React.FC<CropModalProps> = ({ isOpen, onClose, imageUrl, onCrop }) => {
  const [cropMode, setCropMode] = useState<CropMode>('free');
  const [cropArea, setCropArea] = useState<CropArea>({ x: 50, y: 50, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [originalCrop, setOriginalCrop] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const loadImage = useCallback(() => {
    if (!imageUrl) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageElement(img);
      setImageLoaded(true);
      
      // Calculate scale to maximize image in container
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const maxWidth = containerRect.width - 20; // minimal padding
        const maxHeight = containerRect.height - 20; // minimal padding
        
        const scaleX = maxWidth / img.naturalWidth;
        const scaleY = maxHeight / img.naturalHeight;
        const scale = Math.min(scaleX, scaleY); // Allow scaling up if needed
        
        setImageScale(scale);
        setContainerSize({
          width: img.naturalWidth * scale,
          height: img.naturalHeight * scale
        });
        
        // Reset crop area to center
        const initialSize = Math.min(img.naturalWidth * scale * 0.5, img.naturalHeight * scale * 0.5);
        setCropArea({
          x: (img.naturalWidth * scale - initialSize) / 2,
          y: (img.naturalHeight * scale - initialSize) / 2,
          width: initialSize,
          height: initialSize
        });
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (isOpen) {
      loadImage();
    }
  }, [isOpen, loadImage]);

  // Handle keyboard events for shift key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen]);

  // Apply aspect ratio immediately when cropMode changes
  useEffect(() => {
    if (!imageLoaded || cropMode === 'free') return;
    
    const selectedMode = cropModes.find(m => m.value === cropMode);
    if (!selectedMode?.ratio) return;
    
    setCropArea(prev => {
      const aspectRatio = selectedMode.ratio;
      let newWidth = prev.width;
      let newHeight = prev.height;
      
      // Adjust dimensions to match aspect ratio
      if (prev.width / prev.height > aspectRatio) {
        // Width is too large, adjust width
        newWidth = prev.height * aspectRatio;
      } else {
        // Height is too large, adjust height
        newHeight = prev.width / aspectRatio;
      }
      
      // Ensure minimum size and bounds
      newWidth = Math.max(20, newWidth);
      newHeight = Math.max(20, newHeight);
      
      // Center the crop area if it goes out of bounds
      let newX = prev.x;
      let newY = prev.y;
      
      if (newX + newWidth > containerSize.width) {
        newX = containerSize.width - newWidth;
      }
      if (newY + newHeight > containerSize.height) {
        newY = containerSize.height - newHeight;
      }
      
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      
      return {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      };
    });
  }, [cropMode, imageLoaded, containerSize.width, containerSize.height]);

  const applyCrop = async (): Promise<string> => {
    if (!imageElement) throw new Error('No image loaded');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Convert display coordinates to actual image coordinates
    const actualCrop = {
      x: cropArea.x / imageScale,
      y: cropArea.y / imageScale,
      width: cropArea.width / imageScale,
      height: cropArea.height / imageScale
    };

    // Set canvas size to crop dimensions
    canvas.width = actualCrop.width;
    canvas.height = actualCrop.height;

    // Draw cropped portion
    ctx.drawImage(
      imageElement,
      actualCrop.x, actualCrop.y, actualCrop.width, actualCrop.height,
      0, 0, actualCrop.width, actualCrop.height
    );

    return canvas.toDataURL('image/png', 1.0);
  };

  const handleCrop = async () => {
    try {
      const result = await applyCrop();
      onCrop(result);
      onClose();
      toast.success('Image cropped successfully!');
    } catch (error) {
      console.error('Crop error:', error);
      toast.error('Failed to crop image');
    }
  };

  const handleResizeHandleMouseDown = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    setIsResizing(true);
    setActiveHandle(handle);
    setOriginalCrop(cropArea);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageLoaded) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on crop area (for dragging)
    if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    } else {
      // Start new crop area
      setIsDragging(true);
      setDragStart({ x, y });
      setCropArea({ x, y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageLoaded) return;

    if (isResizing && activeHandle) {
      // Handle resizing
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      let newCrop = { ...originalCrop };
      
      // Apply resize based on which handle is active
      switch (activeHandle) {
        case 'nw':
          newCrop.x = originalCrop.x + deltaX;
          newCrop.y = originalCrop.y + deltaY;
          newCrop.width = originalCrop.width - deltaX;
          newCrop.height = originalCrop.height - deltaY;
          break;
        case 'ne':
          newCrop.y = originalCrop.y + deltaY;
          newCrop.width = originalCrop.width + deltaX;
          newCrop.height = originalCrop.height - deltaY;
          break;
        case 'sw':
          newCrop.x = originalCrop.x + deltaX;
          newCrop.width = originalCrop.width - deltaX;
          newCrop.height = originalCrop.height + deltaY;
          break;
        case 'se':
          newCrop.width = originalCrop.width + deltaX;
          newCrop.height = originalCrop.height + deltaY;
          break;
      }

      // Apply aspect ratio constraint if needed
      const selectedMode = cropModes.find(m => m.value === cropMode);
      const shouldMaintainAspect = cropMode !== 'free';
      
      if (shouldMaintainAspect) {
        // Use selected mode ratio
        const aspectRatio = selectedMode?.ratio || 1;
          
        if (activeHandle === 'nw' || activeHandle === 'se') {
          newCrop.height = newCrop.width / aspectRatio;
          if (activeHandle === 'nw') {
            newCrop.y = originalCrop.y + originalCrop.height - newCrop.height;
          }
        } else {
          newCrop.width = newCrop.height * aspectRatio;
          if (activeHandle === 'ne') {
            newCrop.y = originalCrop.y + originalCrop.height - newCrop.height;
          }
        }
      }

      // Ensure minimum size and bounds
      newCrop.width = Math.max(20, newCrop.width);
      newCrop.height = Math.max(20, newCrop.height);
      newCrop.x = Math.max(0, Math.min(newCrop.x, containerSize.width - newCrop.width));
      newCrop.y = Math.max(0, Math.min(newCrop.y, containerSize.height - newCrop.height));

      setCropArea(newCrop);
    } else if (isDragging) {
      // Handle dragging or creating new crop area
      const rect = e.currentTarget.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      if (cropArea.width > 0 && cropArea.height > 0) {
        // Dragging existing crop area
        const newX = Math.max(0, Math.min(currentX - dragStart.x, containerSize.width - cropArea.width));
        const newY = Math.max(0, Math.min(currentY - dragStart.y, containerSize.height - cropArea.height));
        
        setCropArea(prev => ({ ...prev, x: newX, y: newY }));
      } else {
        // Creating new crop area
        let width = currentX - dragStart.x;
        let height = currentY - dragStart.y;
        
        // Apply aspect ratio if not free crop
        const selectedMode = cropModes.find(m => m.value === cropMode);
        const shouldMaintainAspect = cropMode !== 'free';
        
        if (shouldMaintainAspect) {
          // Use selected mode ratio
          const aspectRatio = selectedMode?.ratio || 1;
          if (Math.abs(width) > Math.abs(height)) {
            height = width / aspectRatio;
          } else {
            width = height * aspectRatio;
          }
        }
        
        // Ensure positive dimensions and within bounds
        const x = width < 0 ? dragStart.x + width : dragStart.x;
        const y = height < 0 ? dragStart.y + height : dragStart.y;
        
        setCropArea({
          x: Math.max(0, Math.min(x, containerSize.width)),
          y: Math.max(0, Math.min(y, containerSize.height)),
          width: Math.abs(width),
          height: Math.abs(height)
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setActiveHandle(null);
  };

  const handleCropAreaChange = (field: keyof CropArea, value: number) => {
    setCropArea(prev => ({ ...prev, [field]: Math.max(0, value) }));
  };

  const resetCrop = () => {
    if (imageLoaded && containerSize.width > 0) {
      const initialSize = Math.min(containerSize.width * 0.5, containerSize.height * 0.5);
      setCropArea({
        x: (containerSize.width - initialSize) / 2,
        y: (containerSize.height - initialSize) / 2,
        width: initialSize,
        height: initialSize
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop size={20} />
            Crop Image
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Aspect Ratio:</Label>
              <Select value={cropMode} onValueChange={(value: CropMode) => setCropMode(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cropModes.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={resetCrop} variant="outline" size="sm">
              <RotateCw size={14} className="mr-1" />
              Reset
            </Button>
          </div>

          {/* Image and crop area */}
          <div 
            ref={containerRef}
            className="flex-1 relative overflow-hidden bg-gray-800 rounded-lg flex items-center justify-center min-h-[500px]"
          >
            {imageLoaded && containerSize.width > 0 ? (
              <div
                className="relative cursor-crosshair select-none"
                style={{ width: containerSize.width, height: containerSize.height }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Crop preview"
                  className="w-full h-full object-contain pointer-events-none"
                  draggable={false}
                />
                
                {/* Crop overlay */}
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move"
                  style={{
                    left: `${cropArea.x}px`,
                    top: `${cropArea.y}px`,
                    width: `${cropArea.width}px`,
                    height: `${cropArea.height}px`,
                  }}
                >
                  {/* Corner handles for resizing */}
                  <div 
                    className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white cursor-nw-resize hover:bg-blue-600" 
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, 'nw')}
                  />
                  <div 
                    className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-ne-resize hover:bg-blue-600" 
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, 'ne')}
                  />
                  <div 
                    className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white cursor-sw-resize hover:bg-blue-600" 
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, 'sw')}
                  />
                  <div 
                    className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white cursor-se-resize hover:bg-blue-600" 
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, 'se')}
                  />
                </div>
                
                {/* Dark overlay outside crop area */}
                <div 
                  className="absolute inset-0 bg-black/50 pointer-events-none"
                  style={{
                    clipPath: `polygon(0% 0%, 0% 100%, ${cropArea.x}px 100%, ${cropArea.x}px ${cropArea.y}px, ${cropArea.x + cropArea.width}px ${cropArea.y}px, ${cropArea.x + cropArea.width}px ${cropArea.y + cropArea.height}px, ${cropArea.x}px ${cropArea.y + cropArea.height}px, ${cropArea.x}px 100%, 100% 100%, 100% 0%)`
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading image...</div>
              </div>
            )}
          </div>

          {/* Precise controls */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">X Position</Label>
              <Input
                type="number"
                value={Math.round(cropArea.x)}
                onChange={(e) => handleCropAreaChange('x', Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Y Position</Label>
              <Input
                type="number"
                value={Math.round(cropArea.y)}
                onChange={(e) => handleCropAreaChange('y', Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Width</Label>
              <Input
                type="number"
                value={Math.round(cropArea.width)}
                onChange={(e) => handleCropAreaChange('width', Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Height</Label>
              <Input
                type="number"
                value={Math.round(cropArea.height)}
                onChange={(e) => handleCropAreaChange('height', Number(e.target.value))}
                className="h-8"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={onClose} variant="outline">
              <X size={16} className="mr-1" />
              Cancel
            </Button>
            <Button 
              onClick={handleCrop} 
              disabled={!imageLoaded || cropArea.width === 0 || cropArea.height === 0}
            >
              <Check size={16} className="mr-1" />
              Apply Crop
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};