-- Add coaching_time column to qa_evaluations for time selection
ALTER TABLE public.qa_evaluations
ADD COLUMN coaching_time TEXT NULL;

-- Add comment
COMMENT ON COLUMN public.qa_evaluations.coaching_time IS 'Time of day for coaching session (e.g., 09:00, 14:30)';