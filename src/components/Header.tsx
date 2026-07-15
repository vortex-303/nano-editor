import { Sparkles, KeyRound, Puzzle, HardDrive, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiKeysModal } from "./ApiKeysModal";
import { PluginManagerModal } from "./PluginManagerModal";
import { ModelsManagerModal } from "./ModelsManagerModal";
import { ShortcutsModal } from "./ShortcutsModal";
import { useState, useEffect } from "react";

export const Header = () => {
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // "?" keyboard shortcut (dispatched from the editor)
  useEffect(() => {
    const open = () => setShortcutsOpen(true);
    window.addEventListener('nano:shortcuts', open);
    return () => window.removeEventListener('nano:shortcuts', open);
  }, []);

  return (
    <header className="border-b border-border/50 bg-gradient-subtle backdrop-blur-md">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-transparent rounded-lg">
              <Sparkles className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
                Nano Editor
              </h1>
              <p className="text-xs text-muted-foreground">
                Visual node-based image workflows
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts (?)">
              <Keyboard className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setModelsOpen(true)} title="Downloaded models">
              <HardDrive className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPluginsOpen(true)}>
              <Puzzle className="h-4 w-4 mr-2" />
              Plugins
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setApiKeysOpen(true)}>
              <KeyRound className="h-4 w-4 mr-2" />
              AI API Keys
            </Button>
          </div>

          <ApiKeysModal open={apiKeysOpen} onOpenChange={setApiKeysOpen} />
          <PluginManagerModal open={pluginsOpen} onOpenChange={setPluginsOpen} />
          <ModelsManagerModal open={modelsOpen} onOpenChange={setModelsOpen} />
          <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        </div>
      </div>
    </header>
  );
};
