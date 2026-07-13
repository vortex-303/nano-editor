-- Add admin access to user_credits for the admin panel
-- This allows admins to view all user credit information in the admin dashboard

CREATE POLICY "Admins can view all user credits" 
ON public.user_credits 
FOR SELECT 
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can manage all user credits" 
ON public.user_credits 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());