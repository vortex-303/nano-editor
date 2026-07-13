-- Fix function search path security warnings
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.cleanup_expired_anonymous_sessions() SET search_path = '';