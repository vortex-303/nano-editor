import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Check, Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type BillingInterval = "monthly" | "yearly";

const FREE_FEATURES = [
  "Core nodes: Prompt, Edit, Image I/O, Crop, Draw, Effects, Convert, Pixelate",
  "Up to 3 cloud projects",
  "Up to 10 saved workflows & 10 snippets",
  "Bring your own OpenRouter key for AI actions",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Premium nodes: Social Campaign, HTML Frame, 3D Model, Halftone, Batch, Pixel Art Pro",
  "Unlimited cloud projects, workflows & snippets",
  "Priority support",
  "Bring your own OpenRouter key — no token markup, ever",
];

export const UpgradeModal = ({ open, onOpenChange }: UpgradeModalProps) => {
  const [loading, setLoading] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const { user, subscription } = useAuth();

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please sign in to upgrade");
      return;
    }

    if (typeof window !== "undefined" && window.gtag_report_conversion) {
      window.gtag_report_conversion();
    }

    setLoading(true);
    try {
      const priceId = interval === "yearly" ? "price_yearly_pro" : "price_monthly_pro";
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId,
          successUrl: `${window.location.origin}/?upgrade=success`,
          cancelUrl: `${window.location.origin}/?upgrade=cancelled`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Failed to start upgrade process. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast.error("Failed to open subscription management. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isProUser = subscription?.tier === "pro" && subscription?.status === "active";
  const price = interval === "yearly" ? "$40" : "$4";
  const suffix = interval === "yearly" ? "/year" : "/month";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span>Upgrade to Pro</span>
          </DialogTitle>
          <DialogDescription>
            Unlock every node and remove cloud-save limits. Bring your own AI key — we never mark up tokens.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Free Plan */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span>Free</span>
                </CardTitle>
                {!isProUser && <Badge variant="secondary">Current</Badge>}
              </div>
              <CardDescription>Get in, build workflows, run AI with your own key</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {FREE_FEATURES.map((f) => (
                <div key={f} className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-primary/40 shadow-elegant">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span>Pro</span>
                </CardTitle>
                {isProUser && <Badge>Active</Badge>}
              </div>
              <div className="flex items-end justify-between gap-3 pt-1">
                <CardDescription className="flex items-baseline">
                  <span className="text-3xl font-bold text-foreground">{price}</span>
                  <span className="text-muted-foreground ml-1">{suffix}</span>
                  {interval === "yearly" && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      Save $8
                    </Badge>
                  )}
                </CardDescription>
                <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setInterval("monthly")}
                    className={`px-2 py-1 rounded ${
                      interval === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterval("yearly")}
                    className={`px-2 py-1 rounded ${
                      interval === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {PRO_FEATURES.map((f) => (
                <div key={f} className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <KeyRound className="h-3 w-3" />
            <span>Pro still requires your own OpenRouter key. We never resell tokens.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {isProUser ? (
              <Button onClick={handleManageSubscription} disabled={loading} className="flex-1" variant="outline">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Manage Subscription
              </Button>
            ) : (
              <Button
                onClick={handleUpgrade}
                disabled={loading}
                className="flex-1 bg-gradient-primary hover:opacity-90"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Upgrade — {price}{suffix}
              </Button>
            )}

            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
