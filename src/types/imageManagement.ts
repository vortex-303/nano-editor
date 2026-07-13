export interface ImageSizeInfo {
  file: File;
  sizeBytes: number;
  dimensions: { width: number; height: number };
  dimensionsString: string;
  isOversized: boolean;
  recommendedSize: string;
  needsCompression: boolean;
}

export interface CompressionOptions {
  quality: 'high' | 'balanced' | 'fast';
  maxDimension: number;
  jpegQuality: number;
  format: 'jpeg' | 'png' | 'webp';
}

export interface ProcessedImageResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dataUrl: string;
  dimensions: { width: number; height: number };
}

export const COMPRESSION_PRESETS: Record<CompressionOptions['quality'], CompressionOptions> = {
  high: {
    quality: 'high',
    maxDimension: 2048,
    jpegQuality: 0.9,
    format: 'jpeg'
  },
  balanced: {
    quality: 'balanced',
    maxDimension: 1024,
    jpegQuality: 0.75,
    format: 'jpeg'
  },
  fast: {
    quality: 'fast',
    maxDimension: 512,
    jpegQuality: 0.6,
    format: 'jpeg'
  }
};

export const IMAGE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_BATCH_SIZE: 50 * 1024 * 1024, // 50MB total
  MAX_INDIVIDUAL_COUNT: 12,
  MAX_TOTAL_COUNT: 25,
  COMPRESSION_THRESHOLD: 500000 // 500KB
} as const;