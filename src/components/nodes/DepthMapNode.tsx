import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mountain, Download } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { estimateDepth } from '@/lib/localAi';
import { toast } from 'sonner';
import { ImagePreviewModal } from '../ImagePreviewModal';

interface DepthMapNodeProps {
  data: NodeData;
  id: string;
}

export const DepthMapNode: React.FC<DepthMapNodeProps> = ({ data, id }) => {
  const [result, setResult] = useState<string>((data.result as string) || '');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { getConnectedNodeData, updateNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();

  const edges = getEdges();
  const connectedImage = getConnectedNodeData(id, edges, 'image');
  const imageUrl = Array.isArray(connectedImage) ? connectedImage[0] : connectedImage;

  useEffect(() => {
    updateNodeData(id, { result, processing });
  }, [result, processing, id, updateNodeData]);

  const handleGenerate = async () => {
    if (!imageUrl) {
      toast.error('Connect an image first');
      return;
    }
    setProcessing(true);
    try {
      const depthUrl = await estimateDepth(imageUrl, setProgress);
      setResult(depthUrl);
      toast.success('Depth map generated');
    } catch (error) {
      console.error('Depth estimation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate depth map');
    } finally {
      setProcessing(false);
      setProgress('');
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `depth-map-${Date.now()}.png`;
    link.click();
  };

  return (
    <Card className="w-72 p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mountain size={16} className="text-primary" />
            <span className="text-sm font-medium">Depth Map</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">Local · Free</Badge>
        </div>

        {imageUrl ? (
          <img src={imageUrl} alt="Input" className="w-full h-24 object-cover rounded border" />
        ) : (
          <p className="text-xs text-muted-foreground">Connect an image to estimate its depth map (Depth Anything V2) — runs entirely in your browser.</p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={handleGenerate}
          disabled={!imageUrl || processing}
        >
          {processing ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {progress || 'Estimating...'}
            </>
          ) : (
            'Generate Depth Map'
          )}
        </Button>

        {result && (
          <div className="space-y-2">
            <Label className="text-xs">Depth Map</Label>
            <img
              src={result}
              alt="Depth map"
              className="w-full h-24 object-cover rounded border cursor-pointer"
              onClick={() => setIsPreviewOpen(true)}
            />
            <Button variant="ghost" size="sm" className="w-full h-6 text-xs" onClick={handleDownload}>
              <Download className="w-3 h-3 mr-1" /> Download
            </Button>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="image"
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="result"
        className="w-3 h-3 bg-blue-500"
      />

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={result}
      />
    </Card>
  );
};
