CREATE POLICY "Agents can insert own reports"
ON public.agent_reports
FOR INSERT
TO authenticated
WITH CHECK (
  agent_email = LOWER(auth.jwt() ->> 'email')
);