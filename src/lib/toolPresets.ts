import { Node, Edge } from '@xyflow/react';

/**
 * Starter graphs for the /tools/* landing-page deep links (?tool=<id>).
 * Each drops an Image Input node pre-connected to the relevant processing node,
 * so the visitor just adds their image and runs.
 */
const PRESET_TARGET: Record<string, string> = {
  'remove-background': 'effects',
  'object-eraser': 'erase',
  'upscale-image': 'upscale',
  'depth-parallax': 'parallax',
  'describe-image': 'describeImage',
};

export const getToolPreset = (toolId: string): { nodes: Node[]; edges: Edge[] } | null => {
  const targetType = PRESET_TARGET[toolId];
  if (!targetType) return null;
  const t = Date.now();
  const imgId = `imageInput-${t}`;
  const tgtId = `${targetType}-${t + 1}`;
  return {
    nodes: [
      { id: imgId, type: 'imageInput', position: { x: 80, y: 120 }, data: { label: 'Image Input' } },
      { id: tgtId, type: targetType, position: { x: 540, y: 150 }, data: { label: `${targetType} node` } },
    ],
    edges: [
      {
        id: `e-${imgId}-${tgtId}`,
        source: imgId,
        sourceHandle: 'image',
        target: tgtId,
        targetHandle: 'image',
        type: 'smoothstep',
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      },
    ],
  };
};
