
CREATE OR REPLACE FUNCTION public.get_team_status_profiles()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  "position" text[],
  break_schedule text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ap.id,
    ap.email,
    ap.full_name,
    ap."position",
    ap.break_schedule
  FROM public.agent_profiles ap
  WHERE ap.employment_status IS DISTINCT FROM 'Terminated';
$$;
