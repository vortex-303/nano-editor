import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, ScanEye } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { describeImage } from '@/lib/localAi';
import { toast } from 'sonner';

interface DescribeImageNodeProps {
  data: NodeData;
  id: string;
}

export const DescribeImageNode: React.FC<DescribeImageNodeProps> = ({ data, id }) => {
  const [caption, setCaption] = useState<string>((data.prompt as string) || '');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const { getConnectedNodeData, updateNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();

  const edges = getEdges();
  const connectedImage = getConnectedNodeData(id, edges, 'image');
  const imageUrl = Array.isArray(connectedImage) ? connectedImage[0] : connectedImage;

  useEffect(() => {
    // Expose the caption as prompt + context so it plugs into Prompt/Context inputs
    updateNodeData(id, { prompt: caption, contextData: caption, result: caption, processing });
  }, [caption, processing, id, updateNodeData]);

  const handleDescribe = async () => {
    if (!imageUrl) {
      toast.error('Connect an image to describe');
      return;
    }
    setProcessing(true);
    try {
      const text = await describeImage(imageUrl, setProgress);
      setCaption(text);
      toast.success('Image described');
    } catch (error) {
      console.error('Describe image failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to describe image');
    } finally {
      setProcessing(false);
      setProgress('');
    }
  };

  return (
    <Card className="w-72 p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanEye size={16} className="text-primary" />
            <span className="text-sm font-medium">Describe Image</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">Local · Free</Badge>
        </div>

        {imageUrl ? (
          <img src={imageUrl} alt="Input" className="w-full h-24 object-cover rounded border" />
        ) : (
          <p className="text-xs text-muted-foreground">Connect an image to generate a detailed caption — runs entirely in your browser.</p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={handleDescribe}
          disabled={!imageUrl || processing}
        >
          {processing ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {progress || 'Analyzing...'}
            </>
          ) : (
            'Describe'
          )}
        </Button>

        {caption && (
          <div className="space-y-1">
            <Label className="text-xs">Caption (editable)</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[70px] text-xs resize-none nodrag"
            />
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
        id="prompt"
        className="w-3 h-3 bg-green-500"
      />
    </Card>
  );
};
