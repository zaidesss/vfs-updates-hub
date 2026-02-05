-- Add INSERT policies for Admin, Super Admin, and HR roles on revalida_attempts table

-- Admins can insert their own attempts
CREATE POLICY "Admins can insert own attempts"
  ON public.revalida_attempts FOR INSERT
  WITH CHECK (
    has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role)
    AND agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
  );

-- Super admins can insert their own attempts  
CREATE POLICY "Super admins can insert own attempts"
  ON public.revalida_attempts FOR INSERT
  WITH CHECK (
    has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role)
    AND agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
  );

-- HR can insert their own attempts
CREATE POLICY "HR can insert own attempts"
  ON public.revalida_attempts FOR INSERT
  WITH CHECK (
    has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role)
    AND agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
  );