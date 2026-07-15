import type { PluginManifest } from '../types';
import type { ProgressCallback } from '@/lib/localAi';
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
    case 'script':
      throw new Error('Scripted plugins (tier 2) are not enabled yet');
    default:
      throw new Error('Unknown plugin runtime');
  }
};
