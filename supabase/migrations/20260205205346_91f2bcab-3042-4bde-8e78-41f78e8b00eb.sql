-- Drop the existing policy that blocks status transitions
DROP POLICY IF EXISTS "Agents can update own in_progress attempts" 
  ON public.revalida_attempts;

-- Create a new policy with proper WITH CHECK clause
-- USING: Can only update their own in_progress attempts
-- WITH CHECK: Allows status to transition to submitted/graded states
CREATE POLICY "Agents can update own in_progress attempts"
  ON public.revalida_attempts FOR UPDATE
  USING (
    agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
    AND status = 'in_progress'
  )
  WITH CHECK (
    agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
    AND status IN ('in_progress', 'submitted', 'needs_manual_review', 'graded')
  );