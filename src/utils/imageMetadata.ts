export interface ImageMetadata {
  dimensions: string;
  fileSize: string;
  format: string;
  aspectRatio: string;
  colorMode: string;
  megapixels: string;
  width: number;
  height: number;
  sizeBytes?: number;
}

export const extractImageMetadata = async (imageUrl: string): Promise<ImageMetadata> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      
      // Calculate aspect ratio
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(width, height);
      const aspectRatio = `${width / divisor}:${height / divisor}`;
      
      // Calculate megapixels
      const megapixels = ((width * height) / 1000000).toFixed(2);
      
      // Determine format from URL or data URI
      let format = 'Unknown';
      if (imageUrl.startsWith('data:')) {
        const mimeMatch = imageUrl.match(/data:image\/([^;]+)/);
        if (mimeMatch) {
          format = mimeMatch[1].toUpperCase();
        }
      } else {
        const urlFormat = imageUrl.split('.').pop()?.split('?')[0]?.toUpperCase();
        if (urlFormat) {
          format = urlFormat;
        }
      }
      
      // Detect color mode by drawing to canvas
      let colorMode = 'RGB';
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(width, 100);
        canvas.height = Math.min(height, 100);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Check for transparency
          let hasAlpha = false;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 255) {
              hasAlpha = true;
              break;
            }
          }
          
          colorMode = hasAlpha ? 'RGBA' : 'RGB';
        }
      } catch (e) {
        // If canvas fails, default to RGB
        colorMode = 'RGB';
      }
      
      // Get file size if available
      let fileSize = 'Unknown';
      let sizeBytes: number | undefined;
      
      if (imageUrl.startsWith('data:')) {
        // Calculate base64 size
        const base64Data = imageUrl.split(',')[1];
        if (base64Data) {
          sizeBytes = Math.round((base64Data.length * 3) / 4);
          fileSize = formatFileSize(sizeBytes);
        }
      } else {
        try {
          const response = await fetch(imageUrl, { method: 'HEAD' });
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            sizeBytes = parseInt(contentLength);
            fileSize = formatFileSize(sizeBytes);
          }
        } catch (e) {
          // If fetch fails, leave as Unknown
        }
      }
      
      resolve({
        dimensions: `${width} × ${height} px`,
        fileSize,
        format,
        aspectRatio,
        colorMode,
        megapixels: `${megapixels} MP`,
        width,
        height,
        sizeBytes
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
