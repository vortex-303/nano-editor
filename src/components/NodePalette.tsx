import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  MessageSquare, 
  Edit3, 
  Merge, 
  Palette, 
  Settings, 
  Copy, 
  Download,
  Image,
  Pencil,
  Box,
  Globe,
  Wand2,
  Crop,
  Code,
  Grid3X3,
  Sparkles,
  Maximize2,
  PaintBucket,
  FileOutput,
  Layers
} from 'lucide-react';

interface NodePaletteProps {
  onAddNode: (type: string, position: { x: number; y: number }) => void;
}

const nodeCategories = [
  {
    title: 'Input',
    nodes: [
      { type: 'imageInput', label: 'Image Input', icon: Upload, description: 'Upload, URL, or clipboard' },
      { type: 'batchImageInput', label: 'Batch Images', icon: Grid3X3, description: 'Multiple images for batch processing' },
      { type: 'draw', label: 'Draw Input', icon: Pencil, description: 'Create drawings with mouse' },
      { type: 'pixelArt', label: 'Pixel Art', icon: PaintBucket, description: 'Create pixel art on a grid with SVG export' },
      { type: 'prompt', label: 'Prompt', icon: MessageSquare, description: 'Text instructions for AI' },
      { type: 'context', label: 'Context', icon: Globe, description: 'Add context from URLs or manual input' },
      { type: 'threeModel', label: '3D Model', icon: Box, description: 'Load 3D models and capture frames' },
    ]
  },
  {
    title: 'Processing',
    nodes: [
      { type: 'processing', label: 'AI Edit', icon: Edit3, description: 'Edit images with AI' },
      { type: 'edit', label: 'Mark', icon: Edit3, description: 'Mark areas on images' },
      { type: 'crop', label: 'Crop', icon: Crop, description: 'Crop images with custom ratios and selections' },
      { type: 'upscale', label: 'Upscale', icon: Maximize2, description: 'AI upscaling 2x/4x with Real-ESRGAN' },
      { type: 'effects', label: 'Effects', icon: Wand2, description: 'Apply filters and effects like background removal' },
      { type: 'vectorize', label: 'Vectorize', icon: Sparkles, description: 'Convert images to SVG vectors' },
      { type: 'pixelate', label: 'Pixelate', icon: Grid3X3, description: 'Generate 8-bit or 16-bit pixel art' },
      { type: 'halftoneEffect', label: 'Halftone', icon: Sparkles, description: 'Apply halftone shading with dot, ordered, or dithering modes' },
      { type: 'imageProps', label: 'Image Props', icon: Settings, description: 'Adjust image properties like rotation, brightness' },
      { type: 'variation', label: 'Variants', icon: Copy, description: 'Create variations of an image' },
      { type: 'convert', label: 'Convert', icon: FileOutput, description: 'Convert images between formats (PNG, JPG, WebP)' },
      { type: 'batchProcessing', label: 'Batch AI Edit', icon: Layers, description: 'Apply same AI edit to multiple images with throttling' },
      { type: 'htmlFrame', label: 'HTML Frame', icon: Code, description: 'Generate interactive HTML/CSS/JS components with AI' },
      { type: 'socialMediaPost', label: 'Social Post', icon: MessageSquare, description: 'Create social media ads and posts' },
    ]
  },
  {
    title: 'Output',
    nodes: [
      { type: 'imageOutput', label: 'Image Output', icon: Image, description: 'Display and download images' },
      { type: 'variantsOutput', label: 'Variants Gallery', icon: Copy, description: 'Gallery for variant images with zip download' },
    ]
  }
];

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleNodeAdd = (type: string) => {
    // Add node at center of canvas
    onAddNode(type, { x: 400, y: 300 });
  };

  return (
    <Card className="w-64 h-full rounded-none border-r border-l-0 border-t-0 border-b-0 flex flex-col">
      <div className="p-4 border-b flex-shrink-0">
        <h3 className="font-semibold text-sm">Node Library</h3>
      </div>
      <ScrollArea className="flex-1 overflow-auto">
        <div className="p-2 pb-8">
          {nodeCategories.map((category, idx) => (
            <div key={category.title} className="mb-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-1.5 px-2">
                {category.title}
              </h4>
              <div className="space-y-0.5">
                {category.nodes.map((node) => {
                  const Icon = node.icon;
                  return (
                    <div
                      key={node.type}
                      className="group w-full justify-start h-auto p-2 text-left border rounded-md cursor-grab hover:bg-accent transition-colors"
                      draggable
                      onDragStart={(event) => onDragStart(event, node.type)}
                      onClick={() => handleNodeAdd(node.type)}
                    >
                      <div className="flex items-start gap-2">
                        <Icon size={14} className="mt-0.5 text-primary group-hover:text-black" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium group-hover:text-black">{node.label}</div>
                          <div className="text-[10px] text-muted-foreground group-hover:text-black leading-tight mt-1">
                            {node.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {idx < nodeCategories.length - 1 && <Separator className="mt-2" />}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};