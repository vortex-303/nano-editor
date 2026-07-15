import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Trash2, Puzzle, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  listInstalledPlugins, installPlugin, installFromUrl, uninstallPlugin, setPluginEnabled,
  fetchRegistryIndex, parseManifest, generateManifestFromHuggingFace,
  type RegistryEntry,
} from '@/plugins/loader';
import type { InstalledPlugin } from '@/plugins/types';

interface PluginManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PluginManagerModal = ({ open, onOpenChange }: PluginManagerModalProps) => {
  const [installed, setInstalled] = useState<InstalledPlugin[]>([]);
  const [registry, setRegistry] = useState<RegistryEntry[]>([]);
  const [registryError, setRegistryError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [hfInput, setHfInput] = useState('');

  const refresh = async () => {
    setInstalled(await listInstalledPlugins());
  };

  useEffect(() => {
    if (!open) return;
    refresh();
    fetchRegistryIndex()
      .then((entries) => { setRegistry(entries); setRegistryError(''); })
      .catch((e) => setRegistryError(e instanceof Error ? e.message : 'Registry unavailable'));
  }, [open]);

  const installedIds = new Set(installed.map((p) => p.manifest.id));

  const handleInstallFromRegistry = async (entry: RegistryEntry) => {
    setBusy(entry.id);
    try {
      const response = await fetch(entry.manifestUrl);
      if (!response.ok) throw new Error(`Could not fetch manifest (${response.status})`);
      const manifest = parseManifest(await response.json());
      await installPlugin(manifest, 'registry');
      toast.success(`${manifest.name} installed — check the node palette`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Install failed');
    } finally {
      setBusy(null);
    }
  };

  const handleInstallFromUrl = async () => {
    if (!urlInput.trim()) return;
    setBusy('url');
    try {
      const plugin = await installFromUrl(urlInput.trim());
      toast.success(`${plugin.manifest.name} installed`);
      setUrlInput('');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Install failed');
    } finally {
      setBusy(null);
    }
  };

  const handleInstallFromHf = async () => {
    if (!hfInput.trim()) return;
    setBusy('hf');
    try {
      const manifest = await generateManifestFromHuggingFace(hfInput.trim());
      if (installedIds.has(manifest.id)) throw new Error(`"${manifest.id}" is already installed`);
      await installPlugin(manifest, 'huggingface');
      toast.success(`${manifest.name} installed — check the node palette`);
      setHfInput('');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Install failed');
    } finally {
      setBusy(null);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    await uninstallPlugin(pluginId);
    toast.success('Plugin removed');
    await refresh();
  };

  const handleToggle = async (pluginId: string, enabled: boolean) => {
    await setPluginEnabled(pluginId, enabled);
    await refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" /> Plugins
          </DialogTitle>
          <DialogDescription>
            Community nodes for Nano Editor. Declarative plugins are data-only manifests — no third-party code runs.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="browse">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="installed">Installed ({installed.length})</TabsTrigger>
            <TabsTrigger value="add">Add your own</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-3 pt-3">
            {registryError && <p className="text-xs text-muted-foreground">{registryError}</p>}
            {registry.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-xl leading-none mt-0.5">{entry.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{entry.name}</span>
                      {entry.modelSizeMB && (
                        <Badge variant="outline" className="text-[10px]">~{entry.modelSizeMB}MB</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={installedIds.has(entry.id) ? 'secondary' : 'default'}
                  disabled={installedIds.has(entry.id) || busy === entry.id}
                  onClick={() => handleInstallFromRegistry(entry)}
                  className="shrink-0"
                >
                  {busy === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> :
                    installedIds.has(entry.id) ? 'Installed' : <><Download className="h-3 w-3 mr-1" />Install</>}
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="installed" className="space-y-3 pt-3">
            {installed.length === 0 && (
              <p className="text-xs text-muted-foreground">No plugins installed yet — browse the registry or add one from a URL.</p>
            )}
            {installed.map((plugin) => (
              <div key={plugin.manifest.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-xl leading-none mt-0.5">{plugin.manifest.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{plugin.manifest.name}</span>
                      <Badge variant="outline" className="text-[10px]">v{plugin.manifest.version}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{plugin.origin}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{plugin.manifest.description}</p>
                    {plugin.manifest.homepage && (
                      <a href={plugin.manifest.homepage} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                        Homepage <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={plugin.enabled}
                    onCheckedChange={(v) => handleToggle(plugin.manifest.id, v)}
                  />
                  <Button variant="outline" size="sm" onClick={() => handleUninstall(plugin.manifest.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="add" className="space-y-4 pt-3">
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">From a Hugging Face model</p>
              <p className="text-xs text-muted-foreground">
                Paste any Transformers.js-compatible model URL — a node is generated automatically (captioning, classification, depth, background removal, detection...).
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://huggingface.co/onnx-community/..."
                  value={hfInput}
                  onChange={(e) => setHfInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInstallFromHf()}
                  className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleInstallFromHf} disabled={!hfInput.trim() || busy === 'hf'}>
                  {busy === 'hf' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">From a manifest URL</p>
              <p className="text-xs text-muted-foreground">
                Install a nano-node manifest (JSON) hosted anywhere.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/my-node/manifest.json"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInstallFromUrl()}
                  className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleInstallFromUrl} disabled={!urlInput.trim() || busy === 'url'}>
                  {busy === 'url' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
