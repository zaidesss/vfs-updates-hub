-- Add RLS policy for all authenticated users to view questions
CREATE POLICY "Authenticated users can view all questions" 
ON update_questions 
FOR SELECT 
TO authenticated 
USING (true);