-- Update default credit limits for new users
ALTER TABLE public.user_credits ALTER COLUMN credits_limit SET DEFAULT 6;

-- Update existing users' credit limits from 20 to 6
UPDATE public.user_credits SET credits_limit = 6 WHERE credits_limit = 20;