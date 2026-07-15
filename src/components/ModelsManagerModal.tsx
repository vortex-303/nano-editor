import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, HardDrive, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  listCachedModels, deleteCachedModel, clearAllModels, formatBytes,
  type ModelStorageInfo,
} from '@/lib/modelManager';

interface ModelsManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ModelsManagerModal = ({ open, onOpenChange }: ModelsManagerModalProps) => {
  const [info, setInfo] = useState<ModelStorageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setInfo(await listCachedModels());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const handleDelete = async (cacheName: string, url: string) => {
    setBusy(url);
    try {
      await deleteCachedModel(cacheName, url);
      toast.success('Model removed from cache');
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const handleClearAll = async () => {
    setBusy('all');
    try {
      await clearAllModels();
      toast.success('All cached models cleared');
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" /> Downloaded models
          </DialogTitle>
          <DialogDescription>
            Local AI models are downloaded once and cached in your browser so they load instantly next time.
            Clear them here to free up disk space — they'll re-download when next needed.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Scanning cache…
          </div>
        )}

        {!loading && info && (
          <>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="text-sm">
                <span className="font-medium">{info.models.length}</span> model file{info.models.length === 1 ? '' : 's'} cached ·{' '}
                <span className="font-medium">{formatBytes(info.totalBytes)}</span>
                {info.usageBytes != null && (
                  <span className="text-muted-foreground">
                    {' '}· {formatBytes(info.usageBytes)} total site storage
                    {info.quotaBytes != null && ` of ~${formatBytes(info.quotaBytes)} available`}
                  </span>
                )}
              </div>
              {info.models.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearAll} disabled={busy === 'all'}>
                  {busy === 'all' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                  Clear all
                </Button>
              )}
            </div>

            {info.models.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No models cached yet. They download the first time you run a local-AI node.
              </p>
            )}

            <div className="space-y-2">
              {info.models.map((m) => (
                <div key={`${m.cacheName}:${m.url}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.cacheName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{formatBytes(m.bytes)}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(m.cacheName, m.url)} disabled={busy === m.url}>
                      {busy === m.url ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
