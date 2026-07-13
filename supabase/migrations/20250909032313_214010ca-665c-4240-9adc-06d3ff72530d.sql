-- Fix security vulnerability: Remove public access to user_credits table
-- The current policies allow public access to customer email addresses

-- Drop the overly permissive policy that allows public access
DROP POLICY IF EXISTS "Service can manage credits" ON public.user_credits;

-- Create a more secure policy that only allows service role access for management
CREATE POLICY "Service role can manage credits" 
ON public.user_credits 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure the existing user policies remain intact for authenticated access
-- (The "Users can view their own credits" and "Users can update their own credits" policies should remain)