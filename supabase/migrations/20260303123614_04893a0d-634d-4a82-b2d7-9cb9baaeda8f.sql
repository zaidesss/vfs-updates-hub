
-- Create nb_quiz_questions table
CREATE TABLE public.nb_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_date date NOT NULL,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  correct_answer text NOT NULL,
  source_article_title text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(quiz_date, question_number)
);

-- Create nb_quiz_submissions table
CREATE TABLE public.nb_quiz_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_email text NOT NULL,
  quiz_date date NOT NULL,
  answers jsonb NOT NULL,
  score integer NOT NULL,
  total integer NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(agent_email, quiz_date)
);

-- Enable RLS
ALTER TABLE public.nb_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nb_quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Questions: authenticated users can read
CREATE POLICY "Authenticated users can read quiz questions"
  ON public.nb_quiz_questions FOR SELECT
  TO authenticated
  USING (true);

-- Submissions: agents can insert their own
CREATE POLICY "Agents can insert own submissions"
  ON public.nb_quiz_submissions FOR INSERT
  TO authenticated
  WITH CHECK (agent_email = (SELECT auth.jwt() ->> 'email'));

-- Submissions: agents can read their own
CREATE POLICY "Agents can read own submissions"
  ON public.nb_quiz_submissions FOR SELECT
  TO authenticated
  USING (
    agent_email = (SELECT auth.jwt() ->> 'email')
    OR public.has_role((SELECT auth.jwt() ->> 'email'), 'admin')
    OR public.has_role((SELECT auth.jwt() ->> 'email'), 'super_admin')
  );
