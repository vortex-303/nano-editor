import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { getFalKey, isOnboardingComplete } from "@/lib/settingsStore";
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
  const [hasKey, setHasKey] = useState(() => !!getFalKey());
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<OpenOptions>({});

  const refreshKey = useCallback(async () => {
    setHasKey(!!getFalKey());
  }, []);

  // Auto-open onboarding on first run if no key saved yet
  useEffect(() => {
    if (!getFalKey() && !isOnboardingComplete()) {
      setOpts({});
      setOpen(true);
    }
  }, []);

  const openOnboarding = useCallback((o: OpenOptions = {}) => {
    setOpts(o);
    setOpen(true);
  }, []);

  const ensureKey = useCallback(
    async (o: Omit<OpenOptions, "required"> = {}) => {
      if (getFalKey()) {
        setHasKey(true);
        return true;
      }
      setOpts({ ...o, required: true });
      setOpen(true);
      return false;
    },
    []
  );

  return (
    <OnboardingContext.Provider value={{ hasKey, loading: false, openOnboarding, ensureKey, refreshKey }}>
      {children}
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
    </OnboardingContext.Provider>
  );
};
