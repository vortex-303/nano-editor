import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, ExternalLink, Sparkles, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, hides the "Skip for now" button — used when an AI action requires a key */
  required?: boolean;
  /** Optional title override (e.g. "Connect a key to generate") */
  title?: string;
  /** Optional context line shown above the explainer */
  reason?: string;
  /** Called after the key is successfully saved */
  onKeySaved?: () => void;
}

export const OnboardingModal = ({
  open,
  onOpenChange,
  required = false,
  title,
  reason,
  onKeySaved,
}: OnboardingModalProps) => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const markOnboardingDone = async () => {
    if (!user) return;
    await supabase
      .from("user_subscriptions")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("user_id", user.id);
  };

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("manage-api-keys", {
      body: { action: "save", provider: "openrouter", apiKey: trimmed },
    });
    setSaving(false);
    if (error || data?.error) {
      toast({
        title: "Could not save key",
        description: error?.message || data?.error || "Please double-check the key.",
        variant: "destructive",
      });
      return;
    }
    await markOnboardingDone();
    toast({ title: "You're all set", description: "Your OpenRouter key is connected." });
    setApiKey("");
    onKeySaved?.();
    onOpenChange(false);
  };

  const handleSkip = async () => {
    setSkipping(true);
    await markOnboardingDone();
    setSkipping(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && required) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-[520px]"
        onPointerDownOutside={(e) => required && e.preventDefault()}
        onEscapeKeyDown={(e) => required && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {title || "Welcome — connect your AI key"}
          </DialogTitle>
          <DialogDescription>
            {reason ||
              "This is a bring-your-own-key tool. You pay your AI provider directly — we never mark up tokens."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>One key unlocks GPT, Claude, Gemini, Llama and 100+ models via OpenRouter.</span>
            </div>
            <div className="flex items-start gap-2">
              <Wallet className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>You pay your provider directly — no platform markup on generations.</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>Your key is encrypted (AES-GCM) and only decrypted server-side at request time.</span>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">OpenRouter API key</span>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Get a key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="sk-or-v1-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={saving}
                autoFocus
              />
              <Button onClick={handleSave} disabled={!apiKey.trim() || saving} size="sm">
                {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Takes ~2 minutes: sign up at openrouter.ai, create a key, paste it here.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              {required
                ? "An OpenRouter key is required to run this action."
                : "You can explore the editor first and add your key later from the menu."}
            </p>
            {!required && (
              <Button variant="ghost" size="sm" onClick={handleSkip} disabled={skipping || saving}>
                {skipping && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Skip for now
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
