import { pipeline, RawImage } from '@huggingface/transformers';
import { cached, device, imageToCanvas, loadImageElement, rawImageToCanvas, type ProgressCallback } from '@/lib/localAi';
import type { PluginManifest } from '../types';

type TransformersRuntime = Extract<PluginManifest['runtime'], { kind: 'transformers-pipeline' }>;

export interface RuntimeInputs {
  image?: string;
  images?: string[];
  text?: string;
}

export type RuntimeOutput = { kind: 'image'; value: string } | { kind: 'text'; value: string };

/**
 * Generic executor for manifest-declared Transformers.js pipelines.
 * Uses the same singleton cache as built-in local AI, so a plugin model
 * downloads once and stays warm like any built-in.
 */
export const runTransformersPipeline = async (
  manifest: PluginManifest,
  runtime: TransformersRuntime,
  inputs: RuntimeInputs,
  params: Record<string, unknown>,
  onProgress?: ProgressCallback
): Promise<RuntimeOutput> => {
  onProgress?.(`Loading ${manifest.name} model${manifest.modelSizeMB ? ` (~${manifest.modelSizeMB}MB, one time)` : ''}...`);
  const pipe = await cached(`plugin:${runtime.task}:${runtime.model}`, () =>
    pipeline(runtime.task as Parameters<typeof pipeline>[0], runtime.model, {
      device: device(),
      ...(runtime.dtype ? { dtype: runtime.dtype as never } : {}),
    })
  );

  if (!inputs.image) throw new Error('Connect an image input');
  onProgress?.('Preparing image...');
  const image = await loadImageElement(inputs.image);
  const { canvas } = imageToCanvas(image);
  const dataUrl = canvas.toDataURL('image/png');

  onProgress?.('Running model...');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = pipe as any;

  switch (runtime.task) {
    case 'background-removal': {
      const result = await run(dataUrl);
      const raw = (Array.isArray(result) ? result[0] : result) as RawImage;
      if (!raw) throw new Error('Model returned no image');
      return { kind: 'image', value: rawImageToCanvas(raw).toDataURL('image/png', 1.0) };
    }
    case 'image-to-image':
    case 'depth-estimation': {
      const result = await run(dataUrl);
      const first = Array.isArray(result) ? result[0] : result;
      const raw = (first?.depth ?? first) as RawImage;
      if (!raw?.data) throw new Error('Model returned no image');
      return { kind: 'image', value: rawImageToCanvas(raw).toDataURL('image/png', 1.0) };
    }
    case 'image-to-text': {
      const result = await run(dataUrl, runtime.options ?? {});
      const first = Array.isArray(result) ? result[0] : result;
      const text = first?.generated_text?.trim();
      if (!text) throw new Error('Model returned no text');
      return { kind: 'text', value: text };
    }
    case 'image-classification': {
      const result = await run(dataUrl, { top_k: 5, ...(runtime.options ?? {}) });
      const items = (Array.isArray(result) ? result : [result]) as Array<{ label: string; score: number }>;
      const text = items.map((r) => `${r.label}: ${(r.score * 100).toFixed(1)}%`).join('\n');
      return { kind: 'text', value: text };
    }
    case 'zero-shot-image-classification': {
      const labels = String(params.labels ?? inputs.text ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      if (!labels.length) throw new Error('Provide comma-separated candidate labels');
      const result = await run(dataUrl, labels);
      const items = (Array.isArray(result) ? result : [result]) as Array<{ label: string; score: number }>;
      const text = items.map((r) => `${r.label}: ${(r.score * 100).toFixed(1)}%`).join('\n');
      return { kind: 'text', value: text };
    }
    case 'object-detection':
    case 'zero-shot-object-detection': {
      const args = runtime.task === 'zero-shot-object-detection'
        ? [dataUrl, String(params.query ?? inputs.text ?? 'object').split(',').map((s) => s.trim())]
        : [dataUrl];
      const result = await run(...args);
      const items = (Array.isArray(result) ? result : [result]) as Array<{ label: string; score: number }>;
      const text = items.slice(0, 10).map((r) => `${r.label}: ${(r.score * 100).toFixed(1)}%`).join('\n') || 'Nothing detected';
      return { kind: 'text', value: text };
    }
    case 'image-segmentation': {
      const result = await run(dataUrl);
      const first = (Array.isArray(result) ? result[0] : result) as { mask?: { data: Uint8Array | number[] } };
      if (!first?.mask) throw new Error('Model returned no mask');
      const { applyMaskToCanvas } = await import('@/lib/localAi');
      return { kind: 'image', value: applyMaskToCanvas(canvas, first.mask as { data: Uint8Array }) };
    }
    default:
      throw new Error(`Unsupported task: ${runtime.task}`);
  }
};
