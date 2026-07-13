import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Upload, X, Image as ImageIcon, Grid3X3, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { NodeData } from '@/types/nodeEditor';
import { toast } from 'sonner';
import { ImageCompressionService } from '@/utils/imageCompression';
import { ImageSizeIndicator } from '@/components/ui/image-size-indicator';
import { ImageProcessingModal } from '@/components/ImageProcessingModal';
import { ImageSizeInfo, ProcessedImageResult, IMAGE_SIZE_LIMITS } from '@/types/imageManagement';

interface BatchImageInputNodeProps {
  data: NodeData;
  id: string;
}

interface BatchImageData {
  url: string;
  file?: File;
  source: 'uploaded' | 'batch';
  index: number;
  type: 'image' | 'svg';
  svgContent?: string;
}

export const BatchImageInputNode: React.FC<BatchImageInputNodeProps> = ({ data, id }) => {
  const [uploadedImages, setUploadedImages] = useState<BatchImageData[]>([]);
  const [batchImages, setBatchImages] = useState<BatchImageData[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageSizeInfo, setImageSizeInfo] = useState<ImageSizeInfo[]>([]);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const { updateNodeData, getConnectedNodeData } = useNodeDataContext();

  // Get connected batch images from other nodes
  useEffect(() => {
    const connectedData = getConnectedNodeData(id, [], 'batch-input');
    if (connectedData && Array.isArray(connectedData)) {
      const batchImagesFromInput = connectedData.map((url, index) => ({
        url,
        source: 'batch' as const,
        index: uploadedImages.length + index,
        type: 'image' as const
      }));
      setBatchImages(batchImagesFromInput);
    }
  }, [id, getConnectedNodeData, uploadedImages.length]);

  // Combine all images and update node data
  const allImages = [...uploadedImages, ...batchImages];
  
  useEffect(() => {
    const imageUrls = allImages.map(img => img.url);
    updateNodeData(id, { 
      images: imageUrls,
      batchOutput: imageUrls,
      totalCount: allImages.length,
      uploadedCount: uploadedImages.length,
      batchCount: batchImages.length
    });
  }, [uploadedImages, batchImages, id, updateNodeData, allImages]);

  // Analyze uploaded images for size info
  useEffect(() => {
    const analyzeImages = async () => {
      const infoArray: ImageSizeInfo[] = [];
      for (const imageData of uploadedImages) {
        if (imageData.file) {
          try {
            const info = await ImageCompressionService.getImageInfo(imageData.file);
            infoArray.push(info);
          } catch (error) {
            console.warn('Failed to analyze batch image:', error);
          }
        }
      }
      setImageSizeInfo(infoArray);
    };
    analyzeImages();
  }, [uploadedImages]);

  const processFiles = async (files: File[]) => {
    const { valid, errors } = ImageCompressionService.validateFiles(files);
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      if (valid.length === 0) return;
    }

    if (uploadedImages.length + valid.length > IMAGE_SIZE_LIMITS.MAX_INDIVIDUAL_COUNT) {
      toast.error(`Maximum ${IMAGE_SIZE_LIMITS.MAX_INDIVIDUAL_COUNT} images allowed for upload`);
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
    const newImages: BatchImageData[] = [];

    for (const file of files) {
      try {
        const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
        const dataUrl = await ImageCompressionService.fileToDataUrl(file);
        
        if (isSvg) {
          // Read SVG content as text
          const svgContent = await file.text();
          newImages.push({ 
            url: dataUrl, 
            file, 
            source: 'uploaded',
            index: uploadedImages.length + newImages.length,
            type: 'svg',
            svgContent
          });
        } else {
          newImages.push({ 
            url: dataUrl, 
            file, 
            source: 'uploaded',
            index: uploadedImages.length + newImages.length,
            type: 'image'
          });
        }
      } catch (error) {
        toast.error(`Failed to process ${file.name}`);
      }
    }

    if (newImages.length > 0) {
      setUploadedImages(prev => [...prev, ...newImages]);
      const svgCount = newImages.filter(img => img.type === 'svg').length;
      const imgCount = newImages.length - svgCount;
      const parts = [];
      if (imgCount > 0) parts.push(`${imgCount} image${imgCount > 1 ? 's' : ''}`);
      if (svgCount > 0) parts.push(`${svgCount} SVG${svgCount > 1 ? 's' : ''}`);
      toast.success(`${parts.join(' and ')} uploaded successfully!`);
    }
  };

  const handleProcessingComplete = (results: ProcessedImageResult[]) => {
    const newImages: BatchImageData[] = results.map((result, index) => ({
      url: result.dataUrl,
      file: pendingFiles[index],
      source: 'uploaded' as const,
      index: uploadedImages.length + index,
      type: 'image' as const
    }));

    setUploadedImages(prev => [...prev, ...newImages]);
    
    const totalSavings = results.reduce((sum, r) => sum + (r.originalSize - r.compressedSize), 0);
    toast.success(`${results.length} images processed! Saved ${ImageCompressionService.formatFileSize(totalSavings)}`);
    
    setPendingFiles([]);
    setShowProcessingModal(false);
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  }, [uploadedImages.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [uploadedImages.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleRemoveImage = useCallback((indexToRemove: number, source: 'uploaded' | 'batch') => {
    if (source === 'uploaded') {
      setUploadedImages(prev => prev.filter(img => img.index !== indexToRemove));
      toast.success("Image removed");
    }
  }, []);

  const handleClearUploaded = useCallback(() => {
    setUploadedImages([]);
    toast.success("All uploaded images cleared");
  }, []);

  const handleImageClick = useCallback((imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
  }, []);

  return (
    <>
      <Card className="w-80 shadow-elegant border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-sm">Batch Images</CardTitle>
            </div>
            <div className="flex gap-1">
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                {allImages.length} total
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Image Size Indicator */}
          {imageSizeInfo.length > 0 && (
            <ImageSizeIndicator images={imageSizeInfo} />
          )}
          
          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer ${
              isDragging ? 'border-purple-500 bg-purple-50' : 'border-muted-foreground/25 hover:border-purple-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => {
              const input = document.querySelector(`#file-input-${id}`) as HTMLInputElement;
              input?.click();
            }}
          >
            <input
              id={`file-input-${id}`}
              type="file"
              accept="image/*,.svg"
              multiple
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploadedImages.length >= 12}
            />
            <div className="text-center">
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {uploadedImages.length >= IMAGE_SIZE_LIMITS.MAX_INDIVIDUAL_COUNT 
                  ? `Upload limit reached (${IMAGE_SIZE_LIMITS.MAX_INDIVIDUAL_COUNT} max)`
                  : "Drop images here or click to upload"
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {uploadedImages.length}/{IMAGE_SIZE_LIMITS.MAX_INDIVIDUAL_COUNT} uploaded
                {imageSizeInfo.length > 0 && (
                  <span className="ml-2">
                    • {ImageCompressionService.formatFileSize(imageSizeInfo.reduce((sum, info) => sum + info.sizeBytes, 0))} total
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Image Grid */}
          {allImages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {uploadedImages.length > 0 && (
                    <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {uploadedImages.length} uploaded
                    </Badge>
                  )}
                  {batchImages.length > 0 && (
                    <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      {batchImages.length} from batch
                    </Badge>
                  )}
                </div>
                {uploadedImages.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClearUploaded}>
                    Clear Uploaded
                  </Button>
                )}
              </div>
              
              <ScrollArea className="h-32">
                <div className="grid grid-cols-4 gap-1">
                  {allImages.length === 0 && (
                    <div className="col-span-4 text-xs text-muted-foreground p-2">
                      No images in allImages array. Debug: uploadedImages={uploadedImages.length}, batchImages={batchImages.length}
                    </div>
                  )}
                  {allImages.map((image, index) => {
                    console.log(`Rendering batch image ${index}:`, { 
                      url: image.url?.substring(0, 50) + '...', 
                      source: image.source, 
                      index: image.index 
                    });
                    return (
                      <div key={`${image.source}-${image.index}`} className="relative group">
                        <img
                          src={image.url}
                          alt={`Batch image ${index + 1}`}
                          className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleImageClick(image.url)}
                          onError={(e) => {
                            console.error(`Batch image ${index + 1} failed to load:`, e);
                            console.error('Batch image URL length:', image.url?.length);
                            console.error('Batch image URL start:', image.url?.substring(0, 100));
                            console.error('Full batch image URL:', image.url);
                          }}
                          onLoad={() => {
                            console.log(`Batch image ${index + 1} loaded successfully`);
                          }}
                        />
                        <div className={`absolute top-0.5 left-0.5 w-2 h-2 rounded-full ${
                          image.source === 'uploaded' ? 'bg-blue-500' : 'bg-purple-500'
                        }`} />
                        {image.source === 'uploaded' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute -top-1 -right-1 w-4 h-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(image.index, image.source);
                            }}
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Connection Handles */}
          <Handle
            type="target"
            position={Position.Left}
            id="batch-input"
            style={{
              background: '#9333ea',
              width: 12,
              height: 12,
              border: '2px solid white'
            }}
          />
          
          {/* Batch Output Handle */}
          <Handle
            type="source"
            position={Position.Right}
            id="batch-output"
            style={{
              background: '#9333ea',
              width: 12,
              height: 12,
              border: '2px solid white',
              top: '30%'
            }}
          />

          {/* Individual Image Output Handles */}
          {allImages.slice(0, 6).map((_, index) => (
            <Handle
              key={`image-${index}`}
              type="source"
              position={Position.Right}
              id={`image-${index}`}
              style={{
                background: '#3b82f6',
                width: 8,
                height: 8,
                border: '1px solid white',
                top: `${50 + (index * 8)}%`
              }}
            />
          ))}
        </CardContent>
      </Card>

      {selectedImageUrl && (
        <ImagePreviewModal
          isOpen={!!selectedImageUrl}
          onClose={() => setSelectedImageUrl(null)}
          imageUrl={selectedImageUrl}
        />
      )}

      <ImageProcessingModal
        isOpen={showProcessingModal}
        onClose={() => {
          setShowProcessingModal(false);
          setPendingFiles([]);
        }}
        files={pendingFiles}
        onProcessingComplete={handleProcessingComplete}
      />
    </>
  );
};