import {
  Output,
  BufferTarget,
  Mp4OutputFormat,
  WebMOutputFormat,
  CanvasSource,
  QUALITY_HIGH,
} from 'mediabunny';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export type ExportFormat = 'mp4' | 'webm' | 'gif';

export const webCodecsAvailable = (): boolean => typeof VideoEncoder !== 'undefined';

interface ExportOptions {
  canvas: HTMLCanvasElement;
  /** Deterministically render the animation at time t (seconds) */
  renderFrame: (tSec: number) => void;
  durationSec: number;
  fps: number;
  format: ExportFormat;
  onProgress?: (message: string) => void;
}

/**
 * Frame-exact export: renders each frame deterministically and encodes with
 * exact timestamps (WebCodecs via Mediabunny for MP4/WebM, gifenc for GIF).
 * Unlike MediaRecorder's realtime capture, no frames are dropped and timing
 * is precise regardless of render speed.
 */
export const exportCanvasAnimation = async ({
  canvas,
  renderFrame,
  durationSec,
  fps,
  format,
  onProgress,
}: ExportOptions): Promise<Blob> => {
  const totalFrames = Math.round(durationSec * fps);

  if (format === 'gif') {
    // GIF: downscale to keep size sane, quantize per frame
    const maxWidth = 480;
    const scale = Math.min(1, maxWidth / canvas.width);
    const width = Math.round(canvas.width * scale);
    const height = Math.round(canvas.height * scale);
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = width;
    frameCanvas.height = height;
    const ctx = frameCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get canvas context');

    const gif = GIFEncoder();
    const delay = 1000 / fps;
    for (let i = 0; i < totalFrames; i++) {
      onProgress?.(`Encoding GIF frame ${i + 1}/${totalFrames}...`);
      renderFrame(i / fps);
      ctx.drawImage(canvas, 0, 0, width, height);
      const { data } = ctx.getImageData(0, 0, width, height);
      const palette = quantize(data, 256);
      const index = applyPalette(data, palette);
      gif.writeFrame(index, width, height, { palette, delay });
      // Yield to the event loop so the UI can update
      if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    gif.finish();
    return new Blob([gif.bytes()], { type: 'image/gif' });
  }

  if (!webCodecsAvailable()) {
    throw new Error('This browser does not support WebCodecs video encoding — use GIF instead.');
  }

  const output = new Output({
    format: format === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat(),
    target: new BufferTarget(),
  });
  const source = new CanvasSource(canvas, {
    codec: format === 'mp4' ? 'avc' : 'vp9',
    bitrate: QUALITY_HIGH,
  });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  for (let i = 0; i < totalFrames; i++) {
    onProgress?.(`Encoding frame ${i + 1}/${totalFrames}...`);
    renderFrame(i / fps);
    await source.add(i / fps, 1 / fps);
  }

  source.close();
  await output.finalize();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('Encoding produced no output');
  return new Blob([buffer], { type: format === 'mp4' ? 'video/mp4' : 'video/webm' });
};
