-- Reset all user credits to 0 and update credit limits based on subscription tiers
UPDATE public.user_credits 
SET credits_used = 0,
    credits_limit = CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.user_subscriptions 
        WHERE user_subscriptions.user_id = user_credits.user_id 
        AND subscription_tier = 'pro'
      ) THEN 100
      ELSE 20
    END,
    updated_at = now();

-- Update default credit limit for new users
ALTER TABLE public.user_credits 
ALTER COLUMN credits_limit SET DEFAULT 20;