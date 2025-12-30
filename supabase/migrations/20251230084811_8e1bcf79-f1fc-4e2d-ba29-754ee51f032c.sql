-- Add UPDATE policy for user_roles (admin-only role changes)
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(
  (current_setting('request.jwt.claims', true)::json->>'email')::text, 
  'admin'
))
WITH CHECK (public.has_role(
  (current_setting('request.jwt.claims', true)::json->>'email')::text, 
  'admin'
));