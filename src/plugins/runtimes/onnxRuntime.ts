import { loadImageElement, imageToCanvas, type ProgressCallback } from '@/lib/localAi';
import type { PluginManifest } from '../types';
import type { RuntimeInputs, RuntimeOutput } from './transformersRuntime';

type OnnxRuntime = Extract<PluginManifest['runtime'], { kind: 'onnx' }>;

/**
 * Minimal generic ONNX image-to-image executor for manifest-declared models
 * (OpenModelDB upscalers/restorers, etc.). Presets:
 * - image-float01-chw: float32 CHW normalized to 0..1 (most SR/restoration models)
 * - image-uint8-chw: uint8 CHW (MI-GAN-style exports)
 * Output is assumed CHW image (same dtype family) at model-determined size.
 */
export const runOnnxModel = async (
  manifest: PluginManifest,
  runtime: OnnxRuntime,
  inputs: RuntimeInputs,
  _params: Record<string, unknown>,
  onProgress?: ProgressCallback
): Promise<RuntimeOutput> => {
  if (!inputs.image) throw new Error('Connect an image input');

  // ort is heavy — lazy chunk shared with the eraser
  const { getOrtSession, ort } = await import('@/lib/ortSession');
  const session = await getOrtSession(
    runtime.modelUrl,
    onProgress,
    `${manifest.name}${manifest.modelSizeMB ? ` (~${manifest.modelSizeMB}MB)` : ''}`
  );

  onProgress?.('Preparing image...');
  const image = await loadImageElement(inputs.image);
  const size = runtime.inputSize;
  const { canvas, ctx } = imageToCanvas(image, size);
  // Pad to exact square input if the model needs fixed dims
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const n = width * height;

  let tensor: import('onnxruntime-web').Tensor;
  if (runtime.preset === 'image-uint8-chw') {
    const data = new Uint8Array(3 * n);
    for (let i = 0; i < n; i++) {
      data[i] = imgData.data[i * 4];
      data[n + i] = imgData.data[i * 4 + 1];
      data[2 * n + i] = imgData.data[i * 4 + 2];
    }
    tensor = new ort.Tensor('uint8', data, [1, 3, height, width]);
  } else {
    const data = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      data[i] = imgData.data[i * 4] / 255;
      data[n + i] = imgData.data[i * 4 + 1] / 255;
      data[2 * n + i] = imgData.data[i * 4 + 2] / 255;
    }
    tensor = new ort.Tensor('float32', data, [1, 3, height, width]);
  }

  onProgress?.('Running model...');
  const results = await session.run({ [session.inputNames[0]]: tensor });
  const output = results[session.outputNames[0]];
  const [, , outH, outW] = output.dims as number[];
  const out = output.data as Float32Array | Uint8Array;
  const outN = outH * outW;

  // Detect output scale (0..1 float vs 0..255)
  let max = 0;
  const sample = Math.min(out.length, 10000);
  for (let i = 0; i < sample; i++) if ((out[i] as number) > max) max = out[i] as number;
  const scale = max > 2 ? 1 : 255;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d')!;
  const outImage = outCtx.createImageData(outW, outH);
  for (let i = 0; i < outN; i++) {
    outImage.data[i * 4] = Math.min(255, Math.max(0, (out[i] as number) * scale));
    outImage.data[i * 4 + 1] = Math.min(255, Math.max(0, (out[outN + i] as number) * scale));
    outImage.data[i * 4 + 2] = Math.min(255, Math.max(0, (out[2 * outN + i] as number) * scale));
    outImage.data[i * 4 + 3] = 255;
  }
  outCtx.putImageData(outImage, 0, 0);

  return { kind: 'image', value: outCanvas.toDataURL('image/png', 1.0) };
};
