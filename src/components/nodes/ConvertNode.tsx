import React, { useState, useEffect, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { FileOutput, Download, Settings, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { NodeData } from '@/types/nodeEditor';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface ConvertNodeProps {
  data: NodeData;
  id: string;
}

type OutputFormat = 'png' | 'jpeg' | 'webp';

interface ConvertedFile {
  url: string;
  filename: string;
  format: OutputFormat;
  originalName?: string;
}

export function ConvertNode({ id, data }: ConvertNodeProps) {
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('png');
  const [quality, setQuality] = useState(90);
  const [scale, setScale] = useState(1);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [inputImages, setInputImages] = useState<string[]>([]);
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const { updateNodeData, getConnectedNodeData, getAllConnectedNodeData } = useNodeDataContext();
  const { getEdges } = useReactFlow();

  // Get input images from connected nodes
  useEffect(() => {
    const edges = getEdges();
    const connectedEdges = edges.filter(edge => edge.target === id);
    
    const images: string[] = [];
    
    for (const edge of connectedEdges) {
      if (edge.targetHandle === 'batch-input') {
        const batchData = getConnectedNodeData(id, edges, 'batch-input');
        if (Array.isArray(batchData)) {
          images.push(...batchData);
        }
      } else if (edge.targetHandle === 'image-input') {
        const imageData = getConnectedNodeData(id, edges, 'image-input');
        if (typeof imageData === 'string') {
          images.push(imageData);
        }
      }
    }
    
    setInputImages(images);
  }, [id, getEdges, getConnectedNodeData]);

  const convertImage = async (imageUrl: string, index: number): Promise<ConvertedFile> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        const width = Math.round(img.naturalWidth * scale);
        const height = Math.round(img.naturalHeight * scale);
        
        canvas.width = width;
        canvas.height = height;
        
        // Fill background for JPEG (no transparency support)
        if (outputFormat === 'jpeg') {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, width, height);
        }
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        const mimeType = outputFormat === 'png' ? 'image/png' : 
                        outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
        
        const qualityValue = outputFormat === 'png' ? undefined : quality / 100;
        const dataUrl = canvas.toDataURL(mimeType, qualityValue);
        
        resolve({
          url: dataUrl,
          filename: `converted-${index + 1}.${outputFormat}`,
          format: outputFormat,
          originalName: `image-${index + 1}`
        });
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  };

  const handleConvert = async () => {
    if (inputImages.length === 0) {
      toast.error('No images to convert');
      return;
    }
    
    setProcessing(true);
    setProgress(0);
    setConvertedFiles([]);
    
    const results: ConvertedFile[] = [];
    
    try {
      for (let i = 0; i < inputImages.length; i++) {
        const result = await convertImage(inputImages[i], i);
        results.push(result);
        setProgress(((i + 1) / inputImages.length) * 100);
      }
      
      setConvertedFiles(results);
      updateNodeData(id, { 
        convertedImages: results.map(r => r.url),
        batchOutput: results.map(r => r.url)
      });
      
      toast.success(`Converted ${results.length} file${results.length > 1 ? 's' : ''} to ${outputFormat.toUpperCase()}`);
    } catch (error) {
      toast.error('Conversion failed');
      console.error('Conversion error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadSingle = (file: ConvertedFile) => {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.filename;
    a.click();
  };

  const handleDownloadAll = async () => {
    if (convertedFiles.length === 0) return;
    
    if (convertedFiles.length === 1) {
      handleDownloadSingle(convertedFiles[0]);
      return;
    }
    
    const zip = new JSZip();
    
    for (const file of convertedFiles) {
      const base64Data = file.url.split(',')[1];
      zip.file(file.filename, base64Data, { base64: true });
    }
    
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted-images-${outputFormat}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-72 shadow-elegant border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileOutput className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-sm">Convert</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {inputImages.length} input{inputImages.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Input Preview */}
        {inputImages.length > 0 && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {inputImages.slice(0, 4).map((img, i) => (
              <img 
                key={i} 
                src={img} 
                alt={`Input ${i + 1}`}
                className="w-12 h-12 object-cover rounded border"
              />
            ))}
            {inputImages.length > 4 && (
              <div className="w-12 h-12 rounded border flex items-center justify-center bg-muted text-xs">
                +{inputImages.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Output Format */}
        <div className="space-y-1">
          <Label className="text-xs">Output Format</Label>
          <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as OutputFormat)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG (lossless, transparency)</SelectItem>
              <SelectItem value="jpeg">JPEG (smaller, no transparency)</SelectItem>
              <SelectItem value="webp">WebP (modern, smaller)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quality (for JPEG/WebP) */}
        {outputFormat !== 'png' && (
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label className="text-xs">Quality</Label>
              <span className="text-xs text-muted-foreground">{quality}%</span>
            </div>
            <Slider
              value={[quality]}
              onValueChange={([v]) => setQuality(v)}
              min={10}
              max={100}
              step={5}
              className="h-4"
            />
          </div>
        )}

        {/* Advanced Options */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full h-6 text-xs">
              <Settings className="h-3 w-3 mr-1" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs">Scale</Label>
                <span className="text-xs text-muted-foreground">{scale}x</span>
              </div>
              <Slider
                value={[scale]}
                onValueChange={([v]) => setScale(v)}
                min={0.25}
                max={2}
                step={0.25}
                className="h-4"
              />
            </div>
            
            {outputFormat === 'jpeg' && (
              <div className="space-y-1">
                <Label className="text-xs">Background Color</Label>
                <Input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-8 w-full"
                />
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Progress */}
        {processing && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Converting... {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Convert Button */}
        <Button 
          onClick={handleConvert} 
          disabled={processing || inputImages.length === 0}
          className="w-full h-8"
          size="sm"
        >
          {processing ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <FileOutput className="h-3 w-3 mr-1" />
              Convert {inputImages.length > 0 ? `(${inputImages.length})` : ''}
            </>
          )}
        </Button>

        {/* Results */}
        {convertedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {convertedFiles.slice(0, 4).map((file, i) => (
                <img 
                  key={i} 
                  src={file.url} 
                  alt={file.filename}
                  className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80"
                  onClick={() => handleDownloadSingle(file)}
                />
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full h-7 text-xs"
              onClick={handleDownloadAll}
            >
              <Download className="h-3 w-3 mr-1" />
              Download {convertedFiles.length > 1 ? `All (${convertedFiles.length})` : ''}
            </Button>
          </div>
        )}

        {/* Handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="image-input"
          style={{ background: '#3b82f6', width: 10, height: 10, border: '2px solid white', top: '30%' }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="batch-input"
          style={{ background: '#9333ea', width: 12, height: 12, border: '2px solid white', top: '60%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="batch-output"
          style={{ background: '#9333ea', width: 12, height: 12, border: '2px solid white', top: '50%' }}
        />
      </CardContent>
    </Card>
  );
}
