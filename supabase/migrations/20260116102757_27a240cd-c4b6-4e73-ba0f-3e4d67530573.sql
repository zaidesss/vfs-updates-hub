-- Add RLS policies for super_admin on agent_profiles
CREATE POLICY "Super admins can view all profiles" 
ON public.agent_profiles 
FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can update all profiles" 
ON public.agent_profiles 
FOR UPDATE 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert profiles" 
ON public.agent_profiles 
FOR INSERT 
WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));