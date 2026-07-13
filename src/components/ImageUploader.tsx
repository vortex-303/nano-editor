import { useCallback, useState, useEffect } from 'react';
import { Upload, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { toast } from 'sonner';
import { ImageCompressionService } from '@/utils/imageCompression';
import { ImageSizeIndicator } from '@/components/ui/image-size-indicator';
import { ImageProcessingModal } from '@/components/ImageProcessingModal';
import { ImageSizeInfo, ProcessedImageResult, IMAGE_SIZE_LIMITS } from '@/types/imageManagement';

interface ImageData {
  file?: File;
  url: string;
  isGenerated?: boolean;
}

interface ImageUploaderProps {
  onImagesSelect: (images: ImageData[]) => void;
  currentImages?: ImageData[];
  onClearImages?: () => void;
  className?: string;
}

export const ImageUploader = ({ 
  onImagesSelect, 
  currentImages = [],
  onClearImages,
  className 
}: ImageUploaderProps) => {
  const [imageSizeInfo, setImageSizeInfo] = useState<ImageSizeInfo[]>([]);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Analyze current images for size info
  useEffect(() => {
    const analyzeImages = async () => {
      const infoArray: ImageSizeInfo[] = [];
      for (const imageData of currentImages) {
        if (imageData.file) {
          try {
            const info = await ImageCompressionService.getImageInfo(imageData.file);
            infoArray.push(info);
          } catch (error) {
            console.warn('Failed to analyze image:', error);
          }
        }
      }
      setImageSizeInfo(infoArray);
    };
    analyzeImages();
  }, [currentImages]);
  const processFiles = async (files: File[]) => {
    const { valid, errors } = ImageCompressionService.validateFiles(files);
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      if (valid.length === 0) return;
    }

    if (currentImages.length + valid.length > IMAGE_SIZE_LIMITS.MAX_INDIVIDUAL_COUNT) {
      toast.error(`Maximum ${IMAGE_SIZE_LIMITS.MAX_INDIVIDUAL_COUNT} images allowed`);
      return;
    }

    // Check if any files need processing
    const needsProcessing = valid.some(file => 
      file.size > IMAGE_SIZE_LIMITS.COMPRESSION_THRESHOLD || 
      file.size > IMAGE_SIZE_LIMITS.MAX_FILE_SIZE * 0.5
    );

    if (needsProcessing) {
      setPendingFiles(valid);
      setShowProcessingModal(true);
    } else {
      // Process files directly without compression
      await processFilesDirectly(valid);
    }
  };

  const processFilesDirectly = async (files: File[]) => {
    const newImages: ImageData[] = [];
    let processedCount = 0;

    for (const file of files) {
      try {
        const dataUrl = await ImageCompressionService.fileToDataUrl(file);
        newImages.push({ file, url: dataUrl });
        processedCount++;
      } catch (error) {
        toast.error(`Failed to process ${file.name}`);
      }
    }

    if (newImages.length > 0) {
      const allImages = [...currentImages, ...newImages];
      onImagesSelect(allImages);
      toast.success(`${newImages.length} image${newImages.length > 1 ? 's' : ''} uploaded successfully!`);
    }
  };

  const handleProcessingComplete = (results: ProcessedImageResult[]) => {
    const newImages: ImageData[] = results.map((result, index) => ({
      file: pendingFiles[index],
      url: result.dataUrl,
      isGenerated: false
    }));

    const allImages = [...currentImages, ...newImages];
    onImagesSelect(allImages);
    
    const totalSavings = results.reduce((sum, r) => sum + (r.originalSize - r.compressedSize), 0);
    toast.success(`${results.length} images processed! Saved ${ImageCompressionService.formatFileSize(totalSavings)}`);
    
    setPendingFiles([]);
    setShowProcessingModal(false);
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  }, [currentImages, onImagesSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [currentImages, onImagesSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleRemoveImage = useCallback((indexToRemove: number) => {
    const updatedImages = currentImages.filter((_, index) => index !== indexToRemove);
    onImagesSelect(updatedImages);
    toast.success("Image removed");
  }, [currentImages, onImagesSelect]);

  const handleClearAll = useCallback(() => {
    if (onClearImages) {
      onClearImages();
    } else {
      onImagesSelect([]);
    }
    toast.success("All images cleared");
  }, [onClearImages, onImagesSelect]);

  return (
    <Card className={`border-0 shadow-elegant ${className}`}>
      <CardContent className="p-1">
        <div className="text-center">
          <div 
            className="relative group cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 pointer-events-none"
              style={{ pointerEvents: currentImages.length === 0 ? 'auto' : 'none' }}
              disabled={currentImages.length >= 3}
            />
            <div className="bg-input border border-input rounded-md p-1 group-hover:bg-input/80 transition-smooth min-h-20">
              {currentImages.length > 0 ? (
                <div className="space-y-2">
                  {/* Image Size Indicator */}
                  {imageSizeInfo.length > 0 && (
                    <ImageSizeIndicator images={imageSizeInfo} className="mb-2" />
                  )}
                  
                  <div className="relative">
                    {currentImages.length === 1 ? (
                      <div className="relative w-full">
                        <div className="relative">
                          <img
                            src={currentImages[0].url}
                            alt="Uploaded Image 1"
                            className="w-full h-64 mx-auto rounded-lg shadow-md object-cover bg-white"
                          />
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-md">
                            1
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 z-20"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleRemoveImage(0);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full mx-auto">
                        <Carousel className="w-full">
                          <CarouselContent>
                            {currentImages.map((image, index) => (
                              <CarouselItem key={index} className="basis-full">
                                <div className="relative w-full">
                                  <div className="relative">
                                    <img
                                      src={image.url}
                                      alt={`Uploaded Image ${index + 1}`}
                                      className="w-full h-64 object-cover rounded-lg shadow-md bg-white"
                                    />
                                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-md">
                                      {index + 1}
                                    </div>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="absolute -top-2 -right-2 z-20"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleRemoveImage(index);
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="left-2" />
                          <CarouselNext className="right-2" />
                        </Carousel>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {currentImages.some(img => img.isGenerated) 
                        ? `${currentImages.length} image${currentImages.length > 1 ? 's' : ''} (includes generated)`
                        : currentImages.length >= IMAGE_SIZE_LIMITS.MAX_INDIVIDUAL_COUNT 
                          ? `Maximum ${IMAGE_SIZE_LIMITS.MAX_INDIVIDUAL_COUNT} images reached`
                          : `${currentImages.length}/${IMAGE_SIZE_LIMITS.MAX_INDIVIDUAL_COUNT} images - Click or drag to add more`
                      }
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="z-20 flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleClearAll();
                        }}
                      >
                        Clear All
                      </Button>
                      {imageSizeInfo.some(info => info.needsCompression) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="z-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setPendingFiles(imageSizeInfo.filter(info => info.needsCompression).map(info => info.file));
                            setShowProcessingModal(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  className="text-sm text-muted-foreground cursor-pointer"
                  onClick={() => {
                    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                    input?.click();
                  }}
                >
                  <Upload className="h-6 w-6 mx-auto mb-2" />
                  <p>Upload or drag images here</p>
                  <p className="text-xs mt-1">
                    Max {IMAGE_SIZE_LIMITS.MAX_INDIVIDUAL_COUNT} files, {ImageCompressionService.formatFileSize(IMAGE_SIZE_LIMITS.MAX_FILE_SIZE)} each
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <ImageProcessingModal
        isOpen={showProcessingModal}
        onClose={() => {
          setShowProcessingModal(false);
          setPendingFiles([]);
        }}
        files={pendingFiles}
        onProcessingComplete={handleProcessingComplete}
      />
    </Card>
  );
};