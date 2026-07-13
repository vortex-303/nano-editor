import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, Images, Grid3X3, List, Maximize2 } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { ImagePreviewModal } from '../ImagePreviewModal';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface VariantsOutputNodeProps {
  data: NodeData;
  id: string;
}

export const VariantsOutputNode: React.FC<VariantsOutputNodeProps> = ({ data, id }) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [downloading, setDownloading] = useState(false);
  
  const { getConnectedNodeData, addImageInputNode } = useNodeDataContext();
  const { getEdges } = useReactFlow();

  // Get connected variant images
  const edges = getEdges();
  const connectedVariants = getConnectedNodeData(id, edges, 'images');
  const images = Array.isArray(connectedVariants) ? connectedVariants : [];
  
  console.log('VariantsOutputNode - Connected variants:', connectedVariants);
  console.log('VariantsOutputNode - Final images:', images);

  const handleImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setShowPreviewModal(true);
  };

  const downloadAsDataURL = async (url: string): Promise<string> => {
    if (url.startsWith('data:')) {
      return url;
    }
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) {
      toast.error('No images to download');
      return;
    }

    setDownloading(true);
    toast.info('Preparing zip file...');

    try {
      const zip = new JSZip();
      
      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i];
        const dataUrl = await downloadAsDataURL(imageUrl);
        
        // Extract base64 data and determine file extension
        const [header, base64Data] = dataUrl.split(',');
        const mimeType = header.split(':')[1].split(';')[0];
        const extension = mimeType.split('/')[1] || 'png';
        
        // Convert base64 to binary
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        for (let j = 0; j < binaryData.length; j++) {
          bytes[j] = binaryData.charCodeAt(j);
        }
        
        zip.file(`variant_${i + 1}.${extension}`, bytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Create download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `variants_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(link.href);
      
      toast.success(`Downloaded ${images.length} images as zip file`);
    } catch (error) {
      console.error('Error creating zip:', error);
      toast.error('Failed to create zip file');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="w-80 p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Images size={16} className="text-primary" />
            <span className="text-sm font-medium">Variants Gallery</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {images.length} {images.length === 1 ? 'image' : 'images'}
          </Badge>
        </div>

        {images.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 size={12} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('list')}
              >
                <List size={12} />
              </Button>
            </div>
            
            <Button
              size="sm"
              onClick={handleDownloadAll}
              disabled={downloading}
              className="h-7"
            >
              <Download size={12} className="mr-1" />
              {downloading ? 'Creating...' : 'Zip'}
            </Button>
          </div>
        )}

        {images.length > 0 ? (
          <ScrollArea className="h-64">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-2">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="relative group aspect-square bg-white rounded border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => handleImagePreview(image)}
                  >
                    <img
                      src={image}
                      alt={`Variant ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Maximize2 
                        size={16} 
                        className="text-white opacity-0 group-hover:opacity-100 transition-opacity" 
                      />
                    </div>
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleImagePreview(image)}
                  >
                    <div className="w-12 h-12 bg-white rounded border overflow-hidden flex-shrink-0">
                      <img
                        src={image}
                        alt={`Variant ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Variant {index + 1}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        Click to view full size
                      </div>
                    </div>
                    <Maximize2 size={14} className="text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <div className="h-32 bg-muted/50 rounded border border-dashed flex items-center justify-center">
            <div className="text-center">
              <Images size={24} className="text-muted-foreground mx-auto mb-2" />
              <span className="text-xs text-muted-foreground">
                Connect to variants node
              </span>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {images.length > 0 
            ? `Displaying ${images.length} variant images. Click any image to view full size.`
            : 'Connect this node to a variants node to display generated images.'
          }
        </div>
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="images"
        className="w-3 h-3"
        style={{ 
          background: '#8b5cf6', // Purple for images array
          border: '2px solid #7c3aed'
        }}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        imageUrl={previewImage}
        showAddToBoard={true}
        onAddToBoard={(imageUrl) => {
          addImageInputNode?.(imageUrl);
          toast.success('Image added to board as new input node');
          setShowPreviewModal(false);
        }}
      />
    </Card>
  );
};