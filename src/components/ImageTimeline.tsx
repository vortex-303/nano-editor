import { useState } from 'react';
import { Clock, Image as ImageIcon, ChevronLeft, ChevronRight, Upload, MoreVertical, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ImageVersion } from '@/types/imageEditor';

interface ImageTimelineProps {
  versions: ImageVersion[];
  currentVersionId: string | null;
  onVersionSelect: (versionId: string) => void;
  onUseAsReference: (imageUrl: string) => void;
  onMarkImage: (imageUrl: string) => void;
  className?: string;
}

export const ImageTimeline = ({ 
  versions, 
  currentVersionId, 
  onVersionSelect,
  onUseAsReference,
  onMarkImage,
  className 
}: ImageTimelineProps) => {
  if (versions.length === 0) return null;

  const currentIndex = versions.findIndex(v => v.id === currentVersionId);
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < versions.length - 1;

  const goToPrevious = () => {
    if (canGoBack) {
      onVersionSelect(versions[currentIndex - 1].id);
    }
  };

  const goToNext = () => {
    if (canGoForward) {
      onVersionSelect(versions[currentIndex + 1].id);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {[...versions].reverse().map((version, reversedIndex) => {
        const originalIndex = versions.length - 1 - reversedIndex;
        const isActive = version.id === currentVersionId;
        return (
          <div
            key={version.id}
            onClick={() => onVersionSelect(version.id)}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-smooth ${
              isActive 
                ? 'bg-primary/10 border border-primary/20' 
                : 'bg-muted/50 hover:bg-muted'
            }`}
          >
            <div className="flex-shrink-0">
              <div className={`w-16 h-16 rounded-lg overflow-hidden ${
                isActive ? 'ring-2 ring-primary' : ''
              }`}>
                <img
                  src={version.image_url}
                  alt={`Version ${originalIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">
                  Version {originalIndex + 1}
                </span>
                {isActive && (
                  <Badge variant="default">Current</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {version.prompt}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTime(version.created_at)}
              </p>
            </div>
            
            <div className="flex-shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 p-0"
                    title="More options"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="end">
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUseAsReference(version.image_url);
                      }}
                      className="w-full justify-start h-8 px-2"
                    >
                      <Upload className="h-3 w-3 mr-2" />
                      Use as reference
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkImage(version.image_url);
                      }}
                      className="w-full justify-start h-8 px-2"
                    >
                      <Palette className="h-3 w-3 mr-2" />
                      Mark image
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );
      })}
    </div>
  );
};