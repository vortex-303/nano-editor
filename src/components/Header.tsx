import { Sparkles, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiKeysModal } from "./ApiKeysModal";
import { useState } from "react";

export const Header = () => {
  const [apiKeysOpen, setApiKeysOpen] = useState(false);

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

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => setApiKeysOpen(true)}>
              <KeyRound className="h-4 w-4 mr-2" />
              AI API Keys
            </Button>
          </div>

          <ApiKeysModal
            open={apiKeysOpen}
            onOpenChange={setApiKeysOpen}
          />
        </div>
      </div>
    </header>
  );
};
