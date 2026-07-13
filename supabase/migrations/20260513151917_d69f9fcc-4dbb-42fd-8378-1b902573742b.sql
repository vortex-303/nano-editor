
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

UPDATE public.user_subscriptions
SET trial_ends_at = GREATEST(created_at + interval '30 days', now() + interval '7 days')
WHERE trial_ends_at IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, email, credits_used, credits_limit)
  VALUES (NEW.id, NEW.email, 0, 0);

  INSERT INTO public.user_subscriptions (user_id, email, subscription_status, subscription_tier, trial_ends_at)
  VALUES (NEW.id, NEW.email, 'inactive', 'free', now() + interval '30 days');

  RETURN NEW;
END;
$function$;
