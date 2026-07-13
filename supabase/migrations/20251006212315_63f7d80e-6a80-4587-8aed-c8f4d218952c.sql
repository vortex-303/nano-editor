-- Remove overly permissive service role SELECT policy on user_subscriptions
-- This policy allowed full data access if service credentials were compromised
DROP POLICY IF EXISTS "Service role can view subscriptions" ON public.user_subscriptions;

-- Remove overly permissive service role SELECT policy on user_credits
-- This prevents unauthorized access to email addresses and credit data
DROP POLICY IF EXISTS "Service role can view all credits" ON public.user_credits;

-- Note: We keep the service role INSERT and UPDATE policies as they are needed
-- for the check-subscription edge function to upsert data after authenticating users.
-- The edge function validates user authentication before performing any operations.