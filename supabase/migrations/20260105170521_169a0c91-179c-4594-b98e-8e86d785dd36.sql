-- Create helper function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_email text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT public.has_role(lower(_email), 'super_admin')
$$;

-- Create helper function to get super_admin count (for protection)
CREATE OR REPLACE FUNCTION public.get_super_admin_count()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_roles
  WHERE role = 'super_admin'
$$;

-- Assign super_admin role to cherry@virtualfreelancesolutions.com
UPDATE public.user_roles
SET role = 'super_admin'
WHERE email = 'cherry@virtualfreelancesolutions.com';