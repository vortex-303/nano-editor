import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Plus, Info } from 'lucide-react';
import { extractImageMetadata, ImageMetadata } from '@/utils/imageMetadata';
import { Card } from '@/components/ui/card';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onDownload?: () => void;
  onAddToBoard?: (imageUrl: string) => void;
  showAddToBoard?: boolean;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onDownload,
  onAddToBoard,
  showAddToBoard = false
}) => {
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [metadata, setMetadata] = React.useState<ImageMetadata | null>(null);
  const [showMetadata, setShowMetadata] = React.useState(false);
  const [loadingMetadata, setLoadingMetadata] = React.useState(false);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.2));
  const handleRotate = () => setRotation(prev => prev + 90);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  React.useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setMetadata(null);
      setShowMetadata(false);
      setLoadingMetadata(true);
      
      // Load metadata
      extractImageMetadata(imageUrl)
        .then(setMetadata)
        .catch(err => console.error('Failed to extract metadata:', err))
        .finally(() => setLoadingMetadata(false));
    }
  }, [isOpen, imageUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-background/95 backdrop-blur-sm">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        
        {/* Header with controls */}
        <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleZoomOut}>
              <ZoomOut size={16} />
            </Button>
            <Button variant="secondary" size="sm" onClick={handleZoomIn}>
              <ZoomIn size={16} />
            </Button>
            <Button variant="secondary" size="sm" onClick={handleRotate}>
              <RotateCw size={16} />
            </Button>
            <Button variant="secondary" size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button 
              variant={showMetadata ? "default" : "secondary"} 
              size="sm" 
              onClick={() => setShowMetadata(!showMetadata)}
            >
              <Info size={16} />
            </Button>
            {onDownload && (
              <Button variant="secondary" size="sm" onClick={onDownload}>
                <Download size={16} />
              </Button>
            )}
            {showAddToBoard && onAddToBoard && (
              <Button variant="secondary" size="sm" onClick={() => onAddToBoard(imageUrl)}>
                <Plus size={16} className="mr-1" />
                Add to Board
              </Button>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Metadata Panel */}
        {showMetadata && (
          <Card className="absolute top-20 left-4 z-50 p-4 bg-background/95 backdrop-blur-sm border-border max-w-xs">
            <h3 className="font-semibold mb-3 text-foreground">Image Information</h3>
            {loadingMetadata ? (
              <p className="text-sm text-muted-foreground">Loading metadata...</p>
            ) : metadata ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensions:</span>
                  <span className="font-medium text-foreground">{metadata.dimensions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aspect Ratio:</span>
                  <span className="font-medium text-foreground">{metadata.aspectRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Megapixels:</span>
                  <span className="font-medium text-foreground">{metadata.megapixels}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File Size:</span>
                  <span className="font-medium text-foreground">{metadata.fileSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium text-foreground">{metadata.format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Color Mode:</span>
                  <span className="font-medium text-foreground">{metadata.colorMode}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Failed to load metadata</p>
            )}
          </Card>
        )}

        {/* Bottom floating zoom controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2">
          <Button variant="secondary" size="sm" onClick={handleZoomOut}>
            <ZoomOut size={16} />
          </Button>
          <Button variant="secondary" size="sm" onClick={handleZoomIn}>
            <ZoomIn size={16} />
          </Button>
        </div>

        {/* Image container */}
        <div className="w-full h-[95vh] flex items-center justify-center overflow-hidden">
          <img
            src={imageUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
            onError={(e) => {
              console.error('Preview modal image failed to load:', e);
              console.error('Preview image URL length:', imageUrl?.length);
              console.error('Preview image URL start:', imageUrl?.substring(0, 100));
            }}
            onLoad={() => {
              console.log('Preview modal image loaded successfully');
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};