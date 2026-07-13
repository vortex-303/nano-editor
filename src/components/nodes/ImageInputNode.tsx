import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Link, Clipboard, Globe } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { ImageSearchModal } from '../ImageSearchModal';
import { ImagePreviewModal } from '../ImagePreviewModal';

interface ImageInputNodeProps {
  data: NodeData;
  id: string;
}

export const ImageInputNode: React.FC<ImageInputNodeProps> = ({ data, id }) => {
  const [imageUrl, setImageUrl] = useState(data.image || '');
  const [loading, setLoading] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateNodeData, getNodeData } = useNodeDataContext();

  // Sync with node data context - this ensures imported data is reflected
  useEffect(() => {
    const contextData = getNodeData(id);
    console.log(`ImageInputNode ${id} - Context data:`, contextData);
    if (contextData.image && contextData.image !== imageUrl) {
      console.log(`ImageInputNode ${id} - Setting image from context:`, contextData.image.substring(0, 50) + '...');
      setImageUrl(contextData.image);
    }
  }, [getNodeData, id]);

  // Update imageUrl when data.image changes (for dropped images)
  useEffect(() => {
    console.log(`ImageInputNode ${id} - data.image changed:`, data.image ? data.image.substring(0, 50) + '...' : 'undefined');
    if (data.image && data.image !== imageUrl) {
      console.log(`ImageInputNode ${id} - Setting image from data prop:`, data.image.substring(0, 50) + '...');
      setImageUrl(data.image);
    }
  }, [data.image]);

  // Update node data when image changes
  useEffect(() => {
    console.log(`ImageInputNode ${id} - Updating node data with imageUrl:`, imageUrl ? imageUrl.substring(0, 50) + '...' : 'undefined');
    updateNodeData(id, { image: imageUrl });
  }, [imageUrl, id, updateNodeData]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImageUrl(result);
        setLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(event.target.value);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
          const blob = await item.getType(item.types.find(type => type.startsWith('image/')) || '');
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            setImageUrl(result);
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  const handleImageSearch = (selectedImageUrl: string) => {
    setImageUrl(selectedImageUrl);
  };

  return (
    <Card className="w-64 p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Upload size={16} className="text-primary" />
          <span className="text-sm font-medium">Image Input</span>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs">Upload File</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <Upload size={14} />
            {loading ? 'Loading...' : 'Choose File'}
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Image URL</Label>
          <div className="flex gap-1">
            <Input
              placeholder="https://example.com/image.jpg"
              value={imageUrl.startsWith('data:') ? `data:${imageUrl.split(',')[0].split(':')[1]}...` : imageUrl}
              onChange={handleUrlChange}
              className="text-xs"
              size={1}
            />
            <Button variant="outline" size="sm" onClick={handlePasteFromClipboard}>
              <Clipboard size={14} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsSearchModalOpen(true)}>
              <Globe size={14} />
            </Button>
          </div>
        </div>

        {imageUrl && (
          <div className="space-y-2">
            <Label className="text-xs">Preview</Label>
            <img
              src={imageUrl}
              alt="Input"
              className="w-full aspect-square object-cover rounded border cursor-pointer"
              onClick={() => setIsPreviewOpen(true)}
              onError={(e) => {
                console.error('Image failed to load:', e);
                console.error('Image URL length:', imageUrl.length);
                console.error('Image URL start:', imageUrl.substring(0, 100));
                console.error('Full imageUrl for debugging:', imageUrl);
              }}
              onLoad={() => {
                console.log('Image loaded successfully');
                console.log('Loaded imageUrl preview:', imageUrl.substring(0, 50));
              }}
            />
          </div>
        )}
        {!imageUrl && (
          <div className="text-xs text-muted-foreground">
            imageUrl is empty: {JSON.stringify(imageUrl)}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="image"
        className="w-3 h-3 bg-blue-500"
      />

      <ImageSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onImageSelect={handleImageSearch}
      />

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={imageUrl}
      />
    </Card>
  );
};