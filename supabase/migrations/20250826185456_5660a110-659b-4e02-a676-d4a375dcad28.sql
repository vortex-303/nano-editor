-- Create image editing sessions table
CREATE TABLE public.image_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create image versions table for timeline
CREATE TABLE public.image_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.image_sessions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  parent_id UUID REFERENCES public.image_versions(id),
  processing_time_ms INTEGER,
  model_used TEXT DEFAULT 'gemini-2.5-flash-image-preview',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.image_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
CREATE POLICY "Allow all operations on image_sessions" 
ON public.image_sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on image_versions" 
ON public.image_versions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_image_sessions_updated_at
BEFORE UPDATE ON public.image_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_image_versions_session_id ON public.image_versions(session_id);
CREATE INDEX idx_image_versions_created_at ON public.image_versions(created_at DESC);