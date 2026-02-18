
-- Create qa_evaluation_replies table
CREATE TABLE public.qa_evaluation_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.qa_evaluations(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qa_evaluation_replies ENABLE ROW LEVEL SECURITY;

-- SELECT: Agents can read replies on their own evaluations; admin/HR/super_admin can read all
CREATE POLICY "Agents can view replies on own evaluations"
ON public.qa_evaluation_replies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.qa_evaluations qe
    WHERE qe.id = evaluation_id
    AND LOWER(qe.agent_email) = LOWER(auth.jwt()->>'email')
  )
  OR public.has_role(LOWER(auth.jwt()->>'email'), 'admin')
  OR public.has_role(LOWER(auth.jwt()->>'email'), 'super_admin')
  OR public.has_role(LOWER(auth.jwt()->>'email'), 'hr')
);

-- INSERT: Agents can insert on own evaluations; admin/HR/super_admin can insert on any
CREATE POLICY "Agents can reply on own evaluations"
ON public.qa_evaluation_replies
FOR INSERT
TO authenticated
WITH CHECK (
  LOWER(user_email) = LOWER(auth.jwt()->>'email')
  AND (
    EXISTS (
      SELECT 1 FROM public.qa_evaluations qe
      WHERE qe.id = evaluation_id
      AND LOWER(qe.agent_email) = LOWER(auth.jwt()->>'email')
    )
    OR public.has_role(LOWER(auth.jwt()->>'email'), 'admin')
    OR public.has_role(LOWER(auth.jwt()->>'email'), 'super_admin')
    OR public.has_role(LOWER(auth.jwt()->>'email'), 'hr')
  )
);

-- Super admin full access for UPDATE/DELETE
CREATE POLICY "Super admins can manage all replies"
ON public.qa_evaluation_replies
FOR ALL
TO authenticated
USING (public.has_role(LOWER(auth.jwt()->>'email'), 'super_admin'))
WITH CHECK (public.has_role(LOWER(auth.jwt()->>'email'), 'super_admin'));

-- Index for fast lookups
CREATE INDEX idx_qa_evaluation_replies_evaluation_id ON public.qa_evaluation_replies(evaluation_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_evaluation_replies;
