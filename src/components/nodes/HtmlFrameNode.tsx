import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Code, Play, Download, Loader2, Globe, RotateCcw, Maximize2, ZoomIn, ZoomOut, Image } from 'lucide-react';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { supabase } from '@/integrations/supabase/client';

interface HtmlFrameNodeProps {
  data: any;
  id: string;
}

interface GeneratedCode {
  html: string;
  css: string;
  js: string;
  preview: string;
}

export const HtmlFrameNode: React.FC<HtmlFrameNodeProps> = ({ data, id }) => {
  const { updateNodeData, getConnectedNodeData } = useNodeDataContext();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [url, setUrl] = useState(data.url || '');
  const [mode, setMode] = useState(data.mode || 'generate'); // 'generate' or 'url'
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(data.generatedCode || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [zoomLevel, setZoomLevel] = useState('1x');
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [connectedImages, setConnectedImages] = useState<string[]>([]);
  const [connectedCode, setConnectedCode] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Get connected images and code
    const imageInputs = ['image1', 'image2', 'image3'].map(handle => 
      getConnectedNodeData(id, [], handle)
    ).filter(Boolean);
    
    const codeInput = getConnectedNodeData(id, [], 'codeInput');
    
    setConnectedImages(imageInputs);
    setConnectedCode(codeInput || '');
    
    updateNodeData(id, { 
      prompt,
      url,
      mode,
      generatedCode,
      preview: mode === 'generate' ? generatedCode?.preview : url,
      connectedImages: imageInputs,
      connectedCode: codeInput
    });
  }, [id, prompt, generatedCode, updateNodeData, getConnectedNodeData]);

  useEffect(() => {
    if (mode === 'generate' && generatedCode && iframeRef.current) {
      const iframe = iframeRef.current;
      const combinedHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Generated Component</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            ${generatedCode.css}
          </style>
        </head>
        <body>
          ${generatedCode.html}
          <script>
            // Sandboxed environment with limited APIs
            window.parent = null;
            window.top = null;
            
            // Safe console for debugging
            const console = {
              log: (...args) => window.parent?.postMessage({type: 'console', level: 'log', args}, '*'),
              error: (...args) => window.parent?.postMessage({type: 'console', level: 'error', args}, '*'),
              warn: (...args) => window.parent?.postMessage({type: 'console', level: 'warn', args}, '*')
            };
            
            try {
              ${generatedCode.js}
            } catch (error) {
              console.error('Runtime error:', error.message);
            }
          </script>
        </body>
        </html>
      `;
      
      const blob = new Blob([combinedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframe.src = url;
      
      return () => URL.revokeObjectURL(url);
    } else if (mode === 'url' && url && iframeRef.current) {
      const iframe = iframeRef.current;
      iframe.src = url;
    }
  }, [generatedCode, mode, url]);

  // Update fullscreen iframe when generatedCode changes or dialog opens
  useEffect(() => {
    if (mode === 'generate' && generatedCode && fullscreenIframeRef.current && isFullscreenOpen) {
      const iframe = fullscreenIframeRef.current;
      const combinedHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Generated Component</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            ${generatedCode.css}
          </style>
        </head>
        <body>
          ${generatedCode.html}
          <script>
            // Sandboxed environment with limited APIs
            window.parent = null;
            window.top = null;
            
            // Safe console for debugging
            const console = {
              log: (...args) => window.parent?.postMessage({type: 'console', level: 'log', args}, '*'),
              error: (...args) => window.parent?.postMessage({type: 'console', level: 'error', args}, '*'),
              warn: (...args) => window.parent?.postMessage({type: 'console', level: 'warn', args}, '*')
            };
            
            try {
              ${generatedCode.js}
            } catch (error) {
              console.error('Runtime error:', error.message);
            }
          </script>
        </body>
        </html>
      `;
      
      const blob = new Blob([combinedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframe.src = url;
      
      return () => URL.revokeObjectURL(url);
    } else if (mode === 'url' && url && fullscreenIframeRef.current && isFullscreenOpen) {
      const iframe = fullscreenIframeRef.current;
      iframe.src = url;
    }
  }, [generatedCode, mode, url, isFullscreenOpen]);

  const generateHtmlComponent = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Missing prompt",
        description: "Please enter a description for the HTML component",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-html-component', {
        body: { 
          prompt: prompt.trim(),
          images: connectedImages,
          code: connectedCode,
          connectedData: getConnectedNodeData(id, [], 'input') // Get any connected input data
        }
      });

      if (error) throw error;

      if (result.success && result.code) {
        setGeneratedCode(result.code);
        setActiveTab('preview');
        toast({
          title: "Component generated!",
          description: "Your HTML component is ready to preview",
        });
      } else {
        throw new Error(result.error || 'Failed to generate component');
      }
    } catch (error) {
      console.error('Error generating HTML component:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate HTML component",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadComponent = () => {
    if (!generatedCode) return;

    const combinedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Component</title>
  <style>
${generatedCode.css}
  </style>
</head>
<body>
${generatedCode.html}
  <script>
${generatedCode.js}
  </script>
</body>
</html>`;

    const blob = new Blob([combinedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'component.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: "Component saved as component.html",
    });
  };

  const reloadPreview = () => {
    if (generatedCode) {
      // Force re-render by updating the iframe src
      const iframe = iframeRef.current;
      if (iframe) {
        const currentSrc = iframe.src;
        iframe.src = '';
        setTimeout(() => {
          iframe.src = currentSrc;
        }, 100);
      }
      
      // Also reload fullscreen if open
      if (isFullscreenOpen && fullscreenIframeRef.current) {
        const fullscreenIframe = fullscreenIframeRef.current;
        const currentSrc = fullscreenIframe.src;
        fullscreenIframe.src = '';
        setTimeout(() => {
          fullscreenIframe.src = currentSrc;
        }, 100);
      }
      
      toast({
        title: "Reloaded",
        description: "Preview has been refreshed",
      });
    }
  };

  const getZoomScale = (zoom: string) => {
    switch (zoom) {
      case '2x': return 2;
      case '3x': return 3;
      case '4x': return 4;
      default: return 1;
    }
  };

  const getNodeWidth = (zoom: string) => {
    switch (zoom) {
      case '2x': return 'w-[600px]';
      case '3x': return 'w-[800px]';
      case '4x': return 'w-[1000px]';
      default: return 'w-[400px]';
    }
  };

  const getPreviewHeight = (zoom: string) => {
    switch (zoom) {
      case '2x': return 'h-[400px]';
      case '3x': return 'h-[600px]';
      case '4x': return 'h-[800px]';
      default: return 'h-[200px]';
    }
  };

  return (
    <Card className={`${getNodeWidth(zoomLevel)} min-h-[500px]`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4" />
            HTML Frame
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Plugin
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Input Handles */}
        <Handle type="target" position={Position.Left} id="input" className="w-3 h-3" />
        <Handle type="target" position={Position.Left} id="image1" className="w-3 h-3 bg-blue-500" style={{ top: '25%' }} />
        <Handle type="target" position={Position.Left} id="image2" className="w-3 h-3 bg-blue-500" style={{ top: '35%' }} />
        <Handle type="target" position={Position.Left} id="image3" className="w-3 h-3 bg-blue-500" style={{ top: '45%' }} />
        <Handle type="target" position={Position.Left} id="codeInput" className="w-3 h-3 bg-black" style={{ top: '55%' }} />
        
        {/* Connected Images Display */}
        {connectedImages.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Image className="w-4 h-4" />
              Connected Images ({connectedImages.length})
            </label>
            <div className="grid grid-cols-3 gap-2">
              {connectedImages.map((image, index) => (
                <div key={index} className="relative">
                  <img 
                    src={image} 
                    alt={`Connected ${index + 1}`} 
                    className="w-full h-16 object-cover rounded border"
                  />
                  <Badge variant="secondary" className="absolute top-1 right-1 text-xs px-1 py-0">
                    {index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connected Code Display */}
        {connectedCode && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Code className="w-4 h-4" />
              Connected Code
            </label>
            <pre className="bg-muted p-2 rounded text-xs max-h-20 overflow-auto whitespace-pre-wrap">
              {connectedCode.slice(0, 200)}{connectedCode.length > 200 ? '...' : ''}
            </pre>
          </div>
        )}

        {/* Mode Toggle */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Mode</label>
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Generate Code</TabsTrigger>
              <TabsTrigger value="url">Load URL</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* URL Input */}
        {mode === 'url' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Website URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-border rounded-md text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {/* Prompt Input */}
        {mode === 'generate' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Component Description</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the HTML component you want to create (e.g., 'A colorful animated button', 'A data visualization chart', 'An interactive form')"
              className="min-h-[80px] text-sm"
            />
          </div>
        )}

        {/* Generate Button */}
        {mode === 'generate' && (
          <Button 
            onClick={generateHtmlComponent}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Generate Component
              </>
            )}
          </Button>
        )}

        {/* Code Display */}
        {(mode === 'generate' && generatedCode) || (mode === 'url' && url) ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${mode === 'generate' ? 'grid-cols-4' : 'grid-cols-1'}`}>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              {mode === 'generate' && (
                <>
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                  <TabsTrigger value="js">JS</TabsTrigger>
                </>
              )}
            </TabsList>
            
            <TabsContent value="preview" className="mt-4">
              <div className="space-y-3">
                {/* Preview Controls */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={reloadPreview}
                      size="sm"
                      variant="outline"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reload
                    </Button>
                    
                    <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Maximize2 className="w-3 h-3 mr-1" />
                          Fullscreen
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[98vw] h-[98vh] max-w-none p-0 m-0">
                        <DialogHeader className="p-4 pb-2 border-b">
                          <DialogTitle>HTML Component Preview</DialogTitle>
                          <DialogDescription>
                            View your generated HTML component in fullscreen mode
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 p-4">
                          <iframe
                            ref={fullscreenIframeRef}
                            className="w-full h-[calc(98vh-8rem)] border rounded bg-white"
                            sandbox="allow-scripts allow-same-origin"
                            title="Fullscreen Component Preview"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select value={zoomLevel} onValueChange={setZoomLevel}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1x">1x</SelectItem>
                        <SelectItem value="2x">2x</SelectItem>
                        <SelectItem value="3x">3x</SelectItem>
                        <SelectItem value="4x">4x</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      onClick={downloadComponent}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                
                {/* Preview Container */}
                <div className="relative overflow-hidden border rounded-md bg-white">
                  <iframe
                    ref={iframeRef}
                    className={`w-full ${getPreviewHeight(zoomLevel)} border-0 bg-white`}
                    sandbox="allow-scripts allow-same-origin"
                    title="Component Preview"
                  />
                </div>
              </div>
            </TabsContent>
            
            {mode === 'generate' && generatedCode && (
              <>
                <TabsContent value="html" className="mt-4">
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                      {generatedCode.html}
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="css" className="mt-4">
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                      {generatedCode.css}
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="js" className="mt-4">
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                      {generatedCode.js}
                    </pre>
                  </div>
                </TabsContent>
              </>
            )}
          </Tabs>
        ) : null}

        {/* Output Handles */}
        <Handle type="source" position={Position.Right} id="output" className="w-3 h-3" />
        <Handle type="source" position={Position.Right} id="codeOutput" className="w-3 h-3 bg-black" style={{ top: '25%' }} />
      </CardContent>
    </Card>
  );
};