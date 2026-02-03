-- Drop the existing view with security_invoker = on
DROP VIEW IF EXISTS public.agent_profiles_team_status;

-- Recreate without security_invoker (defaults to off = bypasses RLS)
-- This is safe because we only expose non-sensitive fields
CREATE VIEW public.agent_profiles_team_status AS
SELECT 
  id,
  email,
  full_name,
  position
FROM public.agent_profiles;

-- Grant SELECT access to authenticated users
GRANT SELECT ON public.agent_profiles_team_status TO authenticated;