import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle2, KeyRound, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getFalKey, setFalKey, clearFalKey,
  getUnsplashKey, setUnsplashKey, clearUnsplashKey,
  keyHint,
} from "@/lib/settingsStore";

interface ApiKeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Provider = "fal" | "unsplash";

const PROVIDERS: { id: Provider; label: string; help: string; url: string; placeholder: string }[] = [
  { id: "fal", label: "fal.ai", help: "Powers all AI features — image generation (Nano Banana), editing, upscaling and text models. Pay-per-use.", url: "https://fal.ai/dashboard/keys", placeholder: "key_id:key_secret" },
  { id: "unsplash", label: "Unsplash (optional)", help: "Enables the stock photo search. Free Access Key, 50 requests/hour.", url: "https://unsplash.com/developers", placeholder: "Access Key" },
];

const providerStore = {
  fal: { get: getFalKey, set: setFalKey, clear: clearFalKey },
  unsplash: { get: getUnsplashKey, set: setUnsplashKey, clear: clearUnsplashKey },
} as const;

export const ApiKeysModal = ({ open, onOpenChange }: ApiKeysModalProps) => {
  const [savedKeys, setSavedKeys] = useState<Record<Provider, string | null>>({ fal: null, unsplash: null });
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const load = () => {
    setSavedKeys({ fal: getFalKey(), unsplash: getUnsplashKey() });
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const save = (provider: Provider) => {
    const apiKey = (inputs[provider] || "").trim();
    if (!apiKey) return;
    providerStore[provider].set(apiKey);
    toast({ title: "Key saved", description: `Your ${provider === "fal" ? "fal.ai" : "Unsplash"} key is stored in this browser.` });
    setInputs((s) => ({ ...s, [provider]: "" }));
    load();
  };

  const remove = (provider: Provider) => {
    providerStore[provider].clear();
    toast({ title: "Key removed" });
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Bring Your Own AI Keys
          </DialogTitle>
          <DialogDescription>
            Keys are stored only in this browser's localStorage and sent directly to the provider — there is no backend.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {PROVIDERS.map((p) => {
            const existing = savedKeys[p.id];
            return (
              <div key={p.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">{p.label}</Label>
                      {existing && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Connected · {keyHint(existing)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.help}</p>
                  </div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                  >
                    Get key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={existing ? "Replace key…" : p.placeholder}
                    value={inputs[p.id] || ""}
                    onChange={(e) => setInputs((s) => ({ ...s, [p.id]: e.target.value }))}
                  />
                  <Button
                    onClick={() => save(p.id)}
                    disabled={!inputs[p.id]}
                    size="sm"
                  >
                    {existing ? "Replace" : "Save"}
                  </Button>
                  {existing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => remove(p.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          Generations bill your fal.ai account directly. Clearing your browser data removes the keys.
        </p>
      </DialogContent>
    </Dialog>
  );
};
