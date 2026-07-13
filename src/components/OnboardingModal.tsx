import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, ExternalLink, Sparkles, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { setFalKey, markOnboardingComplete } from "@/lib/settingsStore";

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
  const [apiKey, setApiKey] = useState("");

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    setFalKey(trimmed);
    markOnboardingComplete();
    toast({ title: "You're all set", description: "Your fal.ai key is connected." });
    setApiKey("");
    onKeySaved?.();
    onOpenChange(false);
  };

  const handleSkip = () => {
    markOnboardingComplete();
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
              "This is a bring-your-own-key tool. You pay fal.ai directly — there is no backend and no markup."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>One fal.ai key unlocks image generation (Nano Banana), editing, upscaling and LLM features.</span>
            </div>
            <div className="flex items-start gap-2">
              <Wallet className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>Pay-per-use directly with fal.ai — no subscription, no platform markup.</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>Your key is stored only in this browser (localStorage) and sent only to fal.ai.</span>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">fal.ai API key</span>
              <a
                href="https://fal.ai/dashboard/keys"
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
                placeholder="key_id:key_secret"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoFocus
              />
              <Button onClick={handleSave} disabled={!apiKey.trim()} size="sm">
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Takes ~2 minutes: sign up at fal.ai, create a key in the dashboard, paste it here.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              {required
                ? "A fal.ai key is required to run this action."
                : "You can explore the editor first and add your key later from the menu."}
            </p>
            {!required && (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip for now
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
