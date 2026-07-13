import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Image as ImageIcon, Maximize2, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { ImagePreviewModal } from '../ImagePreviewModal';

interface ImageOutputNodeProps {
  data: NodeData;
  id: string;
}

type NodeSize = '2x' | '4x' | '8x';

const nodeSizeConfig = {
  '2x': { width: 'w-64', height: 'h-40' },
  '4x': { width: 'w-80', height: 'h-48' },
  '8x': { width: 'w-96', height: 'h-56' },
};

export const ImageOutputNode: React.FC<ImageOutputNodeProps> = ({ data, id }) => {
  const [nodeSize, setNodeSize] = useState<NodeSize>('4x');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { getConnectedNodeData, updateNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();

  // Get connected image data from any connected node
  const connectedSingleImage = getConnectedNodeData(id, getEdges(), 'image') || getConnectedNodeData(id, getEdges(), 'result');
  const connectedImagesArray = getConnectedNodeData(id, getEdges(), 'images'); // From variants node
  
  // Determine if we have multiple images (carousel) or single image
  const isMultipleImages = Array.isArray(connectedImagesArray) && connectedImagesArray.length > 0;
  const images = isMultipleImages ? connectedImagesArray : (connectedSingleImage ? [connectedSingleImage] : []);
  const hasImage = images.length > 0;
  const displayImage = images[currentImageIndex];

  // Update node data with current image for other nodes to use
  useEffect(() => {
    updateNodeData(id, {
      image: displayImage,
      images: isMultipleImages ? images : undefined,
      result: displayImage
    });
  }, [displayImage, images, isMultipleImages, id, updateNodeData]);

  const handleFullscreenPreview = () => {
    if (displayImage) {
      setShowPreviewModal(true);
    }
  };

  const handleDownload = () => {
    if (displayImage) {
      try {
        // For data URLs, convert to blob for better download handling
        if (displayImage.startsWith('data:')) {
          fetch(displayImage)
            .then(res => res.blob())
            .then(blob => {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `image-output-${Date.now()}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            })
            .catch(error => {
              console.error('Download failed:', error);
              // Fallback to direct download
              const link = document.createElement('a');
              link.href = displayImage;
              link.download = `image-output-${Date.now()}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            });
        } else {
          // Direct download for regular URLs
          const link = document.createElement('a');
          link.href = displayImage;
          link.download = `image-output-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        console.error('Download error:', error);
      }
    }
  };

  const sizeConfig = nodeSizeConfig[nodeSize];

  return (
    <>
      <Card className={`${sizeConfig.width} p-3 bg-card border border-border`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-primary" />
              <span className="text-sm font-medium">Image Output</span>
            </div>
            <ToggleGroup 
              type="single" 
              value={nodeSize} 
              onValueChange={(value) => value && setNodeSize(value as NodeSize)} 
              size="sm"
            >
              <ToggleGroupItem value="2x" className="text-xs px-2">2x</ToggleGroupItem>
              <ToggleGroupItem value="4x" className="text-xs px-2">4x</ToggleGroupItem>
              <ToggleGroupItem value="8x" className="text-xs px-2">8x</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {hasImage ? (
            <div className="w-full aspect-square bg-muted rounded-lg border border-border/50 overflow-hidden group cursor-pointer hover:border-border transition-colors relative" onClick={handleFullscreenPreview}>
              <img
                src={displayImage}
                alt="Output image"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  console.error('Output image failed to load:', e);
                  console.error('Display image URL length:', displayImage?.length);
                  console.error('Display image URL start:', displayImage?.substring(0, 100));
                }}
                onLoad={() => {
                  console.log('Output image loaded successfully');
                }}
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" size="sm" className="h-6 w-6 p-0">
                  <Maximize2 size={12} />
                </Button>
              </div>
              
              {/* Carousel controls for multiple images */}
              {isMultipleImages && images.length > 1 && (
                <>
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 rounded-full px-2 py-1">
                    <span className="text-white text-xs">{currentImageIndex + 1}/{images.length}</span>
                  </div>
                  
                  <div className="absolute inset-y-0 left-0 flex items-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex((prev) => prev > 0 ? prev - 1 : images.length - 1);
                      }}
                      disabled={images.length <= 1}
                    >
                      <ChevronLeft size={14} />
                    </Button>
                  </div>
                  
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex((prev) => prev < images.length - 1 ? prev + 1 : 0);
                      }}
                      disabled={images.length <= 1}
                    >
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full aspect-square bg-muted rounded-lg border border-dashed border-border/50 flex items-center justify-center">
              <div className="text-center">
                <ImageIcon size={24} className="text-muted-foreground mx-auto mb-2" />
                <span className="text-xs text-muted-foreground">No image connected</span>
              </div>
            </div>
          )}

          {hasImage && (
            <Button 
              size="sm" 
              onClick={handleDownload} 
              className="w-full"
            >
              <Download size={14} className="mr-2" />
              Download
            </Button>
          )}
        </div>

        <Handle
          type="target"
          position={Position.Left}
          id="image"
          className="w-3 h-3 bg-primary"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="w-3 h-3 bg-primary"
        />
      </Card>

      <ImagePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        imageUrl={displayImage || ''}
      />
    </>
  );
};