import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit3 } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { ImageMarkingModal } from '@/components/ImageMarkingModal';
import { ImagePreviewModal } from '../ImagePreviewModal';
import { useNodeDataContext } from '@/contexts/NodeDataContext';

interface MarkNodeProps {
  data: NodeData;
  id: string;
}

export const EditNode: React.FC<MarkNodeProps> = ({ data, id }) => {
  const [showModal, setShowModal] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [result, setResult] = useState(data.result || '');
  const { getConnectedNodeData, updateNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();

  // Get connected image data
  const connectedImage = getConnectedNodeData(id, getEdges(), 'image');
  const hasConnectedImage = !!connectedImage;

  // Update node data when result changes
  useEffect(() => {
    updateNodeData(id, { result });
  }, [result, id, updateNodeData]);

  const handleMark = () => {
    if (hasConnectedImage) {
      setShowModal(true);
    }
  };

  const handleMarkedImageSubmit = (markedImageDataUrl: string) => {
    setResult(markedImageDataUrl);
    setShowModal(false);
  };

  return (
    <>
      <Card className="w-64 p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Edit3 size={16} className="text-primary" />
            <span className="text-sm font-medium">Mark</span>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {hasConnectedImage ? (
                <div className="text-blue-500">✓ Image connected</div>
              ) : (
                <div>Connect an image to enable marking</div>
              )}
            </div>

            {hasConnectedImage && connectedImage && (
              <img
                src={connectedImage}
                alt="Connected input"
                className="w-full aspect-square object-cover rounded border cursor-pointer"
                onClick={() => {
                  setPreviewImage(connectedImage);
                  setIsPreviewOpen(true);
                }}
              />
            )}

            <Button
              size="sm"
              className="w-full"
              onClick={handleMark}
              disabled={!hasConnectedImage}
            >
              <Edit3 size={14} />
              {hasConnectedImage ? 'Mark Image' : 'No Image Connected'}
            </Button>

            {result && typeof result === 'string' && (
              <div className="space-y-2">
                <div className="text-xs font-medium">Marked Image</div>
                <img
                  src={result}
                  alt="Marked result"
                  className="w-full aspect-square object-cover rounded border cursor-pointer"
                  onClick={() => {
                    setPreviewImage(result);
                    setIsPreviewOpen(true);
                  }}
                />
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

      <ImageMarkingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleMarkedImageSubmit}
        imageUrl={connectedImage || ''}
      />

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={previewImage}
      />
    </>
  );
};