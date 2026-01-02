-- Add status column to update_questions table
-- Values: pending (new), on_going (has replies), answered (user marked), closed (admin permanent)
ALTER TABLE public.update_questions 
ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Add check constraint for valid statuses
ALTER TABLE public.update_questions 
ADD CONSTRAINT update_questions_status_check 
CHECK (status IN ('pending', 'on_going', 'answered', 'closed'));

-- Update existing questions: if they have a reply, mark as on_going
UPDATE public.update_questions 
SET status = 'on_going' 
WHERE reply IS NOT NULL OR replied_at IS NOT NULL;

-- Create index for faster filtering by status
CREATE INDEX idx_update_questions_status ON public.update_questions(status);