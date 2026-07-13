import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, FileText, Loader2, Search } from 'lucide-react';
import { PromptSnippetService, PromptSnippet } from '@/services/promptSnippetService';
import { toast } from 'sonner';

interface PromptSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: string;
  onLoadSnippet: (content: string) => void;
  defaultTab?: 'save' | 'load';
}

export const PromptSnippetModal: React.FC<PromptSnippetModalProps> = ({
  isOpen,
  onClose,
  currentPrompt,
  onLoadSnippet,
  defaultTab = 'save',
}) => {
  const [snippets, setSnippets] = useState<PromptSnippet[]>([]);
  const [snippetName, setSnippetName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (isOpen) {
      loadSnippets();
    }
    setActiveTab(defaultTab);
  }, [isOpen, defaultTab]);

  const loadSnippets = async () => {
    setLoading(true);
    try {
      const data = await PromptSnippetService.listSnippets();
      setSnippets(data);
    } catch (err) {
      toast.error('Failed to load snippets');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!snippetName.trim()) {
      toast.error('Please enter a snippet name');
      return;
    }
    if (!currentPrompt.trim()) {
      toast.error('No prompt to save');
      return;
    }

    setSaving(true);
    try {
      await PromptSnippetService.saveSnippet(snippetName, currentPrompt);
      toast.success('Snippet saved!');
      setSnippetName('');
      loadSnippets();
      setActiveTab('load');
    } catch (err) {
      toast.error('Failed to save snippet');
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = (snippet: PromptSnippet) => {
    onLoadSnippet(snippet.content);
    toast.success(`Loaded "${snippet.name}"`);
    onClose();
  };

  const handleDelete = async (snippetId: string, snippetName: string) => {
    try {
      await PromptSnippetService.deleteSnippet(snippetId);
      toast.success(`Deleted "${snippetName}"`);
      setSnippets(snippets.filter(s => s.id !== snippetId));
    } catch (err) {
      toast.error('Failed to delete snippet');
    }
  };

  const filteredSnippets = snippets.filter(
    s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Prompt Snippets</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'save' | 'load')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="save">Save</TabsTrigger>
            <TabsTrigger value="load">My Snippets</TabsTrigger>
          </TabsList>

          <TabsContent value="save" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Snippet Name</Label>
              <Input
                placeholder="e.g., Product Photo Enhancement"
                value={snippetName}
                onChange={(e) => setSnippetName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prompt Preview</Label>
              <div className="p-3 bg-muted rounded-md text-sm max-h-32 overflow-y-auto whitespace-pre-wrap">
                {currentPrompt || <span className="text-muted-foreground italic">No prompt to save</span>}
              </div>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saving || !currentPrompt.trim() || !snippetName.trim()}
              className="w-full"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Snippet
            </Button>
          </TabsContent>

          <TabsContent value="load" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search snippets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSnippets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No snippets match your search' : 'No saved snippets yet'}
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {filteredSnippets.map((snippet) => (
                    <div
                      key={snippet.id}
                      className="p-3 border rounded-md hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-medium text-sm truncate">{snippet.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {snippet.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLoad(snippet)}
                            className="h-7 px-2 text-xs"
                          >
                            Load
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(snippet.id, snippet.name)}
                            className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
