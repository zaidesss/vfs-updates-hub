-- =============================================
-- REVALIDA 2.0 DATABASE SCHEMA
-- =============================================

-- 1. Revalida V2 Batches
CREATE TABLE public.revalida_v2_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  mcq_count INT NOT NULL DEFAULT 5,
  tf_count INT NOT NULL DEFAULT 3,
  situational_count INT NOT NULL DEFAULT 2,
  total_points INT GENERATED ALWAYS AS (mcq_count + tf_count + (situational_count * 5)) STORED,
  generation_status TEXT DEFAULT 'pending',
  generation_error TEXT,
  source_week_start DATE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Revalida V2 Questions
CREATE TABLE public.revalida_v2_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.revalida_v2_batches(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'situational')),
  prompt TEXT NOT NULL,
  choice_a TEXT,
  choice_b TEXT,
  choice_c TEXT,
  choice_d TEXT,
  correct_answer TEXT,
  points INT NOT NULL DEFAULT 1,
  order_index INT NOT NULL DEFAULT 0,
  source_type TEXT NOT NULL CHECK (source_type IN ('kb_article', 'qa_action', 'qa_ai_suggestion', 'contract')),
  source_reference TEXT,
  source_excerpt TEXT,
  evaluation_rubric TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Revalida V2 Attempts
CREATE TABLE public.revalida_v2_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.revalida_v2_batches(id) ON DELETE CASCADE,
  agent_email TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  score INT,
  percentage DECIMAL(5,2),
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  question_order TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Revalida V2 Answers
CREATE TABLE public.revalida_v2_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.revalida_v2_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.revalida_v2_questions(id) ON DELETE CASCADE,
  agent_answer TEXT,
  is_correct BOOLEAN,
  points_earned INT,
  ai_suggested_score INT,
  ai_score_justification TEXT,
  ai_status TEXT DEFAULT 'pending' CHECK (ai_status IN ('pending', 'graded', 'override')),
  admin_override_score INT,
  admin_override_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Revalida V2 Contracts (Knowledge Base)
CREATE TABLE public.revalida_v2_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT,
  parsed_content TEXT NOT NULL,
  support_type TEXT,
  is_active BOOLEAN DEFAULT true,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_revalida_v2_batches_active ON public.revalida_v2_batches(is_active);
CREATE INDEX idx_revalida_v2_batches_dates ON public.revalida_v2_batches(start_at, end_at);
CREATE INDEX idx_revalida_v2_questions_batch ON public.revalida_v2_questions(batch_id);
CREATE INDEX idx_revalida_v2_attempts_batch ON public.revalida_v2_attempts(batch_id);
CREATE INDEX idx_revalida_v2_attempts_agent ON public.revalida_v2_attempts(agent_email);
CREATE INDEX idx_revalida_v2_answers_attempt ON public.revalida_v2_answers(attempt_id);
CREATE INDEX idx_revalida_v2_contracts_active ON public.revalida_v2_contracts(is_active);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.revalida_v2_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revalida_v2_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revalida_v2_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revalida_v2_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revalida_v2_contracts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Helper function for admin check (using user_roles table)
-- =============================================
CREATE OR REPLACE FUNCTION public.is_revalida_admin(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE email = lower(_email)
    AND role IN ('admin', 'super_admin', 'hr')
  )
$$;

-- =============================================
-- RLS POLICIES: revalida_v2_batches
-- =============================================
-- Agents can read active batches only
CREATE POLICY "Agents can view active batches"
ON public.revalida_v2_batches FOR SELECT
USING (
  is_active = true
  OR public.is_revalida_admin(auth.jwt()->>'email')
);

-- Admins can do everything
CREATE POLICY "Admins can manage batches"
ON public.revalida_v2_batches FOR ALL
USING (public.is_revalida_admin(auth.jwt()->>'email'));

-- =============================================
-- RLS POLICIES: revalida_v2_questions
-- =============================================
-- Agents can read questions in active batches
CREATE POLICY "Agents can view questions in active batches"
ON public.revalida_v2_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.revalida_v2_batches b
    WHERE b.id = batch_id AND b.is_active = true
  )
  OR public.is_revalida_admin(auth.jwt()->>'email')
);

-- Admins can do everything
CREATE POLICY "Admins can manage questions"
ON public.revalida_v2_questions FOR ALL
USING (public.is_revalida_admin(auth.jwt()->>'email'));

-- =============================================
-- RLS POLICIES: revalida_v2_attempts
-- =============================================
-- Agents can manage their own attempts
CREATE POLICY "Agents can manage own attempts"
ON public.revalida_v2_attempts FOR ALL
USING (agent_email = auth.jwt()->>'email');

-- Admins can read all attempts
CREATE POLICY "Admins can view all attempts"
ON public.revalida_v2_attempts FOR SELECT
USING (public.is_revalida_admin(auth.jwt()->>'email'));

-- =============================================
-- RLS POLICIES: revalida_v2_answers
-- =============================================
-- Agents can manage their own answers
CREATE POLICY "Agents can manage own answers"
ON public.revalida_v2_answers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.revalida_v2_attempts a
    WHERE a.id = attempt_id AND a.agent_email = auth.jwt()->>'email'
  )
);

-- Admins can read all answers
CREATE POLICY "Admins can view all answers"
ON public.revalida_v2_answers FOR SELECT
USING (public.is_revalida_admin(auth.jwt()->>'email'));

-- Admins can update answers (for score override)
CREATE POLICY "Admins can update answers"
ON public.revalida_v2_answers FOR UPDATE
USING (public.is_revalida_admin(auth.jwt()->>'email'));

-- =============================================
-- RLS POLICIES: revalida_v2_contracts
-- =============================================
-- Only admins can access contracts
CREATE POLICY "Admins can manage contracts"
ON public.revalida_v2_contracts FOR ALL
USING (public.is_revalida_admin(auth.jwt()->>'email'));

-- =============================================
-- Apply updated_at triggers
-- =============================================
CREATE TRIGGER update_revalida_v2_batches_updated_at
BEFORE UPDATE ON public.revalida_v2_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_revalida_v2_attempts_updated_at
BEFORE UPDATE ON public.revalida_v2_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_revalida_v2_answers_updated_at
BEFORE UPDATE ON public.revalida_v2_answers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- STORAGE BUCKET FOR CONTRACT PDFS
-- =============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('revalida-v2-contracts', 'revalida-v2-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for contract PDFs
CREATE POLICY "Admins can upload v2 contracts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'revalida-v2-contracts'
  AND public.is_revalida_admin(auth.jwt()->>'email')
);

CREATE POLICY "Admins can read v2 contracts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'revalida-v2-contracts'
  AND public.is_revalida_admin(auth.jwt()->>'email')
);

CREATE POLICY "Admins can delete v2 contracts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'revalida-v2-contracts'
  AND public.is_revalida_admin(auth.jwt()->>'email')
);