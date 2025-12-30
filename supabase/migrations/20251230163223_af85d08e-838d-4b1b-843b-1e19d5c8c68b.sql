-- Allow HR to view all agent profiles
CREATE POLICY "HR can view all profiles" 
ON public.agent_profiles 
FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

-- Allow HR to update all agent profiles
CREATE POLICY "HR can update all profiles" 
ON public.agent_profiles 
FOR UPDATE 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));