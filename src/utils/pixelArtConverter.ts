// Pixel Art Converter Utility
// Implements proper pixel-art conversion pipeline: downscale → quantize → upscale

export interface PixelArtOptions {
  targetWidth: number;
  palette: 'dawnbringer16' | 'gameboy' | 'nes' | 'none';
  dither: boolean;
  outputScale: number;
  keepAspectRatio: boolean;
}

// Color palettes (RGB tuples)
export const PALETTES = {
  dawnbringer16: [
    [20, 12, 28], [68, 36, 52], [48, 52, 109], [78, 74, 78],
    [133, 76, 48], [52, 101, 36], [208, 70, 72], [117, 113, 97],
    [89, 125, 206], [210, 125, 44], [133, 149, 161], [109, 170, 44],
    [210, 170, 153], [109, 194, 202], [218, 212, 94], [222, 238, 214]
  ],
  gameboy: [
    [15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]
  ],
  nes: [
    [0, 0, 0], [252, 252, 252], [248, 248, 248], [188, 188, 188],
    [0, 0, 252], [0, 88, 248], [0, 120, 248], [0, 168, 0],
    [216, 0, 204], [228, 0, 88], [248, 56, 0], [252, 160, 68],
    [248, 184, 0], [184, 248, 24], [88, 216, 84], [88, 248, 152]
  ],
  none: [] // Original colors
};

// Euclidean distance in RGB space
function colorDistance(c1: number[], c2: number[]): number {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Find nearest color in palette
function nearestColor(rgb: number[], palette: number[][]): number[] {
  let nearest = palette[0];
  let minDist = Infinity;
  
  for (const color of palette) {
    const dist = colorDistance(rgb, color);
    if (dist < minDist) {
      minDist = dist;
      nearest = color;
    }
  }
  
  return nearest;
}

// Floyd-Steinberg dithering
function applyDithering(
  imageData: ImageData,
  palette: number[][]
): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);
  output.data.set(data);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      
      const oldR = output.data[i];
      const oldG = output.data[i + 1];
      const oldB = output.data[i + 2];
      
      const newColor = nearestColor([oldR, oldG, oldB], palette);
      output.data[i] = newColor[0];
      output.data[i + 1] = newColor[1];
      output.data[i + 2] = newColor[2];
      
      const errR = oldR - newColor[0];
      const errG = oldG - newColor[1];
      const errB = oldB - newColor[2];
      
      // Distribute error to neighboring pixels
      const distributeError = (dx: number, dy: number, factor: number) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const ni = (ny * width + nx) * 4;
          output.data[ni] += errR * factor;
          output.data[ni + 1] += errG * factor;
          output.data[ni + 2] += errB * factor;
        }
      };
      
      distributeError(1, 0, 7/16);
      distributeError(-1, 1, 3/16);
      distributeError(0, 1, 5/16);
      distributeError(1, 1, 1/16);
    }
  }
  
  return output;
}

// Quantize image to palette
function quantizeToPalette(
  imageData: ImageData,
  palette: number[][],
  dither: boolean
): ImageData {
  if (palette.length === 0) return imageData; // No quantization
  
  if (dither) {
    return applyDithering(imageData, palette);
  }
  
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);
  
  for (let i = 0; i < data.length; i += 4) {
    const rgb = [data[i], data[i + 1], data[i + 2]];
    const newColor = nearestColor(rgb, palette);
    output.data[i] = newColor[0];
    output.data[i + 1] = newColor[1];
    output.data[i + 2] = newColor[2];
    output.data[i + 3] = data[i + 3]; // Preserve alpha
  }
  
  return output;
}

// Downscale image to target width
function downscaleImage(
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number,
  keepAspectRatio: boolean
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  
  const aspectRatio = sourceCanvas.height / sourceCanvas.width;
  
  if (keepAspectRatio) {
    canvas.width = targetWidth;
    canvas.height = Math.round(targetWidth * aspectRatio);
  } else {
    canvas.width = targetWidth;
    canvas.height = targetWidth;
  }
  
  // Disable smoothing for pixel-perfect downscaling
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  
  return canvas;
}

// Upscale image with crisp pixels
function upscaleImage(
  sourceCanvas: HTMLCanvasElement,
  scale: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = sourceCanvas.width * scale;
  canvas.height = sourceCanvas.height * scale;
  
  // CRITICAL: Disable smoothing to preserve hard pixel edges
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  
  return canvas;
}

// Load image from various sources
export async function loadImage(source: string | File | HTMLImageElement): Promise<HTMLImageElement> {
  if (source instanceof HTMLImageElement) {
    return source;
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = reject;
    
    if (typeof source === 'string') {
      img.src = source;
    } else {
      const url = URL.createObjectURL(source);
      img.src = url;
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
    }
  });
}

// Main conversion function
export async function convertToPixelArt(
  source: string | File | HTMLImageElement,
  options: PixelArtOptions
): Promise<{ canvas: HTMLCanvasElement; dataUrl: string }> {
  const {
    targetWidth,
    palette: paletteName,
    dither,
    outputScale,
    keepAspectRatio
  } = options;
  
  // Load image
  const img = await loadImage(source);
  
  // Step 1: Draw to canvas
  const sourceCanvas = document.createElement('canvas');
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })!;
  sourceCanvas.width = img.width;
  sourceCanvas.height = img.height;
  sourceCtx.imageSmoothingEnabled = false;
  sourceCtx.drawImage(img, 0, 0);
  
  // Step 2: Downscale to target resolution
  const downscaledCanvas = downscaleImage(sourceCanvas, targetWidth, keepAspectRatio);
  const downscaledCtx = downscaledCanvas.getContext('2d', { willReadFrequently: true })!;
  
  // Step 3: Quantize to palette (if selected)
  if (paletteName !== 'none') {
    const palette = PALETTES[paletteName];
    const imageData = downscaledCtx.getImageData(0, 0, downscaledCanvas.width, downscaledCanvas.height);
    const quantized = quantizeToPalette(imageData, palette, dither);
    downscaledCtx.putImageData(quantized, 0, 0);
  }
  
  // Step 4: Upscale with no smoothing
  const outputCanvas = upscaleImage(downscaledCanvas, outputScale);
  
  // Generate data URL
  const dataUrl = outputCanvas.toDataURL('image/png');
  
  return { canvas: outputCanvas, dataUrl };
}
