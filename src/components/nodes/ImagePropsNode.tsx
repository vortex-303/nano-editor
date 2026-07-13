import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, RotateCw } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { ImagePropsModal } from '@/components/ImagePropsModal';
import { useNodeDataContext } from '@/contexts/NodeDataContext';

interface ImagePropsNodeProps {
  data: NodeData;
  id: string;
}

export const ImagePropsNode: React.FC<ImagePropsNodeProps> = ({ data, id }) => {
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState(data.result || '');
  const [imageProps, setImageProps] = useState(data.imageProps || {
    rotation: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    scale: 100,
    flipX: false,
    flipY: false
  });
  const { getConnectedNodeData, updateNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();

  // Get connected image data
  const connectedImage = getConnectedNodeData(id, getEdges(), 'image');
  const hasConnectedImage = !!connectedImage;

  // Update node data when result or props change
  useEffect(() => {
    updateNodeData(id, { result, imageProps });
  }, [result, imageProps, id, updateNodeData]);

  const handleOpenModal = () => {
    if (hasConnectedImage) {
      setShowModal(true);
    }
  };

  const handlePropsUpdate = (newProps: any, processedImageUrl: string) => {
    setImageProps(newProps);
    setResult(processedImageUrl);
    setShowModal(false);
  };

  // Quick rotate function
  const handleQuickRotate = () => {
    if (!hasConnectedImage) return;
    
    const newRotation = (imageProps.rotation + 90) % 360;
    const newProps = { ...imageProps, rotation: newRotation };
    setImageProps(newProps);
    
    // Apply quick rotation and update result
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas dimensions based on rotation
      if (newRotation % 180 === 0) {
        canvas.width = img.width;
        canvas.height = img.height;
      } else {
        canvas.width = img.height;
        canvas.height = img.width;
      }
      
      ctx?.save();
      ctx?.translate(canvas.width / 2, canvas.height / 2);
      ctx?.rotate((newRotation * Math.PI) / 180);
      ctx?.drawImage(img, -img.width / 2, -img.height / 2);
      ctx?.restore();
      
      const rotatedImageUrl = canvas.toDataURL('image/png');
      setResult(rotatedImageUrl);
    };
    
    img.src = connectedImage;
  };

  return (
    <>
      <Card className="w-64 p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-primary" />
            <span className="text-sm font-medium">Image Props</span>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {hasConnectedImage ? (
                <div className="text-blue-500">✓ Image connected</div>
              ) : (
                <div>Connect an image to enable editing</div>
              )}
            </div>

            {hasConnectedImage && connectedImage && (
              <img
                src={result || connectedImage}
                alt="Preview"
                className="w-full aspect-square object-cover rounded border"
              />
            )}

            <div className="flex gap-1">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleOpenModal}
                disabled={!hasConnectedImage}
              >
                <Settings size={14} />
                {hasConnectedImage ? 'Edit Props' : 'No Image'}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleQuickRotate}
                disabled={!hasConnectedImage}
                className="px-2"
              >
                <RotateCw size={14} />
              </Button>
            </div>

            {imageProps.rotation !== 0 && (
              <div className="text-xs text-muted-foreground">
                Rotation: {imageProps.rotation}°
              </div>
            )}

            {result && result !== connectedImage && (
              <div className="text-xs text-green-600">
                ✓ Properties applied
              </div>
            )}
          </div>
        </div>

        <Handle
          type="target"
          position={Position.Left}
          id="image"
          className="w-3 h-3 bg-blue-500"
          style={{ top: '50%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-blue-500"
        />
      </Card>

      <ImagePropsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onApply={handlePropsUpdate}
        imageUrl={connectedImage || ''}
        initialProps={imageProps}
      />
    </>
  );
};