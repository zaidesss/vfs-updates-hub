-- Add new columns for QA evaluation enhancements
ALTER TABLE public.qa_evaluations
ADD COLUMN work_week_start DATE,
ADD COLUMN work_week_end DATE,
ADD COLUMN coaching_date DATE,
ADD COLUMN agent_remarks TEXT,
ADD COLUMN agent_reviewed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN agent_reviewed_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.qa_evaluations.work_week_start IS 'Start date of the work week being evaluated';
COMMENT ON COLUMN public.qa_evaluations.work_week_end IS 'End date of the work week being evaluated';
COMMENT ON COLUMN public.qa_evaluations.coaching_date IS 'Required date for coaching session with agent';
COMMENT ON COLUMN public.qa_evaluations.agent_remarks IS 'Agent written response or reaction to the evaluation';
COMMENT ON COLUMN public.qa_evaluations.agent_reviewed IS 'Whether agent has clicked the Reviewed button';
COMMENT ON COLUMN public.qa_evaluations.agent_reviewed_at IS 'Timestamp when agent clicked Reviewed';