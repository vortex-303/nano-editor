-- Fix critical security issues: Secure user_credits and user_subscriptions tables
-- These tables contain sensitive PII and must not be publicly accessible

-- First, drop all existing policies on user_credits to rebuild them securely
DROP POLICY IF EXISTS "Admins can manage all user credits" ON public.user_credits;
DROP POLICY IF EXISTS "Admins can view all user credits" ON public.user_credits;
DROP POLICY IF EXISTS "Service role can manage credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can view their own credits" ON public.user_credits;

-- Create secure policies for user_credits
-- Only authenticated users can view their own credits
CREATE POLICY "Users can view own credits"
  ON public.user_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only authenticated users can update their own credits
CREATE POLICY "Users can update own credits"
  ON public.user_credits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only service role can insert credits (for new user creation)
CREATE POLICY "Service role can insert credits"
  ON public.user_credits
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service role can update any credits (for admin operations)
CREATE POLICY "Service role can update credits"
  ON public.user_credits
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view all credits
CREATE POLICY "Admins can view all credits"
  ON public.user_credits
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Now fix user_subscriptions policies
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;

-- Create secure policies for user_subscriptions
-- Only authenticated users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only authenticated users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
  ON public.user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only service role can insert subscriptions (for new user creation and Stripe webhooks)
CREATE POLICY "Service role can insert subscriptions"
  ON public.user_subscriptions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service role can update any subscriptions (for Stripe webhooks)
CREATE POLICY "Service role can update subscriptions"
  ON public.user_subscriptions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role can view all subscriptions (for admin operations)
CREATE POLICY "Service role can view subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  TO service_role
  USING (true);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());