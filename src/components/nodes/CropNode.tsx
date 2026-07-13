import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Crop, Download } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { toast } from 'sonner';
import { ImagePreviewModal } from '../ImagePreviewModal';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { CropModal } from '@/components/CropModal';

interface CropNodeProps {
  data: NodeData;
  id: string;
}

export const CropNode: React.FC<CropNodeProps> = ({ data, id }) => {
  const [result, setResult] = useState(data.result || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const { getConnectedNodeData, updateNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();

  // Get connected input data
  const edges = getEdges();
  const connectedImage = getConnectedNodeData(id, edges, 'image');

  // Update node data when result changes
  useEffect(() => {
    updateNodeData(id, { result });
  }, [result, id, updateNodeData]);

  const handleOpenCropModal = () => {
    if (!connectedImage) {
      toast.error('Please connect an image to crop');
      return;
    }
    setIsModalOpen(true);
  };

  const handleCropComplete = (croppedImage: string) => {
    setResult(croppedImage);
    updateNodeData(id, { result: croppedImage });
    toast.success('Image cropped successfully!');
  };

  const handleDownload = () => {
    if (!result) return;
    
    const link = document.createElement('a');
    link.href = typeof result === 'string' ? result : result[0] || '';
    link.download = `cropped-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const imageUrl = connectedImage ? 
    (typeof connectedImage === 'string' ? connectedImage : connectedImage[0]) : '';

  return (
    <>
      <Card className="w-80 p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Crop size={16} className="text-primary" />
            <span className="text-sm font-medium">Crop</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {connectedImage ? (
                  <div className="text-blue-500">✓ Image connected</div>
                ) : (
                  <div className="text-gray-500">⚠ No image connected</div>
                )}
              </div>
              
              {connectedImage && (
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt="Input"
                    className="w-full h-32 object-cover rounded border cursor-pointer"
                    onClick={() => {
                      setPreviewImage(imageUrl);
                      setIsPreviewOpen(true);
                    }}
                  />
                </div>
              )}
              
              <Button 
                onClick={handleOpenCropModal} 
                disabled={!connectedImage}
                className="w-full"
                size="sm"
              >
                <Crop className="mr-2 h-4 w-4" />
                Open Crop Editor
              </Button>
            </div>

            {result && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Cropped Result</Label>
                  <Button onClick={handleDownload} size="sm" variant="outline" className="h-6 px-2">
                    <Download size={12} />
                  </Button>
                </div>
                <img
                  src={typeof result === 'string' ? result : result[0] || ''}
                  alt="Crop result"
                  className="w-full max-h-32 object-contain rounded border cursor-pointer"
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
      </Card>

      {/* Crop Modal */}
      <CropModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={imageUrl}
        onCrop={handleCropComplete}
      />

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={previewImage}
      />
    </>
  );
};