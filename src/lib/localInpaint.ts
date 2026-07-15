import * as ort from 'onnxruntime-web';
import { loadImageElement } from './localAi';
import type { ProgressCallback } from './localAi';

// LaMa (Large Mask Inpainting) via onnxruntime-web.
// The model is fixed at 512x512: we inpaint a downscaled copy and composite the
// repaired region back into the full-resolution image with a feathered mask.
const LAMA_URL = 'https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx';
const MIGAN_URL = 'https://huggingface.co/anyisalin/migan-onnx/resolve/main/onnx/migan_pipeline.onnx';
const MODEL_CACHE = 'nano-local-models';
const LAMA_SIZE = 512;

// Single-threaded WASM: avoids needing cross-origin isolation (SharedArrayBuffer)
ort.env.wasm.numThreads = 1;
// Vite doesn't serve ort's .wasm/.mjs runtime files (the SPA fallback returns
// index.html, which fails the wasm magic-word check) — load them from the CDN,
// pinned to the installed package version.
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

const sessionPromises = new Map<string, Promise<ort.InferenceSession>>();

const fetchModelCached = async (url: string, onProgress?: ProgressCallback): Promise<ArrayBuffer> => {
  try {
    const cache = await caches.open(MODEL_CACHE);
    const hit = await cache.match(url);
    if (hit) {
      onProgress?.('Loading LaMa model from cache...');
      return await hit.arrayBuffer();
    }
    onProgress?.('Downloading LaMa model (~200MB, one time only)...');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Model download failed (${response.status})`);
    await cache.put(url, response.clone());
    return await response.arrayBuffer();
  } catch (error) {
    // Cache API unavailable (e.g. private mode) — plain fetch
    if (error instanceof Error && error.message.includes('download failed')) throw error;
    onProgress?.('Downloading LaMa model (~200MB)...');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Model download failed (${response.status})`);
    return await response.arrayBuffer();
  }
};

const getSession = (url: string, onProgress?: ProgressCallback): Promise<ort.InferenceSession> => {
  if (!sessionPromises.has(url)) {
    const promise = (async () => {
      const buffer = await fetchModelCached(url, onProgress);
      onProgress?.('Initializing inpainting engine...');
      return await ort.InferenceSession.create(buffer, { executionProviders: ['wasm'] });
    })().catch((error) => {
      sessionPromises.delete(url);
      throw error;
    });
    sessionPromises.set(url, promise);
  }
  return sessionPromises.get(url)!;
};

const drawToSize = (source: CanvasImageSource, width: number, height: number): CanvasRenderingContext2D => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.drawImage(source, 0, 0, width, height);
  return ctx;
};

/** Dilate + feather a binary mask. Returns {binary, feathered} canvases at the given size. */
const prepareMask = (maskImage: HTMLImageElement, width: number, height: number, dilatePx: number) => {
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = width;
  blurCanvas.height = height;
  const blurCtx = blurCanvas.getContext('2d', { willReadFrequently: true });
  if (!blurCtx) throw new Error('Could not get canvas context');
  blurCtx.filter = `blur(${dilatePx}px)`;
  blurCtx.drawImage(maskImage, 0, 0, width, height);
  blurCtx.filter = 'none';
  const blurred = blurCtx.getImageData(0, 0, width, height);

  // Binary dilated mask: any pixel the blur touched becomes part of the hole
  const binCanvas = document.createElement('canvas');
  binCanvas.width = width;
  binCanvas.height = height;
  const binCtx = binCanvas.getContext('2d', { willReadFrequently: true })!;
  const bin = binCtx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const on = blurred.data[i * 4] > 8 ? 255 : 0;
    bin.data[i * 4] = on;
    bin.data[i * 4 + 1] = on;
    bin.data[i * 4 + 2] = on;
    bin.data[i * 4 + 3] = 255;
  }
  binCtx.putImageData(bin, 0, 0);

  return { binary: binCanvas, feathered: blurred };
};

/**
 * Erase the masked region from an image using LaMa inpainting.
 * @param imageSrc data/blob/http URL of the image
 * @param maskSrc white-on-black mask (white = remove), same aspect as image
 * @returns data URL of the inpainted image at original resolution
 */
export const eraseWithLama = async (
  imageSrc: string,
  maskSrc: string,
  onProgress?: ProgressCallback
): Promise<string> => {
  const [image, maskImage] = await Promise.all([loadImageElement(imageSrc), loadImageElement(maskSrc)]);
  const session = await getSession(LAMA_URL, onProgress);

  onProgress?.('Preparing image...');
  const imgCtx = drawToSize(image, LAMA_SIZE, LAMA_SIZE);
  const imgData = imgCtx.getImageData(0, 0, LAMA_SIZE, LAMA_SIZE);
  const { binary, feathered } = prepareMask(maskImage, LAMA_SIZE, LAMA_SIZE, 6);
  const maskData = binary.getContext('2d')!.getImageData(0, 0, LAMA_SIZE, LAMA_SIZE);

  const n = LAMA_SIZE * LAMA_SIZE;
  const imageTensor = new Float32Array(3 * n);
  const maskTensor = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    imageTensor[i] = imgData.data[i * 4] / 255;
    imageTensor[n + i] = imgData.data[i * 4 + 1] / 255;
    imageTensor[2 * n + i] = imgData.data[i * 4 + 2] / 255;
    maskTensor[i] = maskData.data[i * 4] > 127 ? 1 : 0;
  }

  onProgress?.('Erasing (LaMa inpainting)...');
  const feeds: Record<string, ort.Tensor> = {
    [session.inputNames[0]]: new ort.Tensor('float32', imageTensor, [1, 3, LAMA_SIZE, LAMA_SIZE]),
    [session.inputNames[1]]: new ort.Tensor('float32', maskTensor, [1, 1, LAMA_SIZE, LAMA_SIZE]),
  };
  const results = await session.run(feeds);
  const output = results[session.outputNames[0]];
  const out = output.data as Float32Array;

  // Output may be 0..1 or 0..255 depending on export — detect and normalize
  let max = 0;
  for (let i = 0; i < Math.min(out.length, 10000); i++) if (out[i] > max) max = out[i];
  const scale = max > 2 ? 1 : 255;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = LAMA_SIZE;
  outCanvas.height = LAMA_SIZE;
  const outCtx = outCanvas.getContext('2d')!;
  const outImage = outCtx.createImageData(LAMA_SIZE, LAMA_SIZE);
  for (let i = 0; i < n; i++) {
    outImage.data[i * 4] = Math.min(255, Math.max(0, out[i] * scale));
    outImage.data[i * 4 + 1] = Math.min(255, Math.max(0, out[n + i] * scale));
    outImage.data[i * 4 + 2] = Math.min(255, Math.max(0, out[2 * n + i] * scale));
    outImage.data[i * 4 + 3] = 255;
  }
  outCtx.putImageData(outImage, 0, 0);

  onProgress?.('Compositing result...');
  return compositePatch(image, outCanvas, feathered);
};

/**
 * Keep the original full-res image; paste the inpainted 512px patch (scaled
 * back up) only where the feathered mask is active.
 */
const compositePatch = (image: HTMLImageElement, patchCanvas: HTMLCanvasElement, feathered: ImageData): string => {
  const width = image.naturalWidth;
  const height = image.naturalHeight;

  const patchCtx = drawToSize(patchCanvas, width, height);
  const patch = patchCtx.getImageData(0, 0, width, height);

  // Scale the feathered mask up to full resolution
  const featherCanvas = document.createElement('canvas');
  featherCanvas.width = feathered.width;
  featherCanvas.height = feathered.height;
  featherCanvas.getContext('2d')!.putImageData(feathered, 0, 0);
  const featherFullCtx = drawToSize(featherCanvas, width, height);
  const featherFull = featherFullCtx.getImageData(0, 0, width, height);

  const finalCtx = drawToSize(image, width, height);
  const final = finalCtx.getImageData(0, 0, width, height);
  for (let i = 0; i < width * height; i++) {
    const a = featherFull.data[i * 4] / 255;
    if (a > 0) {
      final.data[i * 4] = final.data[i * 4] * (1 - a) + patch.data[i * 4] * a;
      final.data[i * 4 + 1] = final.data[i * 4 + 1] * (1 - a) + patch.data[i * 4 + 1] * a;
      final.data[i * 4 + 2] = final.data[i * 4 + 2] * (1 - a) + patch.data[i * 4 + 2] * a;
    }
  }
  finalCtx.putImageData(final, 0, 0);

  return finalCtx.canvas.toDataURL('image/png', 1.0);
};

/**
 * Fast object erase using MI-GAN (~27MB vs LaMa's ~200MB).
 * MI-GAN's pipeline model takes uint8 tensors and a mask where 255 = keep
 * and 0 = hole (inverse of LaMa), and returns the composited uint8 image.
 */
export const eraseWithMiGan = async (
  imageSrc: string,
  maskSrc: string,
  onProgress?: ProgressCallback
): Promise<string> => {
  const [image, maskImage] = await Promise.all([loadImageElement(imageSrc), loadImageElement(maskSrc)]);
  const session = await getSession(MIGAN_URL, onProgress);

  onProgress?.('Preparing image...');
  const imgCtx = drawToSize(image, LAMA_SIZE, LAMA_SIZE);
  const imgData = imgCtx.getImageData(0, 0, LAMA_SIZE, LAMA_SIZE);
  const { binary, feathered } = prepareMask(maskImage, LAMA_SIZE, LAMA_SIZE, 6);
  const maskData = binary.getContext('2d')!.getImageData(0, 0, LAMA_SIZE, LAMA_SIZE);

  const n = LAMA_SIZE * LAMA_SIZE;
  const imageTensor = new Uint8Array(3 * n);
  const maskTensor = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    imageTensor[i] = imgData.data[i * 4];
    imageTensor[n + i] = imgData.data[i * 4 + 1];
    imageTensor[2 * n + i] = imgData.data[i * 4 + 2];
    // Our mask is white-on-black (white = remove); MI-GAN wants 0 in the hole
    maskTensor[i] = maskData.data[i * 4] > 127 ? 0 : 255;
  }

  onProgress?.('Erasing (MI-GAN fast inpainting)...');
  const feeds: Record<string, ort.Tensor> = {
    [session.inputNames[0]]: new ort.Tensor('uint8', imageTensor, [1, 3, LAMA_SIZE, LAMA_SIZE]),
    [session.inputNames[1]]: new ort.Tensor('uint8', maskTensor, [1, 1, LAMA_SIZE, LAMA_SIZE]),
  };
  const results = await session.run(feeds);
  const out = results[session.outputNames[0]].data as Uint8Array;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = LAMA_SIZE;
  outCanvas.height = LAMA_SIZE;
  const outCtx = outCanvas.getContext('2d')!;
  const outImage = outCtx.createImageData(LAMA_SIZE, LAMA_SIZE);
  for (let i = 0; i < n; i++) {
    outImage.data[i * 4] = out[i];
    outImage.data[i * 4 + 1] = out[n + i];
    outImage.data[i * 4 + 2] = out[2 * n + i];
    outImage.data[i * 4 + 3] = 255;
  }
  outCtx.putImageData(outImage, 0, 0);

  onProgress?.('Compositing result...');
  return compositePatch(image, outCanvas, feathered);
};
