-- Fix security vulnerability: Remove public access to user_subscriptions table
-- The current "Service can manage subscriptions" policy with "true" expression 
-- allows public access to customer email addresses

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service can manage subscriptions" ON public.user_subscriptions;

-- Create a more secure policy that only allows service role access for management
-- This policy will only apply when using the service role key, not for public access
CREATE POLICY "Service role can manage subscriptions" 
ON public.user_subscriptions 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Ensure authenticated users can still insert their own subscription data
CREATE POLICY "Users can create their own subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);