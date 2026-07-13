import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Scissors, Download, RotateCcw } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { segmentWithPoints, type SamPoint } from '@/lib/localAi';
import { toast } from 'sonner';
import { ImagePreviewModal } from '../ImagePreviewModal';

interface SegmentNodeProps {
  data: NodeData;
  id: string;
}

export const SegmentNode: React.FC<SegmentNodeProps> = ({ data, id }) => {
  const [points, setPoints] = useState<SamPoint[]>([]);
  const [cutout, setCutout] = useState<string>((data.result as string) || '');
  const [mask, setMask] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const { getConnectedNodeData, updateNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();

  const edges = getEdges();
  const connectedImage = getConnectedNodeData(id, edges, 'image');
  const imageUrl = Array.isArray(connectedImage) ? connectedImage[0] : connectedImage;

  useEffect(() => {
    updateNodeData(id, { result: cutout, mask, processing });
  }, [cutout, mask, processing, id, updateNodeData]);

  // Reset points when the input image changes
  useEffect(() => {
    setPoints([]);
    setCutout('');
    setMask('');
  }, [imageUrl]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || processing) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // Shift-click adds a negative (exclude) point
    setPoints(prev => [...prev, { x, y, positive: !e.shiftKey }]);
  };

  const handleSegment = async () => {
    if (!imageUrl || points.length === 0) return;
    setProcessing(true);
    try {
      const result = await segmentWithPoints(imageUrl, points, setProgress);
      setCutout(result.cutout);
      setMask(result.mask);
      toast.success('Object segmented');
    } catch (error) {
      console.error('Segmentation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Segmentation failed');
    } finally {
      setProcessing(false);
      setProgress('');
    }
  };

  const handleReset = () => {
    setPoints([]);
    setCutout('');
    setMask('');
  };

  const handleDownload = () => {
    if (!cutout) return;
    const link = document.createElement('a');
    link.href = cutout;
    link.download = `cutout-${Date.now()}.png`;
    link.click();
  };

  return (
    <Card className="w-80 p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors size={16} className="text-primary" />
            <span className="text-sm font-medium">Click to Cut Out</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">Local · Free</Badge>
        </div>

        {imageUrl ? (
          <div className="space-y-1">
            <div className="relative">
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Input"
                className="w-full rounded border cursor-crosshair nodrag"
                onClick={handleImageClick}
                draggable={false}
              />
              {points.map((p, i) => (
                <div
                  key={i}
                  className={`absolute w-3 h-3 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none ${p.positive ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Click the object to keep it · Shift-click to exclude an area (SlimSAM, runs in your browser)
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Connect an image, then click on the object you want to cut out.</p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleSegment}
            disabled={!imageUrl || points.length === 0 || processing}
          >
            {processing ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {progress || 'Segmenting...'}
              </>
            ) : (
              `Cut Out (${points.length} point${points.length === 1 ? '' : 's'})`
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleReset}
            disabled={processing || (points.length === 0 && !cutout)}
            title="Reset points and result"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>

        {cutout && (
          <div className="space-y-2">
            <Label className="text-xs">Cutout (transparent background)</Label>
            <div
              className="rounded border cursor-pointer"
              style={{ background: 'repeating-conic-gradient(#8882 0% 25%, transparent 0% 50%) 50% / 16px 16px' }}
            >
              <img
                src={cutout}
                alt="Cutout"
                className="w-full h-28 object-contain"
                onClick={() => setIsPreviewOpen(true)}
              />
            </div>
            <Button variant="ghost" size="sm" className="w-full h-6 text-xs" onClick={handleDownload}>
              <Download className="w-3 h-3 mr-1" /> Download PNG
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
        imageUrl={cutout}
      />
    </Card>
  );
};
