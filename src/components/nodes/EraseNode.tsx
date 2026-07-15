import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eraser, Download, RotateCcw, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { segmentWithPoints, detectObjects, type SamPoint } from '@/lib/localAi';
import { toast } from 'sonner';
import { ImagePreviewModal } from '../ImagePreviewModal';

interface EraseNodeProps {
  data: NodeData;
  id: string;
}

export const EraseNode: React.FC<EraseNodeProps> = ({ data, id }) => {
  const [points, setPoints] = useState<SamPoint[]>([]);
  const [findQuery, setFindQuery] = useState('');
  const [engine, setEngine] = useState<'fast' | 'quality'>('fast');
  const [result, setResult] = useState<string>((data.result as string) || '');
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
    updateNodeData(id, { result, processing });
  }, [result, processing, id, updateNodeData]);

  // Reset when input image changes
  useEffect(() => {
    setPoints([]);
    setResult('');
  }, [imageUrl]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || processing) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPoints(prev => [...prev, { x, y, positive: !e.shiftKey }]);
  };

  const runErase = async (pointsToUse: SamPoint[]) => {
    if (!imageUrl || pointsToUse.length === 0) return;
    setProcessing(true);
    try {
      const { mask } = await segmentWithPoints(imageUrl, pointsToUse, setProgress);
      // onnxruntime-web is heavy — load it only when erasing is actually used
      const { eraseWithLama, eraseWithMiGan } = await import('@/lib/localInpaint');
      const erased = engine === 'fast'
        ? await eraseWithMiGan(imageUrl, mask, setProgress)
        : await eraseWithLama(imageUrl, mask, setProgress);
      setResult(erased);
      toast.success('Object erased');
    } catch (error) {
      console.error('Erase failed:', error);
      toast.error(error instanceof Error ? error.message : 'Erase failed');
    } finally {
      setProcessing(false);
      setProgress('');
    }
  };

  const handleFindByText = async () => {
    if (!imageUrl || !findQuery.trim()) return;
    setProcessing(true);
    try {
      const detections = await detectObjects(imageUrl, findQuery, setProgress);
      if (detections.length === 0) {
        toast.error(`Could not find "${findQuery}" in the image`);
        setProcessing(false);
        setProgress('');
        return;
      }
      const best = detections[0];
      const seedPoints: SamPoint[] = [{
        x: best.box.x + best.box.width / 2,
        y: best.box.y + best.box.height / 2,
        positive: true,
      }];
      setPoints(seedPoints);
      toast.info(`Found "${best.label}" (${Math.round(best.score * 100)}%) — erasing...`);
      await runErase(seedPoints);
    } catch (error) {
      console.error('Find by text failed:', error);
      toast.error(error instanceof Error ? error.message : 'Detection failed');
      setProcessing(false);
      setProgress('');
    }
  };

  const handleReset = () => {
    setPoints([]);
    setResult('');
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `erased-${Date.now()}.png`;
    link.click();
  };

  return (
    <Card className="w-80 p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eraser size={16} className="text-primary" />
            <span className="text-sm font-medium">Object Eraser</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">Local · Free</Badge>
        </div>

        {imageUrl ? (
          <div className="space-y-1">
            <div className="relative">
              <img
                ref={imageRef}
                src={result || imageUrl}
                alt="Input"
                className="w-full rounded border cursor-crosshair nodrag"
                onClick={handleImageClick}
                draggable={false}
              />
              {!result && points.map((p, i) => (
                <div
                  key={i}
                  className={`absolute w-3 h-3 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none ${p.positive ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {result
                ? 'Erased — click Reset to remove something else'
                : 'Click the object to erase (shift-click to exclude), or find it by text. SAM + inpainting, fully local.'}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Connect an image, then click or describe the object you want to remove.</p>
        )}

        {imageUrl && !result && (
          <Select value={engine} onValueChange={(v) => setEngine(v as 'fast' | 'quality')}>
            <SelectTrigger className="h-7 text-xs nodrag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fast">Fast — MI-GAN (~27MB)</SelectItem>
              <SelectItem value="quality">Quality — LaMa (~200MB)</SelectItem>
            </SelectContent>
          </Select>
        )}

        {imageUrl && !result && (
          <div className="flex gap-1.5">
            <Input
              placeholder='Erase by text, e.g. "the car"'
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFindByText()}
              disabled={processing}
              className="h-7 text-xs nodrag"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs shrink-0"
              onClick={handleFindByText}
              disabled={!imageUrl || !findQuery.trim() || processing}
              title="Find the object by description and erase it"
            >
              <Search className="w-3 h-3" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => runErase(points)}
            disabled={!imageUrl || points.length === 0 || processing || !!result}
          >
            {processing ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {progress || 'Erasing...'}
              </>
            ) : (
              `Erase (${points.length} point${points.length === 1 ? '' : 's'})`
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleReset}
            disabled={processing || (points.length === 0 && !result)}
            title="Reset points and result"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>

        {result && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1 h-6 text-xs" onClick={() => setIsPreviewOpen(true)}>
              Preview
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 h-6 text-xs" onClick={handleDownload}>
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
