
-- 1. Drop overly permissive policies on video_generation_jobs
DROP POLICY IF EXISTS "Service role can select video generation jobs" ON public.video_generation_jobs;
DROP POLICY IF EXISTS "Service role can update video generation jobs" ON public.video_generation_jobs;

-- 2. Storage: add owner-scoped UPDATE policy for videos bucket
CREATE POLICY "Users can update their videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Remove broad public SELECT policy that allows listing of videos bucket.
-- Public bucket files remain accessible via their direct public URLs without an RLS policy.
DROP POLICY IF EXISTS "Public video access" ON storage.objects;

-- 4. Revoke EXECUTE on internal SECURITY DEFINER functions from public/anon/authenticated.
-- These are trigger functions or admin/cron utilities never meant to be called from the API.
REVOKE EXECUTE ON FUNCTION public.reset_monthly_credits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_anonymous_sessions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_credits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
