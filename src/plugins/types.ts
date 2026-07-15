import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import { z } from 'zod';

/** Semantic type of a node port — drives connection validation and handle color. */
export type PortType = 'image' | 'images' | 'text' | 'context' | 'batch' | 'mask' | 'any';

export interface PortSpec {
  /** Handle id — must match the resolution conventions in useNodeData.ts */
  id: string;
  type: PortType;
  label?: string;
}

export const PORT_COLORS: Record<PortType, string> = {
  image: 'bg-blue-500',
  images: 'bg-blue-500',
  mask: 'bg-cyan-500',
  text: 'bg-green-500',
  context: 'bg-orange-500',
  batch: 'bg-purple-500',
  any: 'bg-gray-400',
};

/** Which source port types a target port type accepts. */
const COMPATIBLE: Record<PortType, PortType[]> = {
  image: ['image', 'mask'],
  images: ['images', 'image', 'mask'],
  mask: ['mask', 'image'],
  text: ['text', 'context'],
  context: ['context', 'text'],
  batch: ['batch', 'images'],
  any: ['image', 'images', 'mask', 'text', 'context', 'batch', 'any'],
};

export const portsCompatible = (source: PortType, target: PortType): boolean =>
  source === 'any' || target === 'any' || COMPATIBLE[target].includes(source);

export type NodeCategory = 'Input' | 'Processing' | 'Output' | 'Community';

/** A registered node type — built-in (React component) or plugin-generated. */
export interface NodeDefinition {
  type: string;
  title: string;
  description: string;
  category: NodeCategory;
  /** Lucide icon for built-ins; plugins use manifest.icon (emoji) instead */
  icon?: LucideIcon;
  /** Emoji icon (plugin nodes) */
  emoji?: string;
  badge?: string;
  inputs: PortSpec[];
  outputs: PortSpec[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  /** Hide from the palette (e.g. internal fallback node) */
  hidden?: boolean;
  /** Set for plugin-provided nodes */
  pluginId?: string;
}

// ---------- Plugin manifest (tier 1: declarative; tier 2: sandboxed script) ----------

const portSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  type: z.enum(['image', 'images', 'text', 'context', 'batch', 'mask', 'any']),
  label: z.string().max(40).optional(),
});

const paramSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('text'),
    key: z.string(),
    label: z.string(),
    placeholder: z.string().optional(),
    default: z.string().optional(),
    multiline: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('select'),
    key: z.string(),
    label: z.string(),
    options: z.array(z.object({ value: z.string(), label: z.string() })).min(1),
    default: z.string().optional(),
  }),
  z.object({
    kind: z.literal('slider'),
    key: z.string(),
    label: z.string(),
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    default: z.number().optional(),
  }),
  z.object({
    kind: z.literal('toggle'),
    key: z.string(),
    label: z.string(),
    default: z.boolean().optional(),
  }),
]);

const transformersRuntimeSchema = z.object({
  kind: z.literal('transformers-pipeline'),
  task: z.enum([
    'background-removal',
    'image-to-text',
    'image-classification',
    'depth-estimation',
    'image-segmentation',
    'zero-shot-image-classification',
    'image-to-image',
    'object-detection',
    'zero-shot-object-detection',
  ]),
  model: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'Expected a Hugging Face repo id like org/model'),
  dtype: z.string().optional(),
  /** Extra options passed to the pipeline call (e.g. candidate labels source) */
  options: z.record(z.string(), z.unknown()).optional(),
});

const falRuntimeSchema = z.object({
  kind: z.literal('fal-endpoint'),
  endpoint: z.string().regex(/^[\w-]+(\/[\w.-]+)+$/),
  /**
   * Maps fal input fields to sources: "$image" (first image input),
   * "$images" (all image inputs), "$text" (text input), "$param.<key>".
   */
  inputMap: z.record(z.string(), z.string()),
  /** Dot-path into result.data for the output, e.g. "images.0.url" */
  outputPath: z.string(),
  outputKind: z.enum(['image-url', 'text']).default('image-url'),
});

const onnxRuntimeSchema = z.object({
  kind: z.literal('onnx'),
  modelUrl: z.string().url().refine((u) => u.startsWith('https://huggingface.co/') || u.startsWith('https://raw.githubusercontent.com/'), {
    message: 'Model must be hosted on huggingface.co or raw.githubusercontent.com',
  }),
  /** Named preset for tensor pre/post-processing */
  preset: z.enum(['image-float01-chw', 'image-uint8-chw']),
  inputSize: z.number().int().min(64).max(1024).default(512),
});

const scriptRuntimeSchema = z.object({
  kind: z.literal('script'),
  /** Plugin JS source URL (tier 2, sandboxed). Fetched at install, stored locally. */
  sourceUrl: z.string().url().optional(),
});

export const pluginManifestSchema = z.object({
  /** Framework format version */
  format: z.literal('nano-node/1'),
  id: z.string().regex(/^[a-z][a-z0-9-]{2,49}$/),
  name: z.string().min(2).max(60),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(300),
  author: z.string().max(80).optional(),
  homepage: z.string().url().optional(),
  /** Emoji shown as the node icon */
  icon: z.string().min(1).max(8).default('✨'),
  category: z.enum(['Input', 'Processing', 'Output', 'Community']).default('Community'),
  badge: z.string().max(20).optional(),
  inputs: z.array(portSchema).max(6).default([]),
  outputs: z.array(portSchema).min(1).max(4),
  params: z.array(paramSchema).max(10).default([]),
  runtime: z.discriminatedUnion('kind', [
    transformersRuntimeSchema,
    falRuntimeSchema,
    onnxRuntimeSchema,
    scriptRuntimeSchema,
  ]),
  /** Tier-2 capability requests (ignored for declarative runtimes) */
  permissions: z.object({
    net: z.array(z.string()).max(5).default([]),
  }).optional(),
  /** Informational: approximate model download size */
  modelSizeMB: z.number().positive().optional(),
});

export type PluginManifest = z.infer<typeof pluginManifestSchema>;
export type PluginParam = z.infer<typeof paramSchema>;
export type PluginRuntime = PluginManifest['runtime'];

/** xyflow node type string for a plugin node */
export const pluginNodeType = (pluginId: string): string => `plugin.${pluginId}`;

export interface InstalledPlugin {
  manifest: PluginManifest;
  /** Tier-2 script source, stored at install time (never re-fetched) */
  source?: string;
  origin: 'url' | 'registry' | 'huggingface' | 'builtin-trial';
  installedAt: string;
  enabled: boolean;
}
