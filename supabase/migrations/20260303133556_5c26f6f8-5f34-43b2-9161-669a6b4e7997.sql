CREATE TABLE public.nb_quiz_timer_starts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_email text NOT NULL,
  quiz_date date NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_email, quiz_date)
);

ALTER TABLE public.nb_quiz_timer_starts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read their own timer"
  ON public.nb_quiz_timer_starts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert their own timer"
  ON public.nb_quiz_timer_starts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);