import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, CheckCircle2, KeyRound, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ApiKeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Provider = "openrouter";

const PROVIDERS: { id: Provider; label: string; help: string; url: string; placeholder: string }[] = [
  { id: "openrouter", label: "OpenRouter", help: "Universal gateway — access GPT, Claude, Gemini, Llama and 100+ models with one key", url: "https://openrouter.ai/keys", placeholder: "sk-or-v1-..." },
];

interface SavedKey {
  id: string;
  provider: Provider;
  key_hint: string;
  updated_at: string;
}

export const ApiKeysModal = ({ open, onOpenChange }: ApiKeysModalProps) => {
  const [keys, setKeys] = useState<SavedKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-api-keys", { body: { action: "list" } });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load keys", description: error.message, variant: "destructive" });
      return;
    }
    setKeys(data?.keys ?? []);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const save = async (provider: Provider) => {
    const apiKey = (inputs[provider] || "").trim();
    if (!apiKey) return;
    setSaving(provider);
    const { data, error } = await supabase.functions.invoke("manage-api-keys", {
      body: { action: "save", provider, apiKey },
    });
    setSaving(null);
    if (error || data?.error) {
      toast({ title: "Could not save key", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Key saved", description: `${provider} key validated and stored securely.` });
    setInputs((s) => ({ ...s, [provider]: "" }));
    load();
  };

  const remove = async (provider: Provider) => {
    setSaving(provider);
    const { error } = await supabase.functions.invoke("manage-api-keys", {
      body: { action: "delete", provider },
    });
    setSaving(null);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
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
            Use your own provider keys instead of platform credits. Keys are encrypted (AES-GCM) at rest and only decrypted server-side when running a generation.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        )}

        <div className="space-y-5">
          {PROVIDERS.map((p) => {
            const existing = keys.find((k) => k.provider === p.id);
            return (
              <div key={p.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">{p.label}</Label>
                      {existing && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Connected · {existing.key_hint}
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
                    disabled={saving === p.id}
                  />
                  <Button
                    onClick={() => save(p.id)}
                    disabled={!inputs[p.id] || saving === p.id}
                    size="sm"
                  >
                    {saving === p.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    {existing ? "Replace" : "Save"}
                  </Button>
                  {existing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => remove(p.id)}
                      disabled={saving === p.id}
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
          When a key is connected, generations using that provider will bill your account directly and won't consume Nano Editor credits.
        </p>
      </DialogContent>
    </Dialog>
  );
};
