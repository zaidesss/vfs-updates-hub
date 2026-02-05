-- Fix search_path for new function
ALTER FUNCTION public.get_agent_dashboard_data(UUID) SET search_path = public;