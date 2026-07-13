import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminAnalyticsService, UserGenerationHistory } from '@/services/adminAnalyticsService';
import { Loader2, Image, Clock, FileText } from 'lucide-react';

interface UserDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userEmail: string;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  open,
  onOpenChange,
  userId,
  userEmail
}) => {
  const [history, setHistory] = useState<UserGenerationHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      loadHistory();
    }
  }, [open, userId]);

  const loadHistory = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await AdminAnalyticsService.getUserGenerationHistory(userId, 50);
      if (result.success && result.data) {
        setHistory(result.data);
      }
    } catch (error) {
      console.error('Failed to load user history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatProcessingTime = (ms: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            User Details: {userEmail}
          </DialogTitle>
          <DialogDescription>
            View detailed generation history and user activity
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="generations" className="w-full">
          <TabsList>
            <TabsTrigger value="generations">Generations</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
          </TabsList>

          <TabsContent value="generations">
            {loading ? (
              <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No generation history found
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-2">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      className="border rounded-lg overflow-hidden hover:border-primary transition-colors"
                    >
                      <div className="aspect-square bg-muted relative">
                        <img 
                          src={item.image_url} 
                          alt="Generated"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-2 space-y-1">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.prompt}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {item.model_used?.replace('gemini-', '') || 'unknown'}
                          </Badge>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatProcessingTime(item.processing_time_ms)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="prompts">
            {loading ? (
              <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No prompts found
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 p-2">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{item.prompt}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{formatDate(item.created_at)}</span>
                            <span>•</span>
                            <span>{formatProcessingTime(item.processing_time_ms)}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-[10px]">
                              {item.model_used?.replace('gemini-', '') || 'unknown'}
                            </Badge>
                          </div>
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
