-- Add AI justification column to qa_evaluation_scores table
ALTER TABLE public.qa_evaluation_scores 
ADD COLUMN IF NOT EXISTS ai_justification TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.qa_evaluation_scores.ai_justification IS 'AI-provided reasoning for failed scores (0 points) or critical error detections';