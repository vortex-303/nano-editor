-- Add performance indexes for admin analytics
CREATE INDEX IF NOT EXISTS idx_image_versions_user_created ON public.image_versions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_versions_created_at ON public.image_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_versions_model ON public.image_versions(model_used);

CREATE INDEX IF NOT EXISTS idx_video_jobs_user_created ON public.video_generation_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON public.video_generation_jobs(status);

CREATE INDEX IF NOT EXISTS idx_anonymous_versions_session ON public.anonymous_image_versions(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anonymous_versions_created ON public.anonymous_image_versions(created_at DESC);

-- Create user_activity_logs table for tracking user actions (no FK to user_credits since it lacks unique constraint)
CREATE TABLE public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for activity logs
CREATE INDEX idx_activity_logs_user ON public.user_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_logs_type ON public.user_activity_logs(activity_type, created_at DESC);
CREATE INDEX idx_activity_logs_created ON public.user_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity logs - admins can see all, users can see their own
CREATE POLICY "Admins can view all activity logs"
ON public.user_activity_logs
FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can insert activity logs"
ON public.user_activity_logs
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Users can view their own activity logs"
ON public.user_activity_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage activity logs"
ON public.user_activity_logs
FOR ALL
USING (true)
WITH CHECK (true);