
-- Fix security definer view by setting SECURITY INVOKER
ALTER VIEW public.taxonomy_terms_active SET (security_invoker = on);
