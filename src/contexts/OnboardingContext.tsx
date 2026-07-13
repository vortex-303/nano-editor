import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingModal } from "@/components/OnboardingModal";

interface OpenOptions {
  required?: boolean;
  title?: string;
  reason?: string;
  onKeySaved?: () => void;
}

interface OnboardingContextType {
  hasKey: boolean;
  loading: boolean;
  /** Open the BYOK modal manually (e.g. from settings) */
  openOnboarding: (opts?: OpenOptions) => void;
  /** Returns true if a key exists; otherwise opens the modal in `required` mode and returns false */
  ensureKey: (opts?: Omit<OpenOptions, "required">) => Promise<boolean>;
  refreshKey: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
};

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<OpenOptions>({});

  const refreshKey = useCallback(async () => {
    if (!user) {
      setHasKey(false);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_api_keys")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", "openrouter")
      .maybeSingle();
    setHasKey(!!data);
    setLoading(false);
  }, [user]);

  // Auto-open onboarding once after signup if not yet completed and no key
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const [{ data: keyRow }, { data: subRow }] = await Promise.all([
        supabase
          .from("user_api_keys")
          .select("id")
          .eq("user_id", user.id)
          .eq("provider", "openrouter")
          .maybeSingle(),
        supabase
          .from("user_subscriptions")
          .select("onboarding_completed_at")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const keyExists = !!keyRow;
      setHasKey(keyExists);
      setLoading(false);
      if (!keyExists && !subRow?.onboarding_completed_at) {
        setOpts({});
        setOpen(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const openOnboarding = useCallback((o: OpenOptions = {}) => {
    setOpts(o);
    setOpen(true);
  }, []);

  const ensureKey = useCallback(
    async (o: Omit<OpenOptions, "required"> = {}) => {
      await refreshKey();
      if (hasKey) return true;
      // re-check fresh in case state was stale
      if (user) {
        const { data } = await supabase
          .from("user_api_keys")
          .select("id")
          .eq("user_id", user.id)
          .eq("provider", "openrouter")
          .maybeSingle();
        if (data) {
          setHasKey(true);
          return true;
        }
      }
      setOpts({ ...o, required: true });
      setOpen(true);
      return false;
    },
    [hasKey, user, refreshKey]
  );

  return (
    <OnboardingContext.Provider value={{ hasKey, loading, openOnboarding, ensureKey, refreshKey }}>
      {children}
      {user && (
        <OnboardingModal
          open={open}
          onOpenChange={setOpen}
          required={opts.required}
          title={opts.title}
          reason={opts.reason}
          onKeySaved={async () => {
            await refreshKey();
            opts.onKeySaved?.();
          }}
        />
      )}
    </OnboardingContext.Provider>
  );
};
