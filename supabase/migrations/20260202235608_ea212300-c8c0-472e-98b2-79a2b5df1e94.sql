-- Fix the service role policy to be more restrictive
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage reports" ON public.agent_reports;

-- Create a more specific insert policy for edge functions using auth bypass check
-- Edge functions with service_role key can insert reports
CREATE POLICY "Allow insert for edge functions" ON public.agent_reports
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE email = (auth.jwt() ->> 'email')
    AND role IN ('admin', 'hr', 'super_admin')
  )
  OR 
  -- Allow insert when no JWT is present (service role)
  (auth.jwt() IS NULL)
);