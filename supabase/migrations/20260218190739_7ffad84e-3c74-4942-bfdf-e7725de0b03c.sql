-- Allow agents to read audit logs where they are the actor or subject
CREATE POLICY "Users can view their own activity logs"
ON public.portal_audit_log
FOR SELECT
USING (
  lower(changed_by) = lower((auth.jwt() ->> 'email'::text))
  OR lower(metadata->>'target_email') = lower((auth.jwt() ->> 'email'::text))
  OR lower(metadata->>'agent_email') = lower((auth.jwt() ->> 'email'::text))
);