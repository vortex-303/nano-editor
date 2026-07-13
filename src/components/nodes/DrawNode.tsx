import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Image as ImageIcon } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { DrawingModal } from '../DrawingModal';
import { ImagePreviewModal } from '../ImagePreviewModal';

interface DrawNodeProps {
  data: NodeData;
  id: string;
}

export const DrawNode: React.FC<DrawNodeProps> = ({ data, id }) => {
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [drawnImage, setDrawnImage] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { updateNodeData, getNodeData } = useNodeDataContext();

  // Sync with node data context - this ensures imported data is reflected
  useEffect(() => {
    const contextData = getNodeData(id);
    if (contextData.image && contextData.image !== drawnImage) {
      setDrawnImage(contextData.image);
    }
  }, [getNodeData, id]);

  useEffect(() => {
    updateNodeData(id, { 
      image: drawnImage,
      result: drawnImage
    });
  }, [id, drawnImage, updateNodeData]);

  const handleDrawingSubmit = (imageDataUrl: string) => {
    setDrawnImage(imageDataUrl);
  };

  return (
    <Card className="w-64 p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Pencil size={16} className="text-primary" />
          <span className="text-sm font-medium">Draw Input</span>
        </div>

        {drawnImage ? (
          <div className="space-y-2">
            <div className="w-full h-32 bg-white rounded border overflow-hidden">
              <img 
                src={drawnImage} 
                alt="Drawn image"
                className="w-full h-full object-contain bg-white cursor-pointer"
                onClick={() => setIsPreviewOpen(true)}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setShowDrawingModal(true)}
            >
              <Pencil size={14} className="mr-2" />
              Edit Drawing
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-full h-32 bg-white rounded border border-dashed flex items-center justify-center">
              <div className="text-center">
                <ImageIcon size={24} className="text-muted-foreground mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">No drawing yet</span>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => setShowDrawingModal(true)}
            >
              <Pencil size={14} className="mr-2" />
              Start Drawing
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Create a drawing that can be used as image input for other nodes.
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="image"
        className="w-3 h-3"
        style={{ 
          background: '#3b82f6', // Blue for image output
          border: '2px solid #1e40af'
        }}
      />

      {/* Drawing Modal */}
      <DrawingModal
        isOpen={showDrawingModal}
        onClose={() => setShowDrawingModal(false)}
        onSubmit={handleDrawingSubmit}
      />

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={drawnImage}
      />
    </Card>
  );
};