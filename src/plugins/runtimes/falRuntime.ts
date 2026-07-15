import { fal } from '@fal-ai/client';
import { getFalKey } from '@/lib/settingsStore';
import { urlToDataUrl, FalKeyMissingError } from '@/lib/falClient';
import type { ProgressCallback } from '@/lib/localAi';
import type { PluginManifest } from '../types';
import type { RuntimeInputs, RuntimeOutput } from './transformersRuntime';

type FalRuntime = Extract<PluginManifest['runtime'], { kind: 'fal-endpoint' }>;

const resolveSource = (
  source: string,
  inputs: RuntimeInputs,
  params: Record<string, unknown>
): unknown => {
  if (source === '$image') return inputs.image;
  if (source === '$images') return inputs.images ?? (inputs.image ? [inputs.image] : undefined);
  if (source === '$text') return inputs.text;
  if (source.startsWith('$param.')) return params[source.slice('$param.'.length)];
  // Literal value
  return source;
};

const getPath = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    const index = /^\d+$/.test(key) ? Number(key) : key;
    return (acc as Record<string | number, unknown>)[index];
  }, obj);

/** Executes a manifest-declared fal.ai endpoint using the user's BYOK key. */
export const runFalEndpoint = async (
  manifest: PluginManifest,
  runtime: FalRuntime,
  inputs: RuntimeInputs,
  params: Record<string, unknown>,
  onProgress?: ProgressCallback
): Promise<RuntimeOutput> => {
  const key = getFalKey();
  if (!key) throw new FalKeyMissingError();
  fal.config({ credentials: key });

  const input: Record<string, unknown> = {};
  for (const [field, source] of Object.entries(runtime.inputMap)) {
    const value = resolveSource(source, inputs, params);
    if (value !== undefined && value !== '') input[field] = value;
  }

  onProgress?.(`Running ${manifest.name} on fal.ai...`);
  const result = await fal.subscribe(runtime.endpoint, { input });
  const value = getPath(result.data, runtime.outputPath);
  if (value == null) throw new Error(`No output at "${runtime.outputPath}"`);

  if (runtime.outputKind === 'text') {
    return { kind: 'text', value: String(value) };
  }
  onProgress?.('Downloading result...');
  return { kind: 'image', value: await urlToDataUrl(String(value)) };
};
