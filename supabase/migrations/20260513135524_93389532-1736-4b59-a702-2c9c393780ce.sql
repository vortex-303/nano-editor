
-- BYOK provider enum
CREATE TYPE public.ai_provider AS ENUM ('openrouter', 'gemini', 'openai', 'replicate', 'anthropic', 'lovable');

-- AI task enum (which feature/node uses the model)
CREATE TYPE public.ai_task AS ENUM ('image_generate', 'image_edit', 'text', 'html', 'strategy', 'upscale', 'url_context');

-- 1. user_api_keys
CREATE TABLE public.user_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider public.ai_provider NOT NULL,
  encrypted_key TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own api keys"
  ON public.user_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own api keys"
  ON public.user_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own api keys"
  ON public.user_api_keys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own api keys"
  ON public.user_api_keys FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_api_keys_updated
  BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. user_model_preferences
CREATE TABLE public.user_model_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task public.ai_task NOT NULL,
  provider public.ai_provider NOT NULL,
  model_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, task)
);

ALTER TABLE public.user_model_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own model preferences"
  ON public.user_model_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own model preferences"
  ON public.user_model_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own model preferences"
  ON public.user_model_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own model preferences"
  ON public.user_model_preferences FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_model_preferences_updated
  BEFORE UPDATE ON public.user_model_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. available_models (admin-curated catalog)
CREATE TABLE public.available_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider public.ai_provider NOT NULL,
  model_id TEXT NOT NULL,
  label TEXT NOT NULL,
  task public.ai_task NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  pricing_hint TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, model_id, task)
);

ALTER TABLE public.available_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled models"
  ON public.available_models FOR SELECT
  USING (enabled = true OR public.is_admin());

CREATE POLICY "Admins can insert models"
  ON public.available_models FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update models"
  ON public.available_models FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete models"
  ON public.available_models FOR DELETE
  USING (public.is_admin());

CREATE TRIGGER trg_available_models_updated
  BEFORE UPDATE ON public.available_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed catalog
INSERT INTO public.available_models (provider, model_id, label, task, is_default, pricing_hint, sort_order) VALUES
  -- Image generation
  ('lovable', 'google/gemini-3-pro-image-preview', 'Nano Banana Pro (Lovable)', 'image_generate', true, 'Uses Lovable credits', 10),
  ('lovable', 'google/gemini-2.5-flash-image', 'Nano Banana (Lovable)', 'image_generate', false, 'Uses Lovable credits', 20),
  ('gemini', 'gemini-2.5-flash-image', 'Nano Banana (Direct Gemini)', 'image_generate', false, 'Free tier on Google AI Studio', 30),
  ('gemini', 'gemini-3-pro-image-preview', 'Nano Banana Pro (Direct Gemini)', 'image_generate', false, 'Paid', 40),
  ('openrouter', 'google/gemini-2.5-flash-image-preview', 'Gemini Image (OpenRouter)', 'image_generate', false, 'Pay-per-use', 50),
  ('openai', 'gpt-image-1', 'GPT Image 1 (OpenAI)', 'image_generate', false, 'Pay-per-use', 60),
  ('replicate', 'black-forest-labs/flux-schnell', 'FLUX Schnell (Replicate)', 'image_generate', false, 'Cheap & fast', 70),
  ('replicate', 'black-forest-labs/flux-1.1-pro', 'FLUX 1.1 Pro (Replicate)', 'image_generate', false, 'Higher quality', 80),

  -- Image edit (same models, separate task)
  ('lovable', 'google/gemini-3-pro-image-preview', 'Nano Banana Pro (Lovable)', 'image_edit', true, 'Uses Lovable credits', 10),
  ('lovable', 'google/gemini-2.5-flash-image', 'Nano Banana (Lovable)', 'image_edit', false, 'Uses Lovable credits', 20),
  ('gemini', 'gemini-2.5-flash-image', 'Nano Banana (Direct Gemini)', 'image_edit', false, 'Free tier', 30),
  ('openrouter', 'google/gemini-2.5-flash-image-preview', 'Gemini Image (OpenRouter)', 'image_edit', false, 'Pay-per-use', 40),

  -- Text
  ('lovable', 'google/gemini-3-flash-preview', 'Gemini 3 Flash (Lovable)', 'text', true, 'Uses Lovable credits', 10),
  ('lovable', 'google/gemini-2.5-pro', 'Gemini 2.5 Pro (Lovable)', 'text', false, 'Uses Lovable credits', 20),
  ('lovable', 'openai/gpt-5', 'GPT-5 (Lovable)', 'text', false, 'Uses Lovable credits', 30),
  ('openrouter', 'google/gemini-2.5-flash', 'Gemini 2.5 Flash (OpenRouter)', 'text', false, 'Pay-per-use', 40),
  ('openrouter', 'openai/gpt-5', 'GPT-5 (OpenRouter)', 'text', false, 'Pay-per-use', 50),
  ('openrouter', 'anthropic/claude-sonnet-4.5', 'Claude Sonnet 4.5 (OpenRouter)', 'text', false, 'Pay-per-use', 60),
  ('openai', 'gpt-5', 'GPT-5 (Direct OpenAI)', 'text', false, 'Pay-per-use', 70),
  ('anthropic', 'claude-sonnet-4-5', 'Claude Sonnet 4.5 (Direct)', 'text', false, 'Pay-per-use', 80),
  ('gemini', 'gemini-2.5-flash', 'Gemini 2.5 Flash (Direct)', 'text', false, 'Free tier', 90),

  -- HTML generation (uses text models)
  ('lovable', 'google/gemini-3-flash-preview', 'Gemini 3 Flash (Lovable)', 'html', true, 'Uses Lovable credits', 10),
  ('openrouter', 'anthropic/claude-sonnet-4.5', 'Claude Sonnet 4.5 (OpenRouter)', 'html', false, 'Pay-per-use', 20),
  ('openrouter', 'openai/gpt-5', 'GPT-5 (OpenRouter)', 'html', false, 'Pay-per-use', 30),

  -- Strategy
  ('lovable', 'google/gemini-3-pro-preview', 'Gemini 3 Pro (Lovable)', 'strategy', true, 'Uses Lovable credits', 10),
  ('openrouter', 'google/gemini-2.5-pro', 'Gemini 2.5 Pro (OpenRouter)', 'strategy', false, 'Pay-per-use', 20),
  ('openrouter', 'anthropic/claude-sonnet-4.5', 'Claude Sonnet 4.5 (OpenRouter)', 'strategy', false, 'Pay-per-use', 30),

  -- URL context
  ('lovable', 'google/gemini-2.5-flash', 'Gemini 2.5 Flash (Lovable)', 'url_context', true, 'Uses Lovable credits', 10),
  ('openrouter', 'google/gemini-2.5-flash', 'Gemini 2.5 Flash (OpenRouter)', 'url_context', false, 'Pay-per-use', 20),

  -- Upscale
  ('replicate', 'nightmareai/real-esrgan', 'Real-ESRGAN (Replicate)', 'upscale', true, 'Pay-per-use', 10),
  ('replicate', 'philz1337x/clarity-upscaler', 'Clarity Upscaler (Replicate)', 'upscale', false, 'Higher quality', 20);
