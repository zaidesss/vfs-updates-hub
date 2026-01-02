-- Add reply columns to update_questions table
ALTER TABLE public.update_questions 
ADD COLUMN reply TEXT,
ADD COLUMN replied_by TEXT,
ADD COLUMN replied_at TIMESTAMP WITH TIME ZONE;

-- Allow admins to update questions (to add replies)
CREATE POLICY "Admins can update questions" 
ON public.update_questions 
FOR UPDATE 
TO authenticated 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- Allow HR to update questions (to add replies)
CREATE POLICY "HR can update questions" 
ON public.update_questions 
FOR UPDATE 
TO authenticated 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));