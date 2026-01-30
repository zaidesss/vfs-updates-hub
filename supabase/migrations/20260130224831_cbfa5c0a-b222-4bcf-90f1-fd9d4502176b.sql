-- Create view with only non-sensitive fields for team status
CREATE VIEW public.agent_profiles_team_status
WITH (security_invoker = on) AS
SELECT 
  id,
  email,
  full_name,
  position
FROM public.agent_profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.agent_profiles_team_status TO authenticated;

-- Remove the overly permissive policy (THE KEY SECURITY FIX)
DROP POLICY IF EXISTS "Authenticated users can view all agent_profiles for team status" ON public.agent_profiles;