import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Globe, Plus, Loader2, AlertCircle, Download } from 'lucide-react';
import { NodeData } from '@/types/nodeEditor';
import { useNodeDataContext } from '@/contexts/NodeDataContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useToast } from '@/components/ui/use-toast';
import { fetchUrlContext } from '@/lib/urlContext';

interface ContextNodeProps {
  data: NodeData;
  id: string;
}

interface ContextItem {
  type: 'manual' | 'url';
  content: string;
  url?: string;
  timestamp: number;
}

export const ContextNode: React.FC<ContextNodeProps> = ({ data, id }) => {
  const [urlInput, setUrlInput] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [contexts, setContexts] = useState<ContextItem[]>(data.contexts || []);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [error, setError] = useState('');
  const { updateNodeData } = useNodeDataContext();
  const { ensureKey } = useOnboarding();
  const { toast } = useToast();

  // Update node data when contexts change
  useEffect(() => {
    const combinedContext = contexts.map(ctx => ctx.content).join('\n\n');
    updateNodeData(id, { 
      contexts, 
      result: combinedContext,
      contextData: combinedContext 
    });
  }, [contexts, id, updateNodeData]);

  const handleAddManualContext = () => {
    if (!manualInput.trim()) return;
    
    const newContext: ContextItem = {
      type: 'manual',
      content: manualInput.trim(),
      timestamp: Date.now()
    };
    
    setContexts(prev => [...prev, newContext]);
    setManualInput('');
    
    toast({
      title: "Context Added",
      description: "Manual context has been added successfully.",
    });
  };

  const handleFetchUrlContext = async () => {
    if (!urlInput.trim()) return;
    
    setFetchingUrl(true);
    setError('');
    
    try {
      if (!(await ensureKey())) {
        return;
      }

      const { context } = await fetchUrlContext(urlInput.trim());

      const newContext: ContextItem = {
        type: 'url',
        content: context,
        url: urlInput.trim(),
        timestamp: Date.now()
      };
      
      setContexts(prev => [...prev, newContext]);
      setUrlInput('');
      
      toast({
        title: "URL Context Fetched",
        description: "Content has been extracted and added to context.",
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch URL context';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleRemoveContext = (index: number) => {
    setContexts(prev => prev.filter((_, i) => i !== index));
  };

  const getCharacterCount = () => {
    return contexts.reduce((total, ctx) => total + ctx.content.length, 0);
  };

  return (
    <Card className="w-80 p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-primary" />
            <span className="text-sm font-medium">Context</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {getCharacterCount()} chars
          </Badge>
        </div>

        {/* URL Input Section */}
        <div className="space-y-2">
          <Label className="text-xs">Fetch from URL</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/article"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !fetchingUrl) {
                  handleFetchUrlContext();
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchUrlContext}
              disabled={fetchingUrl || !urlInput.trim()}
            >
              {fetchingUrl ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle size={12} />
              {error}
            </div>
          )}
        </div>

        {/* Manual Input Section */}
        <div className="space-y-2">
          <Label className="text-xs">Add Manual Context</Label>
          <div className="space-y-2">
            <Textarea
              placeholder="Add context manually..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="text-xs min-h-16 resize-none"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddManualContext}
              disabled={!manualInput.trim()}
              className="w-full"
            >
              <Plus size={14} />
              Add Manual Content
            </Button>
          </div>
        </div>

        {/* Context Items Display */}
        {contexts.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Context Items ({contexts.length})</Label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {contexts.map((context, index) => (
                <div key={index} className="text-xs p-2 bg-muted rounded border">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={context.type === 'url' ? 'default' : 'secondary'} className="text-[10px] h-4">
                      {context.type === 'url' ? 'URL' : 'Manual'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveContext(index)}
                      className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </Button>
                  </div>
                  {context.url && (
                    <div className="text-[10px] text-muted-foreground mb-1 truncate">
                      {context.url}
                    </div>
                  )}
                  <div className="line-clamp-3">
                    {context.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="context"
        className="w-3 h-3 bg-orange-500"
      />
    </Card>
  );
};