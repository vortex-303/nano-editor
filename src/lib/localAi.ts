import {
  pipeline,
  env,
  AutoProcessor,
  AutoTokenizer,
  Florence2ForConditionalGeneration,
  SamModel,
  RawImage,
  type ImageSegmentationPipeline,
  type DepthEstimationPipeline,
  type ImageToTextPipeline,
  type ImageToImagePipeline,
} from '@huggingface/transformers';

// All models download from the HF Hub on first use and are cached by the browser
env.allowLocalModels = false;
env.useBrowserCache = true;

export type ProgressCallback = (message: string) => void;

export const hasWebGPU = (): boolean => typeof navigator !== 'undefined' && 'gpu' in navigator;

const device = (): 'webgpu' | 'wasm' => (hasWebGPU() ? 'webgpu' : 'wasm');

// Singleton cache: each model loads once per session, then stays warm
const pipelineCache = new Map<string, Promise<unknown>>();

const cached = <T>(key: string, factory: () => Promise<T>): Promise<T> => {
  if (!pipelineCache.has(key)) {
    const promise = factory().catch((error) => {
      pipelineCache.delete(key);
      throw error;
    });
    pipelineCache.set(key, promise);
  }
  return pipelineCache.get(key) as Promise<T>;
};

export const MAX_LOCAL_IMAGE_DIMENSION = 1024;

export const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });

export const imageToCanvas = (
  image: HTMLImageElement,
  maxDimension = MAX_LOCAL_IMAGE_DIMENSION
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
  let width = image.naturalWidth;
  let height = image.naturalHeight;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.drawImage(image, 0, 0, width, height);
  return { canvas, ctx };
};

const rawImageToCanvas = (raw: RawImage): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = raw.width;
  canvas.height = raw.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  const imageData = ctx.createImageData(raw.width, raw.height);
  const { data, channels } = raw;
  for (let i = 0; i < raw.width * raw.height; i++) {
    const src = i * channels;
    imageData.data[i * 4] = data[src];
    imageData.data[i * 4 + 1] = channels >= 3 ? data[src + 1] : data[src];
    imageData.data[i * 4 + 2] = channels >= 3 ? data[src + 2] : data[src];
    imageData.data[i * 4 + 3] = channels === 4 ? data[src + 3] : 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

// --- Background removal (briaai/RMBG-1.4) ---

const getSegmenter = () =>
  cached('rmbg', () =>
    pipeline('image-segmentation', 'briaai/RMBG-1.4', {
      device: device(),
      dtype: device() === 'webgpu' ? 'fp16' : 'q8',
    })
  ) as Promise<ImageSegmentationPipeline>;

export const applyMaskToCanvas = (
  canvas: HTMLCanvasElement,
  mask: { data: Uint8Array | Float32Array | number[] }
): string => {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = canvas.width;
  outputCanvas.height = canvas.height;
  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) throw new Error('Could not get output canvas context');

  outputCtx.drawImage(canvas, 0, 0);
  const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const data = outputImageData.data;
  for (let i = 0; i < mask.data.length; i++) {
    data[i * 4 + 3] = Math.round((mask.data[i] as number) * 255);
  }
  outputCtx.putImageData(outputImageData, 0, 0);
  return outputCanvas.toDataURL('image/png', 1.0);
};

export const removeBackground = async (imageSrc: string, onProgress?: ProgressCallback): Promise<string> => {
  onProgress?.('Loading RMBG V1.4 model...');
  const segmenter = await getSegmenter();

  onProgress?.('Processing image...');
  const image = await loadImageElement(imageSrc);
  const { canvas } = imageToCanvas(image);
  const imageData = canvas.toDataURL('image/jpeg', 0.8);

  onProgress?.('Removing background...');
  const result = await segmenter(imageData);
  if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
    throw new Error('Invalid segmentation result from RMBG');
  }
  return applyMaskToCanvas(canvas, result[0].mask);
};

// --- Super resolution (Swin2SR, 2x and 4x) ---

export type LocalUpscaleFactor = 2 | 4;

const SWIN2SR_MODELS: Record<LocalUpscaleFactor, string> = {
  // Xenova ONNX ports — the original caidas/ repos are PyTorch-only and fail in Transformers.js
  2: 'Xenova/swin2SR-classical-sr-x2-64',
  // BSRGAN-trained real-world variant — best for photos/AI images (vs the classical x4)
  4: 'Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr',
};

const getUpscaler = (scale: LocalUpscaleFactor) =>
  cached(`swin2sr-x${scale}`, () =>
    pipeline('image-to-image', SWIN2SR_MODELS[scale], {
      device: device(),
      dtype: 'fp32',
    })
  ) as Promise<ImageToImagePipeline>;

export const superResolution = async (
  imageSrc: string,
  scale: LocalUpscaleFactor = 2,
  onProgress?: ProgressCallback
): Promise<string> => {
  const image = await loadImageElement(imageSrc);
  // Swin2SR is heavy; cap input so output stays manageable (2x → ~1024, 4x → ~1536)
  const maxInput = scale === 4 ? 384 : 512;
  const { canvas } = imageToCanvas(image, maxInput);
  try {
    onProgress?.(`Loading Swin2SR ${scale}x model...`);
    const upscaler = await getUpscaler(scale);
    onProgress?.(`Upscaling with AI (${scale}x resolution)...`);
    const result = await upscaler(canvas.toDataURL('image/png'));
    const raw = (Array.isArray(result) ? result[0] : result) as RawImage;
    return rawImageToCanvas(raw).toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Swin2SR failed, using high-quality browser upscaling:', error);
    onProgress?.('Model unavailable — applying high-quality browser upscaling...');
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width * scale;
    outputCanvas.height = canvas.height * scale;
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) throw new Error('Could not get output canvas context');
    outputCtx.imageSmoothingEnabled = true;
    outputCtx.imageSmoothingQuality = 'high';
    outputCtx.drawImage(image, 0, 0, outputCanvas.width, outputCanvas.height);
    return outputCanvas.toDataURL('image/png', 1.0);
  }
};

export const superResolution2x = (imageSrc: string, onProgress?: ProgressCallback): Promise<string> =>
  superResolution(imageSrc, 2, onProgress);

// --- Image captioning (Florence-2, BLIP fallback) ---

interface Florence2Bundle {
  model: Florence2ForConditionalGeneration;
  processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
  tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
}

const getFlorence2 = () =>
  cached<Florence2Bundle>('florence2', async () => {
    const modelId = 'onnx-community/Florence-2-base-ft';
    const [model, processor, tokenizer] = await Promise.all([
      Florence2ForConditionalGeneration.from_pretrained(modelId, {
        device: device(),
        dtype: device() === 'webgpu'
          ? { vision_encoder: 'fp16', encoder_model: 'fp16', decoder_model_merged: 'q4' }
          : 'q8',
      }),
      AutoProcessor.from_pretrained(modelId),
      AutoTokenizer.from_pretrained(modelId),
    ]);
    return { model, processor, tokenizer };
  });

const getBlipCaptioner = () =>
  cached('blip', () =>
    pipeline('image-to-text', 'Xenova/blip-image-captioning-base', { device: device() })
  ) as Promise<ImageToTextPipeline>;

export const describeImage = async (imageSrc: string, onProgress?: ProgressCallback): Promise<string> => {
  const image = await loadImageElement(imageSrc);
  const { canvas } = imageToCanvas(image);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

  try {
    onProgress?.('Loading Florence-2 model (first run downloads ~250MB)...');
    const { model, processor, tokenizer } = await getFlorence2();

    onProgress?.('Analyzing image...');
    const task = '<MORE_DETAILED_CAPTION>';
    const raw = await RawImage.fromURL(dataUrl);
    const visionInputs = await processor(raw);
    const textInputs = tokenizer(task);

    const generatedIds = await model.generate({
      ...textInputs,
      ...visionInputs,
      max_new_tokens: 256,
    });
    const generatedText = tokenizer.batch_decode(generatedIds as never, { skip_special_tokens: false })[0];
    const parsed = processor.post_process_generation(generatedText, task, raw.size);
    const caption = (parsed as Record<string, string>)[task];
    if (!caption?.trim()) throw new Error('Empty caption');
    return caption.trim();
  } catch (error) {
    console.warn('Florence-2 captioning failed, falling back to BLIP:', error);
    onProgress?.('Falling back to BLIP captioning model...');
    const captioner = await getBlipCaptioner();
    const result = await captioner(dataUrl);
    const caption = (Array.isArray(result) ? result[0] : result) as { generated_text?: string };
    if (!caption?.generated_text) throw new Error('Image captioning failed');
    return caption.generated_text.trim();
  }
};

// --- Depth estimation (Depth Anything V2 small) ---

const getDepthEstimator = () =>
  cached('depth', () =>
    pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', { device: device() })
  ) as Promise<DepthEstimationPipeline>;

export const estimateDepth = async (imageSrc: string, onProgress?: ProgressCallback): Promise<string> => {
  onProgress?.('Loading Depth Anything V2 model...');
  const estimator = await getDepthEstimator();

  onProgress?.('Estimating depth...');
  const image = await loadImageElement(imageSrc);
  const { canvas } = imageToCanvas(image);
  const result = await estimator(canvas.toDataURL('image/jpeg', 0.9));
  const depth = (Array.isArray(result) ? result[0] : result as { depth?: RawImage }).depth;
  if (!depth) throw new Error('Depth estimation returned no result');
  return rawImageToCanvas(depth).toDataURL('image/png', 1.0);
};

// --- Click-to-mask segmentation (SlimSAM) ---

interface SamBundle {
  model: SamModel;
  processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
}

const getSam = () =>
  cached<SamBundle>('slimsam', async () => {
    const modelId = 'Xenova/slimsam-77-uniform';
    const [model, processor] = await Promise.all([
      SamModel.from_pretrained(modelId, { device: device(), dtype: 'fp16' }),
      AutoProcessor.from_pretrained(modelId),
    ]);
    return { model, processor };
  });

export interface SamPoint {
  /** x/y in 0..1 relative coordinates of the displayed image */
  x: number;
  y: number;
  /** true = include this region, false = exclude */
  positive: boolean;
}

export const segmentWithPoints = async (
  imageSrc: string,
  points: SamPoint[],
  onProgress?: ProgressCallback
): Promise<{ cutout: string; mask: string }> => {
  if (!points.length) throw new Error('Click at least one point on the image');

  onProgress?.('Loading SlimSAM model...');
  const { model, processor } = await getSam();

  onProgress?.('Segmenting...');
  const image = await loadImageElement(imageSrc);
  const { canvas } = imageToCanvas(image);
  const raw = await RawImage.fromURL(canvas.toDataURL('image/png'));

  const inputPoints = [[points.map((p) => [p.x * raw.width, p.y * raw.height])]];
  const inputLabels = [[points.map((p) => (p.positive ? 1 : 0))]];

  const inputs = await processor(raw, { input_points: inputPoints, input_labels: inputLabels });
  const outputs = await model(inputs);

  const masks = await processor.post_process_masks(
    outputs.pred_masks,
    inputs.original_sizes,
    inputs.reshaped_input_sizes
  );
  const scores = outputs.iou_scores.data as Float32Array;

  // Pick the highest-scoring of the 3 proposed masks
  let best = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;

  const maskTensor = masks[0][0]; // [3, h, w] boolean-ish tensor
  const [, h, w] = maskTensor.dims as [number, number, number];
  const maskData = maskTensor.data as Uint8Array;
  const offset = best * h * w;

  // Build alpha mask at model resolution, then scale to canvas size
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) throw new Error('Could not get mask canvas context');
  const maskImage = maskCtx.createImageData(w, h);
  for (let i = 0; i < h * w; i++) {
    const on = maskData[offset + i] ? 255 : 0;
    maskImage.data[i * 4] = on;
    maskImage.data[i * 4 + 1] = on;
    maskImage.data[i * 4 + 2] = on;
    maskImage.data[i * 4 + 3] = 255;
  }
  maskCtx.putImageData(maskImage, 0, 0);

  // Cutout: original image with mask as alpha channel
  const scaledMask = document.createElement('canvas');
  scaledMask.width = canvas.width;
  scaledMask.height = canvas.height;
  const scaledCtx = scaledMask.getContext('2d');
  if (!scaledCtx) throw new Error('Could not get canvas context');
  scaledCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
  const maskPixels = scaledCtx.getImageData(0, 0, canvas.width, canvas.height).data;

  const cutoutCanvas = document.createElement('canvas');
  cutoutCanvas.width = canvas.width;
  cutoutCanvas.height = canvas.height;
  const cutoutCtx = cutoutCanvas.getContext('2d');
  if (!cutoutCtx) throw new Error('Could not get canvas context');
  cutoutCtx.drawImage(canvas, 0, 0);
  const cutoutImage = cutoutCtx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < canvas.width * canvas.height; i++) {
    cutoutImage.data[i * 4 + 3] = maskPixels[i * 4];
  }
  cutoutCtx.putImageData(cutoutImage, 0, 0);

  return {
    cutout: cutoutCanvas.toDataURL('image/png', 1.0),
    mask: scaledMask.toDataURL('image/png', 1.0),
  };
};
