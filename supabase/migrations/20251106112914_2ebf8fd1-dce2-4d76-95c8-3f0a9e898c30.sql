-- Fix 1: Remove user UPDATE policies on user_credits and user_subscriptions
-- Users should NOT be able to modify their own credits or subscription tiers

-- Drop dangerous policies that allow users to update their own credits
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.user_subscriptions;

-- Credits and subscriptions should only be modified by:
-- 1. Service role (edge functions)
-- 2. Admins via admin panel
-- 3. Automated triggers (e.g., monthly reset)

-- The existing "Service role can update credits" and "Admins can update any credits" policies
-- are sufficient for legitimate operations