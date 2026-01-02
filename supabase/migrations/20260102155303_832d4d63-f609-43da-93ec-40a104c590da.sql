-- Create table for question replies (conversation thread)
CREATE TABLE public.question_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.update_questions(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.question_replies ENABLE ROW LEVEL SECURITY;

-- Everyone can view replies for questions they can see
CREATE POLICY "Authenticated users can view replies"
ON public.question_replies
FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own replies
CREATE POLICY "Users can insert own replies"
ON public.question_replies
FOR INSERT
TO authenticated
WITH CHECK (user_email = lower((current_setting('request.jwt.claims', true)::json ->> 'email')));

-- Admins can insert replies (for replying on behalf of others is not needed, they use their own email)
CREATE POLICY "Admins can insert replies"
ON public.question_replies
FOR INSERT
TO authenticated
WITH CHECK (has_role((current_setting('request.jwt.claims', true)::json ->> 'email'), 'admin'));

-- HR can insert replies
CREATE POLICY "HR can insert replies"
ON public.question_replies
FOR INSERT
TO authenticated
WITH CHECK (has_role((current_setting('request.jwt.claims', true)::json ->> 'email'), 'hr'));