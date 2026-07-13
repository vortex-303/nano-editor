import { CompressionOptions, ProcessedImageResult, ImageSizeInfo, COMPRESSION_PRESETS, IMAGE_SIZE_LIMITS } from '@/types/imageManagement';

export class ImageCompressionService {
  static async getImageInfo(file: File): Promise<ImageSizeInfo> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
        const dimensionsString = `${dimensions.width}×${dimensions.height}`;
        const isOversized = file.size > IMAGE_SIZE_LIMITS.MAX_FILE_SIZE;
        const needsCompression = file.size > IMAGE_SIZE_LIMITS.COMPRESSION_THRESHOLD;
        
        let recommendedSize = 'Perfect size';
        if (isOversized) {
          recommendedSize = `Reduce to under ${this.formatFileSize(IMAGE_SIZE_LIMITS.MAX_FILE_SIZE)}`;
        } else if (needsCompression) {
          recommendedSize = `Consider compression (${this.formatFileSize(file.size)} → ~${this.formatFileSize(file.size * 0.7)})`;
        }

        resolve({
          file,
          sizeBytes: file.size,
          dimensions,
          dimensionsString,
          isOversized,
          recommendedSize,
          needsCompression
        });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  static validateFiles(files: File[]): { valid: File[]; errors: string[] } {
    const errors: string[] = [];
    const valid: File[] = [];
    let totalSize = 0;

    for (const file of files) {
      // Check file type - allow images and SVGs
      const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
      if (!file.type.startsWith('image/') && !isSvg) {
        errors.push(`${file.name}: Not a valid image or SVG file`);
        continue;
      }

      // Check individual file size
      if (file.size > IMAGE_SIZE_LIMITS.MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (${this.formatFileSize(file.size)}). Maximum: ${this.formatFileSize(IMAGE_SIZE_LIMITS.MAX_FILE_SIZE)}`);
        continue;
      }

      totalSize += file.size;
      valid.push(file);
    }

    // Check total batch size
    if (totalSize > IMAGE_SIZE_LIMITS.MAX_BATCH_SIZE) {
      errors.push(`Total batch size too large (${this.formatFileSize(totalSize)}). Maximum: ${this.formatFileSize(IMAGE_SIZE_LIMITS.MAX_BATCH_SIZE)}`);
    }

    return { valid, errors };
  }

  static isSvgFile(file: File): boolean {
    return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
  }

  static async compressImage(
    file: File, 
    options: CompressionOptions = COMPRESSION_PRESETS.balanced
  ): Promise<ProcessedImageResult> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        const originalSize = file.size;
        let { width, height } = img;

        // Calculate new dimensions if resizing is needed
        if (width > options.maxDimension || height > options.maxDimension) {
          if (width > height) {
            height = Math.round((height * options.maxDimension) / width);
            width = options.maxDimension;
          } else {
            width = Math.round((width * options.maxDimension) / height);
            height = options.maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Apply compression-friendly drawing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed format
        const mimeType = options.format === 'png' ? 'image/png' : 
                        options.format === 'webp' ? 'image/webp' : 'image/jpeg';
        
        const dataUrl = canvas.toDataURL(mimeType, options.jpegQuality);
        const compressedSize = Math.round(dataUrl.length * 0.75); // Approximate size
        const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

        resolve({
          originalSize,
          compressedSize,
          compressionRatio,
          dataUrl,
          dimensions: { width, height }
        });

        // Cleanup
        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  static async processFiles(
    files: File[], 
    options: CompressionOptions = COMPRESSION_PRESETS.balanced,
    onProgress?: (progress: number, current: number, total: number) => void
  ): Promise<{ results: ProcessedImageResult[]; errors: string[] }> {
    const { valid, errors } = this.validateFiles(files);
    const results: ProcessedImageResult[] = [];

    for (let i = 0; i < valid.length; i++) {
      try {
        onProgress?.(((i + 1) / valid.length) * 100, i + 1, valid.length);
        
        const file = valid[i];
        const shouldCompress = file.size > IMAGE_SIZE_LIMITS.COMPRESSION_THRESHOLD;
        
        if (shouldCompress) {
          const result = await this.compressImage(file, options);
          results.push(result);
        } else {
          // For small files, just convert to data URL without compression
          const dataUrl = await this.fileToDataUrl(file);
          const img = await this.loadImageFromDataUrl(dataUrl);
          results.push({
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 1,
            dataUrl,
            dimensions: { width: img.naturalWidth, height: img.naturalHeight }
          });
        }
      } catch (error) {
        errors.push(`${valid[i].name}: ${error instanceof Error ? error.message : 'Processing failed'}`);
      }
    }

    return { results, errors };
  }

  static fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  static loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  static calculateSavings(original: number, compressed: number): {
    absolute: number;
    percentage: number;
    formatted: string;
  } {
    const absolute = original - compressed;
    const percentage = original > 0 ? (absolute / original) * 100 : 0;
    return {
      absolute,
      percentage,
      formatted: `${this.formatFileSize(absolute)} (${percentage.toFixed(1)}% reduction)`
    };
  }
}