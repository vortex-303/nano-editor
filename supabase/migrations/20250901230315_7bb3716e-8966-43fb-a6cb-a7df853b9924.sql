-- Update existing free users' credit limits from 20 to 6
UPDATE public.user_credits 
SET credits_limit = 6 
WHERE credits_limit = 20;

-- Update the handle_new_user_credits function to set 6 as default limit
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, email, credits_used, credits_limit)
  VALUES (NEW.id, NEW.email, 0, 6);
  
  INSERT INTO public.user_subscriptions (user_id, email, subscription_status, subscription_tier)
  VALUES (NEW.id, NEW.email, 'inactive', 'free');
  
  RETURN NEW;
END;
$function$;