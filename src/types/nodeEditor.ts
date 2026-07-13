export interface NodeData {
  label?: string;
  image?: string;
  prompt?: string;
  processing?: boolean;
  error?: string;
  result?: string | string[];
  variantCount?: number;
  [key: string]: any;
}

export interface ImageData {
  url: string;
  file?: File;
  width?: number;
  height?: number;
}

export interface ProcessingResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface NodeConfig {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
}

export interface WorkflowData {
  nodes: NodeConfig[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}

export type NodeType = 
  | 'imageInput'
  | 'batchImageInput'
  | 'prompt'
  | 'processing'
  | 'edit'
  | 'fusion'
  | 'style'
  | 'utility'
  | 'variation'
  | 'output'
  | 'imageOutput'
  | 'draw'
  | 'variantsOutput'
  | 'socialMediaPost'
  | 'imageProps'
  | 'threeModel'
  | 'context'
  | 'effects'
  | 'htmlFrame'
  | 'vectorize'
  | 'upscale'
  | 'pixelate'
  | 'halftoneEffect'
  | 'pixelArt'
  | 'convert'
  | 'batchProcessing'
  ;