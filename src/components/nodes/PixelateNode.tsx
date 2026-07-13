import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Grid3X3 } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { toast } from 'sonner';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { ImagePreviewModal } from '../ImagePreviewModal';
import { convertToPixelArt, PixelArtOptions } from '@/utils/pixelArtConverter';

interface PixelateNodeProps {
  data: NodeData;
  id: string;
}

export const PixelateNode: React.FC<PixelateNodeProps> = ({ data, id }) => {
  const [targetWidth, setTargetWidth] = useState(data.targetWidth || 64);
  const [palette, setPalette] = useState<'dawnbringer16' | 'gameboy' | 'nes' | 'none'>(data.palette || 'dawnbringer16');
  const [dither, setDither] = useState(data.dither ?? false);
  const [outputScale, setOutputScale] = useState(data.outputScale || 8);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(data.result || '');
  const [error, setError] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const { getConnectedNodeData, updateNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();

  // Get connected input data
  const edges = getEdges();
  const connectedImage = getConnectedNodeData(id, edges, 'image');

  // Update node data when settings change
  useEffect(() => {
    updateNodeData(id, { result, processing, error, targetWidth, palette, dither, outputScale });
  }, [result, processing, error, targetWidth, palette, dither, outputScale, id, updateNodeData]);

  const handleGenerate = useCallback(async () => {
    if (!connectedImage) {
      toast.error('Please connect an image input');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const options: PixelArtOptions = {
        targetWidth,
        palette,
        dither,
        outputScale,
        keepAspectRatio: true
      };

      const { dataUrl } = await convertToPixelArt(connectedImage, options);
      
      setResult(dataUrl);
      toast.success('Pixel art created successfully!');
    } catch (err) {
      console.error('Pixelate error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Conversion failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  }, [connectedImage, targetWidth, palette, dither, outputScale]);

  return (
    <Card className="w-80 p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Grid3X3 size={16} className="text-primary" />
          <span className="text-sm font-medium">Pixelate</span>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Target Width (px)</Label>
            <Select value={targetWidth.toString()} onValueChange={(v) => setTargetWidth(Number(v))}>
              <SelectTrigger className="w-full nodrag">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="32">32px (Tiny)</SelectItem>
                <SelectItem value="48">48px (Small)</SelectItem>
                <SelectItem value="64">64px (Medium)</SelectItem>
                <SelectItem value="96">96px (Large)</SelectItem>
                <SelectItem value="128">128px (XL)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Color Palette</Label>
            <Select value={palette} onValueChange={(v: any) => setPalette(v)}>
              <SelectTrigger className="w-full nodrag">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dawnbringer16">DawnBringer 16</SelectItem>
                <SelectItem value="gameboy">Game Boy (4 colors)</SelectItem>
                <SelectItem value="nes">NES (16 colors)</SelectItem>
                <SelectItem value="none">No Palette</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Output Scale</Label>
            <Select value={outputScale.toString()} onValueChange={(v) => setOutputScale(Number(v))}>
              <SelectTrigger className="w-full nodrag">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4× (Small)</SelectItem>
                <SelectItem value="8">8× (Medium)</SelectItem>
                <SelectItem value="12">12× (Large)</SelectItem>
                <SelectItem value="16">16× (XL)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Floyd-Steinberg Dithering</Label>
            <Switch checked={dither} onCheckedChange={setDither} />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {connectedImage ? (
                <div className="space-y-2">
                  <div className="text-blue-500">✓ Image connected</div>
                  <img
                    src={connectedImage}
                    alt="Input"
                    className="w-full aspect-square object-cover rounded border cursor-pointer"
                    onClick={() => {
                      setPreviewImage(connectedImage);
                      setIsPreviewOpen(true);
                    }}
                  />
                </div>
              ) : (
                <div className="text-muted-foreground">⚠ No image connected</div>
              )}
            </div>
            
            <Button 
              onClick={handleGenerate} 
              disabled={processing || !connectedImage}
              className="w-full"
              size="sm"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Grid3X3 className="mr-2 h-4 w-4" />
                  Convert to Pixel Art
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}

          {result && typeof result === 'string' && (
            <div className="space-y-2">
              <Label className="text-xs">Result</Label>
              <img
                src={result}
                alt="Pixel art result"
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

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={previewImage}
      />
    </Card>
  );
};
