-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can read roles" ON public.user_roles;

-- Create a policy that allows users to see only their own role
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
USING (email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)));

-- Allow admins to view all roles (needed for admin panel)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));