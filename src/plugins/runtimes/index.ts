import type { InstalledPlugin, PluginManifest } from '../types';
import type { ProgressCallback } from '@/lib/localAi';
import { getRecord, pluginStore } from '@/lib/localDb';
import { runTransformersPipeline, type RuntimeInputs, type RuntimeOutput } from './transformersRuntime';
import { runFalEndpoint } from './falRuntime';
import { runOnnxModel } from './onnxRuntime';

export type { RuntimeInputs, RuntimeOutput };

export const executePlugin = async (
  manifest: PluginManifest,
  inputs: RuntimeInputs,
  params: Record<string, unknown>,
  onProgress?: ProgressCallback
): Promise<RuntimeOutput> => {
  const runtime = manifest.runtime;
  switch (runtime.kind) {
    case 'transformers-pipeline':
      return runTransformersPipeline(manifest, runtime, inputs, params, onProgress);
    case 'fal-endpoint':
      return runFalEndpoint(manifest, runtime, inputs, params, onProgress);
    case 'onnx':
      return runOnnxModel(manifest, runtime, inputs, params, onProgress);
    case 'script': {
      const installed = await getRecord<InstalledPlugin>(pluginStore, manifest.id);
      if (!installed?.source) throw new Error('Plugin script not found — reinstall the plugin');
      const { runInSandbox } = await import('../sandbox/host');
      return runInSandbox(manifest, installed.source, inputs, params, onProgress);
    }
    default:
      throw new Error('Unknown plugin runtime');
  }
};
