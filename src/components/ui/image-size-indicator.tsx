import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { ImageSizeInfo, IMAGE_SIZE_LIMITS } from '@/types/imageManagement';
import { ImageCompressionService } from '@/utils/imageCompression';

interface ImageSizeIndicatorProps {
  images: ImageSizeInfo[];
  className?: string;
}

export const ImageSizeIndicator: React.FC<ImageSizeIndicatorProps> = ({ 
  images, 
  className = '' 
}) => {
  const totalSize = images.reduce((sum, img) => sum + img.sizeBytes, 0);
  const oversizedCount = images.filter(img => img.isOversized).length;
  const needsCompressionCount = images.filter(img => img.needsCompression).length;
  
  const sizePercentage = (totalSize / IMAGE_SIZE_LIMITS.MAX_BATCH_SIZE) * 100;
  const countPercentage = (images.length / IMAGE_SIZE_LIMITS.MAX_TOTAL_COUNT) * 100;
  
  const getStatusColor = () => {
    if (oversizedCount > 0) return 'destructive';
    if (needsCompressionCount > 0) return 'secondary';
    return 'outline';
  };

  const getStatusIcon = () => {
    if (oversizedCount > 0) return <AlertTriangle className="h-4 w-4" />;
    if (needsCompressionCount > 0) return <Info className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getSummaryText = () => {
    if (oversizedCount > 0) {
      return `${oversizedCount} file${oversizedCount > 1 ? 's' : ''} too large`;
    }
    if (needsCompressionCount > 0) {
      return `${needsCompressionCount} file${needsCompressionCount > 1 ? 's' : ''} can be compressed`;
    }
    return 'All files optimized';
  };

  return (
    <TooltipProvider>
      <div className={`space-y-2 p-3 border rounded-lg bg-card ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">Image Status</span>
          </div>
          <Badge variant={getStatusColor()} className="text-xs">
            {getSummaryText()}
          </Badge>
        </div>

        <div className="space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Total Size</span>
                  <span>{ImageCompressionService.formatFileSize(totalSize)} / {ImageCompressionService.formatFileSize(IMAGE_SIZE_LIMITS.MAX_BATCH_SIZE)}</span>
                </div>
                <Progress 
                  value={Math.min(sizePercentage, 100)} 
                  className="h-2"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Batch size limit: {ImageCompressionService.formatFileSize(IMAGE_SIZE_LIMITS.MAX_BATCH_SIZE)}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>File Count</span>
                  <span>{images.length} / {IMAGE_SIZE_LIMITS.MAX_TOTAL_COUNT}</span>
                </div>
                <Progress 
                  value={Math.min(countPercentage, 100)} 
                  className="h-2"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Maximum files allowed: {IMAGE_SIZE_LIMITS.MAX_TOTAL_COUNT}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {images.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Largest file:</span>
              <span>{ImageCompressionService.formatFileSize(Math.max(...images.map(img => img.sizeBytes)))}</span>
            </div>
            <div className="flex justify-between">
              <span>Average size:</span>
              <span>{ImageCompressionService.formatFileSize(totalSize / images.length)}</span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};