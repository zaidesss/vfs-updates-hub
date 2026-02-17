CREATE OR REPLACE FUNCTION public.get_profile_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM public.agent_profiles
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;
$$;