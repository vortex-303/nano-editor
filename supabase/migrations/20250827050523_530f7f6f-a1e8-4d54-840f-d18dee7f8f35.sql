-- Create tables for anonymous (temporary) sessions
CREATE TABLE public.anonymous_image_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Auto-expire after 24 hours
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE TABLE public.anonymous_image_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.anonymous_image_sessions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  parent_id UUID REFERENCES public.anonymous_image_versions(id),
  processing_time_ms INTEGER,
  model_used TEXT DEFAULT 'gemini-2.5-flash-image-preview',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on anonymous tables
ALTER TABLE public.anonymous_image_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_image_versions ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for anonymous access (no auth required)
CREATE POLICY "Allow public access to anonymous sessions" 
ON public.anonymous_image_sessions 
FOR ALL 
TO anon
USING (expires_at > now())
WITH CHECK (expires_at > now());

CREATE POLICY "Allow public access to anonymous versions" 
ON public.anonymous_image_versions 
FOR ALL 
TO anon
USING (true);

-- Create cleanup function to remove expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_anonymous_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.anonymous_image_sessions 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for updated_at on anonymous_image_sessions
CREATE TRIGGER update_anonymous_sessions_updated_at
BEFORE UPDATE ON public.anonymous_image_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();