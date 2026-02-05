-- Create revalida_batches table
CREATE TABLE public.revalida_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  start_at TIMESTAMPTZ NULL,
  end_at TIMESTAMPTZ NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  question_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create revalida_questions table
CREATE TABLE public.revalida_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.revalida_batches(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'situational')),
  prompt TEXT NOT NULL,
  choice_a TEXT NULL,
  choice_b TEXT NULL,
  choice_c TEXT NULL,
  choice_d TEXT NULL,
  correct_answer TEXT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create revalida_attempts table
CREATE TABLE public.revalida_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.revalida_batches(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  agent_email TEXT NOT NULL,
  question_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'needs_manual_review', 'graded')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ NULL,
  auto_score_points INTEGER NOT NULL DEFAULT 0,
  auto_total_points INTEGER NOT NULL DEFAULT 0,
  manual_score_points INTEGER NOT NULL DEFAULT 0,
  manual_total_points INTEGER NOT NULL DEFAULT 0,
  final_percent NUMERIC NULL,
  graded_by TEXT NULL,
  graded_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, agent_id)
);

-- Create revalida_answers table
CREATE TABLE public.revalida_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.revalida_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.revalida_questions(id) ON DELETE CASCADE,
  answer_value TEXT NULL,
  is_correct BOOLEAN NULL,
  points_awarded INTEGER NULL,
  feedback TEXT NULL,
  graded_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create revalida_exports table
CREATE TABLE public.revalida_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  range_start DATE NOT NULL,
  range_end DATE NOT NULL,
  file_path TEXT NOT NULL,
  rows_exported INTEGER NOT NULL DEFAULT 0,
  exported_by TEXT NOT NULL DEFAULT 'system'
);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for revalida_batches
CREATE TRIGGER update_revalida_batches_updated_at
  BEFORE UPDATE ON public.revalida_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.revalida_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revalida_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revalida_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revalida_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revalida_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for revalida_batches
CREATE POLICY "Admins can view all batches"
  ON public.revalida_batches FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Super admins can view all batches"
  ON public.revalida_batches FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "HR can view all batches"
  ON public.revalida_batches FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

CREATE POLICY "Agents can view active batches"
  ON public.revalida_batches FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert batches"
  ON public.revalida_batches FOR INSERT
  WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Super admins can insert batches"
  ON public.revalida_batches FOR INSERT
  WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Admins can update batches"
  ON public.revalida_batches FOR UPDATE
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Super admins can update batches"
  ON public.revalida_batches FOR UPDATE
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Admins can delete batches"
  ON public.revalida_batches FOR DELETE
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Super admins can delete batches"
  ON public.revalida_batches FOR DELETE
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- RLS Policies for revalida_questions
CREATE POLICY "Admins can manage questions"
  ON public.revalida_questions FOR ALL
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Super admins can manage questions"
  ON public.revalida_questions FOR ALL
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "HR can view questions"
  ON public.revalida_questions FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

CREATE POLICY "Agents can view questions for active batches"
  ON public.revalida_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.revalida_batches b
    WHERE b.id = batch_id AND b.is_active = true
  ));

-- RLS Policies for revalida_attempts
CREATE POLICY "Admins can view all attempts"
  ON public.revalida_attempts FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Super admins can view all attempts"
  ON public.revalida_attempts FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "HR can view all attempts"
  ON public.revalida_attempts FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

CREATE POLICY "Agents can view own attempts"
  ON public.revalida_attempts FOR SELECT
  USING (agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)));

CREATE POLICY "Agents can insert own attempts"
  ON public.revalida_attempts FOR INSERT
  WITH CHECK (agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)));

CREATE POLICY "Admins can update attempts"
  ON public.revalida_attempts FOR UPDATE
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Super admins can update attempts"
  ON public.revalida_attempts FOR UPDATE
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Agents can update own in_progress attempts"
  ON public.revalida_attempts FOR UPDATE
  USING (agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)) AND status = 'in_progress');

CREATE POLICY "Admins can delete attempts"
  ON public.revalida_attempts FOR DELETE
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Super admins can delete attempts"
  ON public.revalida_attempts FOR DELETE
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- RLS Policies for revalida_answers
CREATE POLICY "Admins can manage answers"
  ON public.revalida_answers FOR ALL
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Super admins can manage answers"
  ON public.revalida_answers FOR ALL
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "HR can view answers"
  ON public.revalida_answers FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

CREATE POLICY "Agents can insert own answers"
  ON public.revalida_answers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.revalida_attempts a
    WHERE a.id = attempt_id 
    AND a.agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
    AND a.status = 'in_progress'
  ));

-- RLS Policies for revalida_exports
CREATE POLICY "Admins can view exports"
  ON public.revalida_exports FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Super admins can view exports"
  ON public.revalida_exports FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- Create storage bucket for revalida exports
INSERT INTO storage.buckets (id, name, public)
VALUES ('revalida-exports', 'revalida-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for revalida-exports bucket
CREATE POLICY "Admins can view revalida exports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'revalida-exports' AND (
    has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role) OR
    has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role)
  ));

CREATE POLICY "Service role can manage revalida exports"
  ON storage.objects FOR ALL
  USING (bucket_id = 'revalida-exports')
  WITH CHECK (bucket_id = 'revalida-exports');

-- Create indexes for performance
CREATE INDEX idx_revalida_questions_batch_id ON public.revalida_questions(batch_id);
CREATE INDEX idx_revalida_attempts_batch_id ON public.revalida_attempts(batch_id);
CREATE INDEX idx_revalida_attempts_agent_email ON public.revalida_attempts(agent_email);
CREATE INDEX idx_revalida_attempts_status ON public.revalida_attempts(status);
CREATE INDEX idx_revalida_answers_attempt_id ON public.revalida_answers(attempt_id);