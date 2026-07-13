-- Drop the overly permissive policy on anonymous_image_versions
DROP POLICY IF EXISTS "Allow public access to anonymous versions" ON public.anonymous_image_versions;

-- Create session-scoped policies that validate access against non-expired sessions
CREATE POLICY "Anonymous users can select their session data"
ON public.anonymous_image_versions
FOR SELECT
USING (
  session_id IN (
    SELECT id FROM public.anonymous_image_sessions 
    WHERE expires_at > now()
  )
);

CREATE POLICY "Anonymous users can insert to their session"
ON public.anonymous_image_versions
FOR INSERT
WITH CHECK (
  session_id IN (
    SELECT id FROM public.anonymous_image_sessions 
    WHERE expires_at > now()
  )
);

CREATE POLICY "Anonymous users can update their session data"
ON public.anonymous_image_versions
FOR UPDATE
USING (
  session_id IN (
    SELECT id FROM public.anonymous_image_sessions 
    WHERE expires_at > now()
  )
)
WITH CHECK (
  session_id IN (
    SELECT id FROM public.anonymous_image_sessions 
    WHERE expires_at > now()
  )
);

CREATE POLICY "Anonymous users can delete their session data"
ON public.anonymous_image_versions
FOR DELETE
USING (
  session_id IN (
    SELECT id FROM public.anonymous_image_sessions 
    WHERE expires_at > now()
  )
);