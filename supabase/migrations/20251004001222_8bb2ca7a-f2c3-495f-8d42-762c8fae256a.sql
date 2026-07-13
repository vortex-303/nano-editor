-- Add RLS policies to allow admins to update user subscriptions and credits

-- Policy for admins to update any user's subscription
CREATE POLICY "Admins can update any subscription"
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policy for admins to update any user's credits
CREATE POLICY "Admins can update any credits"
ON public.user_credits
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());