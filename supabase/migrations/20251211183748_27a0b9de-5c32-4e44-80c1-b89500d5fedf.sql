-- Delete all user_projects except admin's projects
DELETE FROM user_projects 
WHERE user_id != '12b2c69a-9bd4-4d30-88a2-4a65117266e4';

-- Create user_workflows table
CREATE TABLE public.user_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  workflow_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_workflows ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can create their own workflows"
  ON public.user_workflows FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own workflows"
  ON public.user_workflows FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
  ON public.user_workflows FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
  ON public.user_workflows FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_workflows_updated_at
  BEFORE UPDATE ON public.user_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();