-- Create audit trail table for QA evaluations
CREATE TABLE public.qa_evaluation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.qa_evaluations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_description TEXT,
  actor_email TEXT NOT NULL,
  actor_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_qa_evaluation_events_evaluation_id ON public.qa_evaluation_events(evaluation_id);
CREATE INDEX idx_qa_evaluation_events_created_at ON public.qa_evaluation_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.qa_evaluation_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage evaluation events"
ON public.qa_evaluation_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.email = (SELECT auth.jwt() ->> 'email')
    AND user_roles.role IN ('admin', 'super_admin', 'hr')
  )
);

CREATE POLICY "Agents can view events for their evaluations"
ON public.qa_evaluation_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM qa_evaluations e
    WHERE e.id = qa_evaluation_events.evaluation_id
    AND e.agent_email = (SELECT auth.jwt() ->> 'email')
  )
);

-- Add comment for documentation
COMMENT ON TABLE public.qa_evaluation_events IS 'Audit trail for QA evaluation activities';