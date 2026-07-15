import { putRecord, getRecord, deleteRecord, listRecords, pluginStore } from '@/lib/localDb';
import { pluginManifestSchema, pluginNodeType, type InstalledPlugin, type PluginManifest, type PortSpec } from './types';
import { registerNode, unregisterNode } from './registry';
import { createPluginNodeComponent } from './PluginNode';

export { pluginStore };

const MAX_SCRIPT_BYTES = 200_000;

/** Registry index location — points at the trial set until the public registry repo exists. */
export const REGISTRY_INDEX_URL = '/trial-plugins/index.json';

const toDefinition = (manifest: PluginManifest) => ({
  type: pluginNodeType(manifest.id),
  title: manifest.name,
  description: manifest.description,
  category: manifest.category,
  emoji: manifest.icon,
  badge: manifest.badge,
  inputs: manifest.inputs as PortSpec[],
  outputs: manifest.outputs as PortSpec[],
  component: createPluginNodeComponent(manifest),
  pluginId: manifest.id,
});

export const parseManifest = (raw: unknown): PluginManifest => {
  const result = pluginManifestSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`Invalid plugin manifest: ${issue.path.join('.')} — ${issue.message}`);
  }
  return result.data;
};

/** Fetch and validate a tier-2 script at install time (stored, never re-fetched). */
const fetchScriptSource = async (manifest: PluginManifest): Promise<string> => {
  const runtime = manifest.runtime;
  if (runtime.kind !== 'script') throw new Error('Not a scripted plugin');
  if (!runtime.sourceUrl) throw new Error('Scripted plugin manifest is missing runtime.sourceUrl');
  const response = await fetch(runtime.sourceUrl);
  if (!response.ok) throw new Error(`Could not fetch plugin script (${response.status})`);
  const source = await response.text();
  if (source.length > MAX_SCRIPT_BYTES) throw new Error(`Plugin script too large (max ${MAX_SCRIPT_BYTES / 1000}KB)`);
  if (!source.includes('nanoNode')) throw new Error('Plugin script must define self.nanoNode.process');
  return source;
};

export const listInstalledPlugins = (): Promise<InstalledPlugin[]> =>
  listRecords<InstalledPlugin>(pluginStore);

export const installPlugin = async (
  manifest: PluginManifest,
  origin: InstalledPlugin['origin']
): Promise<InstalledPlugin> => {
  const source = manifest.runtime.kind === 'script' ? await fetchScriptSource(manifest) : undefined;
  const plugin: InstalledPlugin = {
    manifest,
    ...(source ? { source } : {}),
    origin,
    installedAt: new Date().toISOString(),
    enabled: true,
  };
  await putRecord(pluginStore, manifest.id, plugin);
  registerNode(toDefinition(manifest));
  return plugin;
};

export const uninstallPlugin = async (pluginId: string): Promise<void> => {
  await deleteRecord(pluginStore, pluginId);
  unregisterNode(pluginNodeType(pluginId));
};

export const setPluginEnabled = async (pluginId: string, enabled: boolean): Promise<void> => {
  const plugin = await getRecord<InstalledPlugin>(pluginStore, pluginId);
  if (!plugin) return;
  plugin.enabled = enabled;
  await putRecord(pluginStore, pluginId, plugin);
  if (enabled) registerNode(toDefinition(plugin.manifest));
  else unregisterNode(pluginNodeType(pluginId));
};

/** Boot-time: register all enabled installed plugins. */
export const loadInstalledPlugins = async (): Promise<void> => {
  try {
    const plugins = await listInstalledPlugins();
    for (const plugin of plugins) {
      if (!plugin.enabled) continue;
      try {
        // Re-validate stored manifests (schema may have tightened between versions)
        registerNode(toDefinition(parseManifest(plugin.manifest)));
      } catch (error) {
        console.warn(`Skipping plugin ${plugin.manifest?.id}:`, error);
      }
    }
  } catch (error) {
    console.warn('Failed to load plugins:', error);
  }
};

export const installFromUrl = async (url: string): Promise<InstalledPlugin> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not fetch manifest (${response.status})`);
  const manifest = parseManifest(await response.json());
  return installPlugin(manifest, 'url');
};

// ---- Registry browsing ----

export interface RegistryEntry {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  modelSizeMB?: number;
  manifestUrl: string;
}

export const fetchRegistryIndex = async (): Promise<RegistryEntry[]> => {
  const response = await fetch(REGISTRY_INDEX_URL);
  if (!response.ok) throw new Error(`Registry unavailable (${response.status})`);
  const index = await response.json();
  if (!Array.isArray(index?.plugins)) throw new Error('Malformed registry index');
  return index.plugins;
};

// ---- "Add node from Hugging Face URL" manifest generator ----

type TransformersTask = Extract<PluginManifest['runtime'], { kind: 'transformers-pipeline' }>['task'];

const HF_TASK_TEMPLATES: Record<string, { task: TransformersTask; icon: string; inputs: PortSpec[]; outputs: PortSpec[] }> = {
  'image-to-text': { task: 'image-to-text', icon: '📝', inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'prompt', type: 'text' }] },
  'image-classification': { task: 'image-classification', icon: '🏷️', inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'prompt', type: 'text' }] },
  'depth-estimation': { task: 'depth-estimation', icon: '🏔️', inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'result', type: 'image' }] },
  'image-segmentation': { task: 'image-segmentation', icon: '✂️', inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'result', type: 'image' }] },
  'background-removal': { task: 'background-removal', icon: '🪄', inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'result', type: 'image' }] },
  'image-to-image': { task: 'image-to-image', icon: '🖼️', inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'result', type: 'image' }] },
  'object-detection': { task: 'object-detection', icon: '🎯', inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'prompt', type: 'text' }] },
  'zero-shot-object-detection': { task: 'zero-shot-object-detection', icon: '🔎', inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'prompt', type: 'text' }] },
  'zero-shot-image-classification': { task: 'zero-shot-image-classification', icon: '🔖', inputs: [{ id: 'image', type: 'image' }], outputs: [{ id: 'prompt', type: 'text' }] },
};

export const generateManifestFromHuggingFace = async (modelUrlOrId: string): Promise<PluginManifest> => {
  const modelId = modelUrlOrId
    .replace(/^https?:\/\/huggingface\.co\//, '')
    .replace(/\/(tree|blob)\/.*$/, '')
    .replace(/\/$/, '');
  if (!/^[\w.-]+\/[\w.-]+$/.test(modelId)) throw new Error('Expected a Hugging Face model URL or org/model id');

  const response = await fetch(`https://huggingface.co/api/models/${modelId}`);
  if (!response.ok) throw new Error(`Model not found on Hugging Face (${response.status})`);
  const info = await response.json();

  const isTransformersJs = info.library_name === 'transformers.js' || (info.tags ?? []).includes('transformers.js') || (info.tags ?? []).includes('onnx');
  if (!isTransformersJs) {
    throw new Error('This model has no ONNX/Transformers.js weights — it cannot run in the browser.');
  }

  const pipelineTag: string = info.pipeline_tag;
  const template = HF_TASK_TEMPLATES[pipelineTag];
  if (!template) {
    throw new Error(`Task "${pipelineTag || 'unknown'}" isn't supported for auto-generated nodes yet.`);
  }

  const shortName = modelId.split('/')[1];
  const manifest: PluginManifest = parseManifest({
    format: 'nano-node/1',
    id: shortName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50),
    name: shortName.slice(0, 60),
    version: '1.0.0',
    description: `Auto-generated from huggingface.co/${modelId} (${pipelineTag})`,
    author: modelId.split('/')[0],
    homepage: `https://huggingface.co/${modelId}`,
    icon: template.icon,
    category: 'Community',
    badge: 'Local · Free',
    inputs: template.inputs,
    outputs: template.outputs,
    params: pipelineTag.startsWith('zero-shot')
      ? [{ kind: 'text', key: pipelineTag.includes('object') ? 'query' : 'labels', label: pipelineTag.includes('object') ? 'What to find' : 'Candidate labels (comma-separated)' }]
      : [],
    runtime: { kind: 'transformers-pipeline', task: template.task, model: modelId },
  });
  return manifest;
};
