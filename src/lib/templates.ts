import { Node, Edge } from '@xyflow/react';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  group: 'local' | 'key';
  build: () => { nodes: Node[]; edges: Edge[] };
}

const EDGE_STYLE = { style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 }, type: 'smoothstep' as const };

/** Build helper: unique ids per invocation so re-applying a template never collides. */
const graph = () => {
  const base = Date.now();
  let i = 0;
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const add = (type: string, x: number, y: number, data: Record<string, unknown> = {}): string => {
    const id = `${type}-${base + i++}`;
    nodes.push({ id, type, position: { x, y }, data: { label: `${type} node`, ...data } });
    return id;
  };
  const link = (source: string, sourceHandle: string, target: string, targetHandle: string) => {
    edges.push({ id: `e-${source}-${target}-${i++}`, source, sourceHandle, target, targetHandle, ...EDGE_STYLE });
  };
  return { nodes, edges, add, link, result: () => ({ nodes, edges }) };
};

export const TEMPLATES: WorkflowTemplate[] = [
  // ---------- Local / free ----------
  {
    id: 'remove-background', name: 'Remove Background', icon: '🪄', group: 'local',
    description: 'Cut out the subject and export a transparent PNG.',
    build: () => { const g = graph();
      const a = g.add('imageInput', 60, 160);
      const b = g.add('effects', 400, 160, { selectedEffect: 'removeBackgroundHQ' });
      const c = g.add('imageOutput', 760, 160);
      g.link(a, 'image', b, 'image'); g.link(b, 'result', c, 'image');
      return g.result(); },
  },
  {
    id: 'cut-out-object', name: 'Cut Out Object', icon: '✂️', group: 'local',
    description: 'Click or describe an object to isolate it as a sticker.',
    build: () => { const g = graph();
      const a = g.add('imageInput', 60, 160);
      const b = g.add('segment', 400, 160);
      const c = g.add('imageOutput', 800, 160);
      g.link(a, 'image', b, 'image'); g.link(b, 'result', c, 'image');
      return g.result(); },
  },
  {
    id: 'erase-object', name: 'Erase Object', icon: '🧽', group: 'local',
    description: 'Remove a person, logo, or distraction and fill the gap.',
    build: () => { const g = graph();
      const a = g.add('imageInput', 60, 160);
      const b = g.add('erase', 400, 160);
      const c = g.add('imageOutput', 800, 160);
      g.link(a, 'image', b, 'image'); g.link(b, 'result', c, 'image');
      return g.result(); },
  },
  {
    id: 'upscale', name: 'Upscale 4×', icon: '🔍', group: 'local',
    description: 'Enlarge and sharpen an image locally (2× or 4×).',
    build: () => { const g = graph();
      const a = g.add('imageInput', 60, 160);
      const b = g.add('upscale', 400, 160, { upscaleEngine: 'local' });
      const c = g.add('imageOutput', 820, 160);
      g.link(a, 'image', b, 'image'); g.link(b, 'result', c, 'image');
      return g.result(); },
  },
  {
    id: 'parallax', name: 'Photo → Parallax Video', icon: '🎬', group: 'local',
    description: 'Turn a still photo into a 2.5D animation; export MP4/GIF.',
    build: () => { const g = graph();
      const a = g.add('imageInput', 60, 160);
      const b = g.add('parallax', 460, 160);
      g.link(a, 'image', b, 'image');
      return g.result(); },
  },
  {
    id: 'depth-map', name: 'Extract Depth Map', icon: '🏔️', group: 'local',
    description: 'Generate a depth pass for relighting, 3D, or compositing.',
    build: () => { const g = graph();
      const a = g.add('imageInput', 60, 160);
      const b = g.add('depthMap', 420, 160);
      const c = g.add('imageOutput', 780, 160);
      g.link(a, 'image', b, 'image'); g.link(b, 'result', c, 'image');
      return g.result(); },
  },
  {
    id: 'describe', name: 'Describe / Alt Text', icon: '📝', group: 'local',
    description: 'Caption an image for alt text or as a generation prompt.',
    build: () => { const g = graph();
      const a = g.add('imageInput', 60, 160);
      g.add('describeImage', 460, 160);
      const b = g.nodes[1].id;
      g.link(a, 'image', b, 'image');
      return g.result(); },
  },
  {
    id: 'vectorize', name: 'Vectorize to SVG', icon: '📐', group: 'local',
    description: 'Convert a logo or shape into clean scalable vectors.',
    build: () => { const g = graph();
      const a = g.add('imageInput', 60, 160);
      const b = g.add('vectorize', 420, 160);
      const c = g.add('imageOutput', 800, 160);
      g.link(a, 'image', b, 'image-input'); g.link(b, 'svg-output', c, 'image');
      return g.result(); },
  },
  {
    id: 'halftone', name: 'Halftone Poster', icon: '🌀', group: 'local',
    description: 'Apply a retro halftone / print-style effect.',
    build: () => { const g = graph();
      const a = g.add('imageInput', 60, 160);
      const b = g.add('halftoneEffect', 420, 160);
      const c = g.add('imageOutput', 800, 160);
      g.link(a, 'image', b, 'image'); g.link(b, 'result', c, 'image');
      return g.result(); },
  },
  {
    id: 'cutout-upscale', name: 'Cutout + Upscale', icon: '✨', group: 'local',
    description: 'Remove the background, then enlarge the clean cutout.',
    build: () => { const g = graph();
      const a = g.add('imageInput', 40, 160);
      const b = g.add('effects', 360, 160, { selectedEffect: 'removeBackgroundHQ' });
      const c = g.add('upscale', 700, 160, { upscaleEngine: 'local' });
      const d = g.add('imageOutput', 1080, 160);
      g.link(a, 'image', b, 'image'); g.link(b, 'result', c, 'image'); g.link(c, 'result', d, 'image');
      return g.result(); },
  },

  // ---------- Needs a fal.ai key ----------
  {
    id: 'text-to-image', name: 'Text → Image → Upscale', icon: '🎨', group: 'key',
    description: 'Generate an image from a prompt, then upscale it.',
    build: () => { const g = graph();
      const a = g.add('prompt', 60, 160);
      const b = g.add('upscale', 460, 160);
      const c = g.add('imageOutput', 880, 160);
      g.link(a, 'image', b, 'image'); g.link(b, 'result', c, 'image');
      return g.result(); },
  },
  {
    id: 'ai-edit', name: 'AI Edit a Photo', icon: '🖌️', group: 'key',
    description: 'Edit a photo with a text instruction.',
    build: () => { const g = graph();
      const a = g.add('imageInput', 60, 60);
      const p = g.add('prompt', 60, 320);
      const b = g.add('processing', 480, 170);
      const c = g.add('imageOutput', 900, 170);
      g.link(a, 'image', b, 'image-1'); g.link(p, 'prompt', b, 'prompt'); g.link(b, 'result', c, 'image');
      return g.result(); },
  },
  {
    id: 'product-shot', name: 'Product Studio Shot', icon: '📸', group: 'key',
    description: 'Free local cutout, then place the product on an AI studio backdrop.',
    build: () => { const g = graph();
      const a = g.add('imageInput', 40, 60);
      const e = g.add('effects', 340, 60, { selectedEffect: 'removeBackgroundHQ' });
      const p = g.add('prompt', 40, 340, { prompt: 'Place the subject on a clean, softly-lit studio backdrop with a subtle shadow.' });
      const b = g.add('processing', 700, 180);
      const c = g.add('imageOutput', 1100, 180);
      g.link(a, 'image', e, 'image'); g.link(e, 'result', b, 'image-1'); g.link(p, 'prompt', b, 'prompt'); g.link(b, 'result', c, 'image');
      return g.result(); },
  },
  {
    id: 'social-pack', name: 'Social Media Pack', icon: '📣', group: 'key',
    description: 'Generate a set of on-brand social posts with copy.',
    build: () => { const g = graph();
      g.add('socialMediaPost', 220, 120);
      return g.result(); },
  },
  {
    id: 'variations', name: 'Image Variations', icon: '🔀', group: 'key',
    description: 'Create several variations of an image and download them.',
    build: () => { const g = graph();
      const a = g.add('imageInput', 60, 60);
      const p = g.add('prompt', 60, 320);
      const v = g.add('variation', 480, 170);
      const o = g.add('variantsOutput', 900, 170);
      g.link(a, 'image', v, 'image'); g.link(p, 'prompt', v, 'prompt'); g.link(v, 'batch', o, 'images');
      return g.result(); },
  },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);
