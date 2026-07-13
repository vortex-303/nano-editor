import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Infinity as InfinityIcon, Sparkles, Clock } from "lucide-react";

interface TrialBadgeProps {
  onUpgrade?: () => void;
}

export const TrialBadge = ({ onUpgrade }: TrialBadgeProps) => {
  const { user, subscription } = useAuth();
  const { isAdmin } = useRole();
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTrialEndsAt(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("trial_ends_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setTrialEndsAt(data?.trial_ends_at ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const isPro = subscription?.tier === "pro" && subscription?.status === "active";

  if (isAdmin) {
    return (
      <Badge variant="destructive" className="gap-1">
        <InfinityIcon className="h-3 w-3" /> Admin
      </Badge>
    );
  }

  if (isPro) {
    return (
      <Badge className="gap-1">
        <Crown className="h-3 w-3" /> Pro
      </Badge>
    );
  }

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0;
  const inTrial = daysLeft > 0;

  return (
    <div className="flex items-center gap-2">
      {inTrial ? (
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3 w-3 text-primary" />
          Trial · {daysLeft} {daysLeft === 1 ? "day" : "days"} left
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" /> Free
        </Badge>
      )}
      <Button variant="outline" size="sm" onClick={onUpgrade} className="text-xs h-7">
        <Crown className="h-3 w-3 mr-1" /> Upgrade
      </Button>
    </div>
  );
};
