-- Add user_id columns to link content to users
ALTER TABLE public.image_sessions 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.image_versions 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on image_sessions" ON public.image_sessions;
DROP POLICY IF EXISTS "Allow all operations on image_versions" ON public.image_versions;

-- Create secure RLS policies for image_sessions
CREATE POLICY "Users can view their own sessions" 
ON public.image_sessions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON public.image_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.image_sessions 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
ON public.image_sessions 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Create secure RLS policies for image_versions
CREATE POLICY "Users can view their own image versions" 
ON public.image_versions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own image versions" 
ON public.image_versions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own image versions" 
ON public.image_versions 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own image versions" 
ON public.image_versions 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);