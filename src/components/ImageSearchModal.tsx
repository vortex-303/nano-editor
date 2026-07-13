import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UnsplashImage {
  id: string;
  url: string;
  thumb: string;
  description: string;
  photographer: string;
  downloadUrl: string;
}

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (imageUrl: string) => void;
}

export const ImageSearchModal: React.FC<ImageSearchModalProps> = ({
  isOpen,
  onClose,
  onImageSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  const searchImages = async (query: string, pageNum: number = 1, append: boolean = false) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-unsplash', {
        body: { 
          query: query.trim(),
          page: pageNum,
          perPage: 20
        }
      });

      if (error) {
        console.error('Error searching images:', error);
        toast({
          title: "Search Error",
          description: "Failed to search images. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data?.images) {
        if (append) {
          setImages(prev => [...prev, ...data.images]);
        } else {
          setImages(data.images);
        }
        setHasMore(data.images.length === 20 && pageNum < data.totalPages);
      }
    } catch (error) {
      console.error('Error searching images:', error);
      toast({
        title: "Search Error",
        description: "Failed to search images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    setImages([]);
    searchImages(searchQuery, 1);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    searchImages(searchQuery, nextPage, true);
  };

  const handleImageSelect = (image: UnsplashImage) => {
    onImageSelect(image.url);
    onClose();
    toast({
      title: "Image Selected",
      description: `Added image by ${image.photographer}`,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setImages([]);
      setPage(1);
      setHasMore(true);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Images</DialogTitle>
          <DialogDescription>
            Search and select images from Unsplash to use in your project
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Search for images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
            <Search size={16} />
            Search
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && images.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-muted-foreground">Searching...</div>
            </div>
          ) : images.length > 0 ? (
            <>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border hover:border-primary transition-colors"
                    onClick={() => handleImageSelect(image)}
                  >
                    <img
                      src={image.thumb}
                      alt={image.description}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <p className="text-white text-xs truncate">
                        by {image.photographer}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {hasMore && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </>
          ) : searchQuery && !loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-muted-foreground">
                No images found for "{searchQuery}"
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-muted-foreground">
                Enter a search term to find images
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground mt-4 pt-2 border-t">
          Images provided by Unsplash
        </div>
      </DialogContent>
    </Dialog>
  );
};