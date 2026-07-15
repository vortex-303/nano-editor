import {
  Upload, MessageSquare, Edit3, Settings, Copy, Image, Pencil, Box, Globe,
  Wand2, Crop, Code, Grid3X3, Sparkles, Maximize2, PaintBucket, FileOutput,
  Layers, ScanEye, Mountain, Scissors, Eraser, Clapperboard,
} from 'lucide-react';

import { ImageInputNode } from '@/components/nodes/ImageInputNode';
import { BatchImageInputNode } from '@/components/nodes/BatchImageInputNode';
import { PromptNode } from '@/components/nodes/PromptNode';
import { ProcessingNode } from '@/components/nodes/ProcessingNode';
import { EditNode } from '@/components/nodes/EditNode';
import { VariationNode } from '@/components/nodes/VariationNode';
import { ImageOutputNode } from '@/components/nodes/ImageOutputNode';
import { DrawNode } from '@/components/nodes/DrawNode';
import { VariantsOutputNode } from '@/components/nodes/VariantsOutputNode';
import { SocialMediaPostNode } from '@/components/nodes/SocialMediaPostNode';
import { ImagePropsNode } from '@/components/nodes/ImagePropsNode';
import { ThreeModelNode } from '@/components/nodes/ThreeModelNode';
import { ContextNode } from '@/components/nodes/ContextNode';
import { EffectsNode } from '@/components/nodes/EffectsNode';
import { CropNode } from '@/components/nodes/CropNode';
import UpscaleNode from '@/components/nodes/UpscaleNode';
import { HtmlFrameNode } from '@/components/nodes/HtmlFrameNode';
import { VectorizeNode } from '@/components/nodes/VectorizeNode';
import { PixelateNode } from '@/components/nodes/PixelateNode';
import HalftoneEffectNode from '@/components/nodes/HalftoneEffectNode';
import PixelArtNode from '@/components/nodes/PixelArtNode';
import { ConvertNode } from '@/components/nodes/ConvertNode';
import { BatchProcessingNode } from '@/components/nodes/BatchProcessingNode';
import { DescribeImageNode } from '@/components/nodes/DescribeImageNode';
import { DepthMapNode } from '@/components/nodes/DepthMapNode';
import { SegmentNode } from '@/components/nodes/SegmentNode';
import { EraseNode } from '@/components/nodes/EraseNode';
import { ParallaxNode } from '@/components/nodes/ParallaxNode';
import { MissingPluginNode } from './MissingPluginNode';

import { registerNodes } from './registry';
import type { NodeDefinition } from './types';

/**
 * Built-in node definitions. Port specs are declared where the handle
 * contract is precisely known — unknown specs stay permissive ([]), so
 * legacy graphs keep working while typed connections validate where possible.
 */
const BUILTINS: NodeDefinition[] = [
  // ---- Input ----
  { type: 'imageInput', title: 'Image Input', description: 'Upload, URL, or clipboard', category: 'Input', icon: Upload, component: ImageInputNode,
    inputs: [], outputs: [{ id: 'image', type: 'image' }] },
  { type: 'batchImageInput', title: 'Batch Images', description: 'Multiple images for batch processing', category: 'Input', icon: Grid3X3, component: BatchImageInputNode,
    inputs: [], outputs: [] },
  { type: 'draw', title: 'Draw Input', description: 'Create drawings with mouse', category: 'Input', icon: Pencil, component: DrawNode,
    inputs: [], outputs: [] },
  { type: 'pixelArt', title: 'Pixel Art', description: 'Create pixel art on a grid with SVG export', category: 'Input', icon: PaintBucket, component: PixelArtNode,
    inputs: [], outputs: [] },
  { type: 'prompt', title: 'Prompt', description: 'Text instructions for AI', category: 'Input', icon: MessageSquare, component: PromptNode,
    inputs: [{ id: 'input', type: 'any' }], outputs: [{ id: 'prompt', type: 'text' }, { id: 'image', type: 'image' }] },
  { type: 'context', title: 'Context', description: 'Add context from URLs or manual input', category: 'Input', icon: Globe, component: ContextNode,
    inputs: [], outputs: [] },
  { type: 'threeModel', title: '3D Model', description: 'Load 3D models and capture frames', category: 'Input', icon: Box, component: ThreeModelNode,
    inputs: [], outputs: [] },

  // ---- Processing ----
  { type: 'processing', title: 'AI Edit', description: 'Edit images with AI', category: 'Processing', icon: Edit3, component: ProcessingNode,
    inputs: [], outputs: [{ id: 'result', type: 'image' }] },
  { type: 'edit', title: 'Mark', description: 'Mark areas on images', category: 'Processing', icon: Edit3, component: EditNode,
    inputs: [], outputs: [] },
  { type: 'crop', title: 'Crop', description: 'Crop images with custom ratios and selections', category: 'Processing', icon: Crop, component: CropNode,
    inputs: [], outputs: [] },
  { type: 'upscale', title: 'Upscale', description: 'AI upscaling — free local 2x/4x or fal.ai 2x/4x', category: 'Processing', icon: Maximize2, component: UpscaleNode,
    inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'result', type: 'image' }] },
  { type: 'effects', title: 'Effects', description: 'Filters and effects like background removal', category: 'Processing', icon: Wand2, component: EffectsNode,
    inputs: [], outputs: [] },
  { type: 'describeImage', title: 'Describe Image', description: 'Local AI caption — feeds Prompt/Context inputs (free)', category: 'Processing', icon: ScanEye, badge: 'Local · Free', component: DescribeImageNode,
    inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'prompt', type: 'text' }] },
  { type: 'depthMap', title: 'Depth Map', description: 'Local depth estimation with Depth Anything V2 (free)', category: 'Processing', icon: Mountain, badge: 'Local · Free', component: DepthMapNode,
    inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'result', type: 'image' }] },
  { type: 'segment', title: 'Click to Cut Out', description: 'Click or describe an object to cut it out (free, local)', category: 'Processing', icon: Scissors, badge: 'Local · Free', component: SegmentNode,
    inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'result', type: 'image' }] },
  { type: 'erase', title: 'Object Eraser', description: 'Remove objects — click or describe (free, local)', category: 'Processing', icon: Eraser, badge: 'Local · Free', component: EraseNode,
    inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'result', type: 'image' }] },
  { type: 'parallax', title: 'Depth Parallax', description: '2.5D parallax animation, exports MP4/WebM/GIF (free, local)', category: 'Processing', icon: Clapperboard, badge: 'Local · Free', component: ParallaxNode,
    inputs: [{ id: 'image', type: 'image' }, { id: 'image-depth', type: 'image', label: 'depth' }], outputs: [] },
  { type: 'vectorize', title: 'Vectorize', description: 'Convert images to SVG vectors', category: 'Processing', icon: Sparkles, component: VectorizeNode,
    inputs: [], outputs: [] },
  { type: 'pixelate', title: 'Pixelate', description: 'Generate 8-bit or 16-bit pixel art', category: 'Processing', icon: Grid3X3, component: PixelateNode,
    inputs: [], outputs: [] },
  { type: 'halftoneEffect', title: 'Halftone', description: 'Halftone shading with dot, ordered, or dithering modes', category: 'Processing', icon: Sparkles, component: HalftoneEffectNode,
    inputs: [], outputs: [] },
  { type: 'imageProps', title: 'Image Props', description: 'Adjust rotation, brightness and other properties', category: 'Processing', icon: Settings, component: ImagePropsNode,
    inputs: [], outputs: [] },
  { type: 'variation', title: 'Variants', description: 'Create variations of an image', category: 'Processing', icon: Copy, component: VariationNode,
    inputs: [], outputs: [] },
  { type: 'convert', title: 'Convert', description: 'Convert images between formats (PNG, JPG, WebP)', category: 'Processing', icon: FileOutput, component: ConvertNode,
    inputs: [], outputs: [] },
  { type: 'batchProcessing', title: 'Batch AI Edit', description: 'Apply the same AI edit to multiple images', category: 'Processing', icon: Layers, component: BatchProcessingNode,
    inputs: [], outputs: [] },
  { type: 'htmlFrame', title: 'HTML Frame', description: 'Generate interactive HTML/CSS/JS components with AI', category: 'Processing', icon: Code, component: HtmlFrameNode,
    inputs: [], outputs: [] },
  { type: 'socialMediaPost', title: 'Social Post', description: 'Create social media ads and posts', category: 'Processing', icon: MessageSquare, component: SocialMediaPostNode,
    inputs: [], outputs: [] },

  // ---- Output ----
  { type: 'imageOutput', title: 'Image Output', description: 'Display and download images', category: 'Output', icon: Image, component: ImageOutputNode,
    inputs: [{ id: 'image', type: 'image' }], outputs: [] },
  { type: 'variantsOutput', title: 'Variants Gallery', description: 'Gallery for variant images with zip download', category: 'Output', icon: Copy, component: VariantsOutputNode,
    inputs: [], outputs: [] },

  // ---- Internal ----
  { type: 'missingPlugin', title: 'Missing Plugin', description: 'Placeholder for a node whose plugin is not installed', category: 'Processing', icon: Sparkles, component: MissingPluginNode,
    inputs: [], outputs: [], hidden: true },
];

let registered = false;

/** Idempotent — call once at app startup before the editor renders. */
export const registerBuiltins = (): void => {
  if (registered) return;
  registered = true;
  registerNodes(BUILTINS);
};
