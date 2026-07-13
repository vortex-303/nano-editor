import { useState, useCallback, useRef } from "react";
import { Download, Sparkles, Loader2, Plus, Upload, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ImageUploader } from "./ImageUploader";
import { ImageTimeline } from "./ImageTimeline";
import { DrawingModal } from "./DrawingModal";
import { ImageMarkingModal } from "./ImageMarkingModal";
import { CreditGuard } from "./CreditGuard";
import { UpgradeModal } from "./UpgradeModal";
import { useImageEditor } from "@/hooks/useImageEditor";
import { useAuth } from "@/contexts/AuthContext";
import { CreditService } from "@/services/creditService";

interface ImageEditorProps {
  className?: string;
}

interface ImageData {
  file?: File;
  url: string;
  isGenerated?: boolean;
}

export const ImageEditor = ({ className }: ImageEditorProps) => {
  const [selectedImages, setSelectedImages] = useState<ImageData[]>([]);
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [isMarkingModalOpen, setIsMarkingModalOpen] = useState(false);
  const [markingImageUrl, setMarkingImageUrl] = useState<string>('');
  const [mode, setMode] = useState<'edit' | 'add' | 'start'>('edit');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { user, deductCredit } = useAuth();
  
  const { 
    state, 
    createSession, 
    addVersion, 
    setGenerating, 
    jumpToVersion, 
    getCurrentVersion 
  } = useImageEditor();

  const handleImagesSelect = useCallback((images: ImageData[]) => {
    setSelectedImages(images);
  }, []);

  const handleClearImages = useCallback(() => {
    setSelectedImages([]);
  }, []);

  const handleUseAsReference = useCallback((imageUrl: string) => {
    const newImage: ImageData = { url: imageUrl, isGenerated: true };
    setSelectedImages(prev => {
      if (prev.length >= 3) {
        toast.error("Maximum 3 images allowed");
        return prev;
      }
      return [...prev, newImage];
    });
    toast.success("Generated image added to references!");
  }, []);


  const handleFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    
    if (imageFiles.length === 0) {
      toast.error("Please select valid image files");
      return;
    }

    if (selectedImages.length + imageFiles.length > 3) {
      toast.error("Maximum 3 images allowed");
      return;
    }

    const newImages: ImageData[] = [];
    let processedCount = 0;

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        newImages.push({ file, url: preview });
        processedCount++;
        
        if (processedCount === imageFiles.length) {
          const allImages = [...selectedImages, ...newImages];
          setSelectedImages(allImages);
          toast.success(`${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} uploaded successfully!`);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset the input
    e.target.value = '';
  }, [selectedImages]);

  const handleDrawImage = useCallback(() => {
    setIsDrawingModalOpen(true);
  }, []);

  const handleDrawingSubmit = useCallback((imageDataUrl: string) => {
    const newImage: ImageData = {
      url: imageDataUrl,
      isGenerated: false
    };
    
    if (selectedImages.length >= 3) {
      toast.error("Maximum 3 images allowed");
      return;
    }
    
    setSelectedImages(prev => [...prev, newImage]);
    toast.success("Drawing added to reference images!");
  }, [selectedImages.length]);

  const handleMarkImage = useCallback((imageUrl: string) => {
    setMarkingImageUrl(imageUrl);
    setIsMarkingModalOpen(true);
  }, []);

  const handleMarkingSubmit = useCallback((imageDataUrl: string) => {
    const newImage: ImageData = {
      url: imageDataUrl,
      isGenerated: true
    };
    
    if (selectedImages.length >= 3) {
      toast.error("Maximum 3 images allowed");
      return;
    }
    
    setSelectedImages(prev => [...prev, newImage]);
    toast.success("Marked image added to reference images!");
  }, [selectedImages.length]);

  const handleGenerate = useCallback(async () => {
    console.log('Generate clicked - Mode:', mode, 'Selected images:', selectedImages.length);
    
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    // Mode-specific validation
    if (mode === 'edit' && selectedImages.length === 0) {
      toast.error("Please add reference images to edit");
      return;
    }

    // Credit check and deduction
    if (user) {
      // Authenticated user - use deductCredit from context
      console.log('ImageEditor: Checking credits for user:', user.email);
      const canGenerate = await deductCredit();
      console.log('ImageEditor: deductCredit result:', canGenerate);
      if (!canGenerate) {
        console.log('ImageEditor: Credit deduction failed');
        toast.error("Not enough credits. Please upgrade to continue.");
        setUpgradeModalOpen(true);
        return;
      }
      console.log('ImageEditor: Credit deducted successfully');
    }

    // Start Fresh mode - clear reference images before generation
    if (mode === 'start') {
      setSelectedImages([]);
    }

    setGenerating(true);
    const startTime = Date.now();
    
    try {
      // Create session if none exists
      let sessionId = state.currentSession?.id;
      if (!sessionId) {
        sessionId = await createSession();
      }

      // Prepare request body
      const requestBody: any = { prompt };
      
      // Only send images for edit mode, not for add or start modes
      if (mode === 'edit' && selectedImages.length > 0) {
        const imageData = [];
        
        for (const image of selectedImages) {
          if (image.file) {
            // Convert file to base64 for API
            const reader = new FileReader();
            const fileData = await new Promise<string>((resolve) => {
              reader.onload = () => {
                const result = reader.result as string;
                const base64Data = result.split(',')[1]; // Remove data:image/...;base64, prefix
                resolve(base64Data);
              };
              reader.readAsDataURL(image.file);
            });

            imageData.push({
              type: image.file.type,
              data: fileData
            });
          } else {
            // Use image URL directly
            imageData.push({
              url: image.url
            });
          }
        }

        requestBody.images = imageData;
      }

      // Call edge function
      const response = await fetch('https://paymvttrbrwmcybbhipe.supabase.co/functions/v1/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate image');
      }

      const processingTime = Date.now() - startTime;
      
      // Add version to timeline
      const currentVersion = getCurrentVersion();
      await addVersion(
        sessionId,
        data.imageUrl,
        prompt,
        currentVersion?.id,
        processingTime
      );

      // Only authenticated users can generate images now

      setGeneratedImage(data.imageUrl);
      
      // Mode-specific post-generation behavior
      if (mode === 'add') {
        // Add generated image to reference images
        const newImage: ImageData = { url: data.imageUrl, isGenerated: true };
        setSelectedImages(prev => [...prev, newImage]);
        setMode('edit'); // Switch back to edit mode
        toast.success("Image created and added to references!");
      } else if (mode === 'start') {
        // Add generated image to reference images (first in fresh set)
        const newImage: ImageData = { url: data.imageUrl, isGenerated: true };
        setSelectedImages([newImage]);
        setMode('edit'); // Switch to edit mode after generation
        toast.success("Image created and added to references!");
      } else {
        toast.success("Image edited successfully!");
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error(error.message || "Failed to generate image. Please try again.");
      
      // Refund credit on error
      // For authenticated users, we'd need to implement credit refund
      // This would require updating the user_credits table
    } finally {
      setGenerating(false);
    }
  }, [prompt, selectedImages, state.currentSession?.id, createSession, addVersion, setGenerating, getCurrentVersion, user, deductCredit]);

  const handleDownload = useCallback(() => {
    const currentVersion = getCurrentVersion();
    const imageUrl = currentVersion?.image_url || generatedImage;
    
    if (imageUrl) {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `nano-editor-${Date.now()}.png`;
      link.click();
      toast.success("Image downloaded!");
    }
  }, [getCurrentVersion, generatedImage]);

  const handleVersionSelect = useCallback((versionId: string) => {
    jumpToVersion(versionId);
    const version = state.history.find(v => v.id === versionId);
    if (version) {
      setGeneratedImage(version.image_url);
      setPrompt(version.prompt);
    }
  }, [jumpToVersion, state.history]);

  const currentVersion = getCurrentVersion();
  const displayImage = currentVersion?.image_url || generatedImage;

  return (
    <CreditGuard onUpgrade={() => setUpgradeModalOpen(true)}>
      <div className={`grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[340px_1fr] 2xl:grid-cols-[360px_1fr] gap-6 ${className}`}>
        {/* Left Column - Controls */}
        <div className="space-y-6">
        {/* Upload Section */}
        <Card className="border-0 shadow-elegant">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Reference Images</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-8"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleFileUpload}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDrawImage}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Draw Image
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />
              <ImageUploader
                onImagesSelect={handleImagesSelect}
                currentImages={selectedImages}
                onClearImages={handleClearImages}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prompt Section */}
        <Card className="border-0 shadow-elegant">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Prompt</h3>
            
            {/* Mode Selection */}
            <RadioGroup value={mode} onValueChange={(value: 'edit' | 'add' | 'start') => setMode(value)} className="flex gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="edit" id="edit" />
                <Label htmlFor="edit">Edit Mode</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="add" id="add" />
                <Label htmlFor="add">Add New Image</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="start" id="start" />
                <Label htmlFor="start">Start Fresh</Label>
              </div>
            </RadioGroup>

            <div className="space-y-3">
              <Textarea
                ref={textareaRef}
                id="prompt"
                placeholder={
                  mode === 'edit' ? "Describe how to edit your reference images..." :
                  mode === 'add' ? "Describe the new image to add to references..." :
                  "Describe what you want to create..."
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-20 resize-none"
              />
            </div>
            
            <Button 
              onClick={handleGenerate}
              disabled={state.isGenerating || !prompt.trim() || (mode === 'edit' && selectedImages.length === 0)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              {state.isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {mode === 'edit' ? "Editing..." : mode === 'add' ? "Adding..." : "Creating..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  {mode === 'edit' ? "Edit Images" : mode === 'add' ? "Add Image" : "Create Image"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Timeline Section - Always visible */}
        <Card className="border-0 shadow-elegant">
          <CardContent className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Timeline</h3>
              {state.history.length > 0 ? (
                <ImageTimeline
                  versions={state.history}
                  currentVersionId={state.currentVersionId}
                  onVersionSelect={handleVersionSelect}
                  onUseAsReference={handleUseAsReference}
                  onMarkImage={handleMarkImage}
                />
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <p className="text-base">No versions yet.</p>
                  <p className="text-sm mt-1">Generate your first image to see the timeline.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Result (larger, always visible) */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card className="border-0 shadow-elegant">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Result</h3>
                {displayImage && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleUseAsReference(displayImage)} 
                      variant="outline" 
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add as Reference
                    </Button>
                    <Button onClick={handleDownload} variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
              
              {displayImage ? (
                <div className="relative group">
                  <img
                    src={displayImage}
                    alt="Generated"
                    className="w-full rounded-lg shadow-md"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-smooth rounded-lg" />
                </div>
              ) : (
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Your generated image will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
        
        <DrawingModal
          isOpen={isDrawingModalOpen}
          onClose={() => setIsDrawingModalOpen(false)}
          onSubmit={handleDrawingSubmit}
        />
        
        <ImageMarkingModal
          isOpen={isMarkingModalOpen}
          onClose={() => setIsMarkingModalOpen(false)}
          onSubmit={handleMarkingSubmit}
          imageUrl={markingImageUrl}
        />
        
        <UpgradeModal 
          open={upgradeModalOpen} 
          onOpenChange={setUpgradeModalOpen}
        />
      </div>
    </CreditGuard>
  );
};