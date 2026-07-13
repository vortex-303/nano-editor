import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Settings, Zap, Image } from 'lucide-react';
import { ImageCompressionService } from '@/utils/imageCompression';
import { CompressionOptions, COMPRESSION_PRESETS, ProcessedImageResult } from '@/types/imageManagement';

interface ImageProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  onProcessingComplete: (results: ProcessedImageResult[]) => void;
}

export const ImageProcessingModal: React.FC<ImageProcessingModalProps> = ({
  isOpen,
  onClose,
  files,
  onProcessingComplete
}) => {
  const [selectedQuality, setSelectedQuality] = useState<keyof typeof COMPRESSION_PRESETS>('balanced');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(0);
  const [results, setResults] = useState<ProcessedImageResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const selectedPreset = COMPRESSION_PRESETS[selectedQuality];

  useEffect(() => {
    if (isOpen) {
      setProcessing(false);
      setProgress(0);
      setCurrentFile(0);
      setResults([]);
      setErrors([]);
      setShowPreview(false);
    }
  }, [isOpen]);

  const handleProcess = async () => {
    setProcessing(true);
    setShowPreview(false);
    
    try {
      const { results: processResults, errors: processErrors } = await ImageCompressionService.processFiles(
        files,
        selectedPreset,
        (progress, current, total) => {
          setProgress(progress);
          setCurrentFile(current);
        }
      );

      setResults(processResults);
      setErrors(processErrors);
      setShowPreview(true);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Processing failed']);
    } finally {
      setProcessing(false);
    }
  };

  const handleAccept = () => {
    onProcessingComplete(results);
    onClose();
  };

  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalCompressedSize = results.reduce((sum, r) => sum + r.compressedSize, 0);
  const savings = ImageCompressionService.calculateSavings(totalOriginalSize, totalCompressedSize);

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'high': return <Image className="h-4 w-4" />;
      case 'balanced': return <Settings className="h-4 w-4" />;
      case 'fast': return <Zap className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getQualityDescription = (quality: string) => {
    switch (quality) {
      case 'high': return 'Best quality, larger files (90% JPEG, max 2048px)';
      case 'balanced': return 'Good quality, moderate size (75% JPEG, max 1024px)';
      case 'fast': return 'Smaller files, faster processing (60% JPEG, max 512px)';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Process Images
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!processing && !showPreview && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Processing Quality</span>
                  <Badge variant="outline">{files.length} files</Badge>
                </div>
                
                <Select value={selectedQuality} onValueChange={(value: any) => setSelectedQuality(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMPRESSION_PRESETS).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          {getQualityIcon(key)}
                          <div>
                            <div className="font-medium capitalize">{key} Quality</div>
                            <div className="text-xs text-muted-foreground">
                              {getQualityDescription(key)}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Total files:</span>
                      <span>{files.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total size:</span>
                      <span>{ImageCompressionService.formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target max dimension:</span>
                      <span>{selectedPreset.maxDimension}px</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Compression quality:</span>
                      <span>{Math.round(selectedPreset.jpegQuality * 100)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {processing && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">
                  Processing file {currentFile} of {files.length}
                </div>
                <Progress value={progress} className="w-full" />
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round(progress)}% complete
                </div>
              </div>
            </div>
          )}

          {showPreview && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Processing Complete</span>
              </div>

              {errors.length > 0 && (
                <Card className="border-destructive">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">Errors</span>
                    </div>
                    <div className="text-xs space-y-1">
                      {errors.map((error, index) => (
                        <div key={index} className="text-destructive">{error}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between font-medium">
                      <span>Compression Results</span>
                      <Badge variant="secondary">{results.length} processed</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Original size:</span>
                      <span>{ImageCompressionService.formatFileSize(totalOriginalSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Compressed size:</span>
                      <span>{ImageCompressionService.formatFileSize(totalCompressedSize)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Space saved:</span>
                      <span>{savings.formatted}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {!processing && !showPreview && (
              <Button onClick={handleProcess}>
                Process Images
              </Button>
            )}
            {showPreview && (
              <Button onClick={handleAccept}>
                Use Processed Images
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};