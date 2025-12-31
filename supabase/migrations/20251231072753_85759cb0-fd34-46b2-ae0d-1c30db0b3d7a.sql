-- Add reference_number column to updates table
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS reference_number TEXT UNIQUE;

-- Add reference_number and override columns to leave_requests table
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reference_number TEXT UNIQUE;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS override_reason TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS conflicting_agents TEXT;

-- Add reference_number column to article_requests table
ALTER TABLE public.article_requests ADD COLUMN IF NOT EXISTS reference_number TEXT UNIQUE;

-- Add reference_number column to update_questions table
ALTER TABLE public.update_questions ADD COLUMN IF NOT EXISTS reference_number TEXT UNIQUE;

-- Add must_change_password column to user_roles table
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Create function to generate update reference numbers (UPD-0001)
CREATE OR REPLACE FUNCTION public.generate_upd_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.updates
  WHERE reference_number IS NOT NULL;
  
  NEW.reference_number := 'UPD-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Create function to generate leave request reference numbers (LR-0001)
CREATE OR REPLACE FUNCTION public.generate_lr_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.leave_requests
  WHERE reference_number IS NOT NULL;
  
  NEW.reference_number := 'LR-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Create function to generate article request reference numbers (REQ-0001)
CREATE OR REPLACE FUNCTION public.generate_req_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.article_requests
  WHERE reference_number IS NOT NULL;
  
  NEW.reference_number := 'REQ-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Create function to generate question reference numbers (Q-0001)
CREATE OR REPLACE FUNCTION public.generate_q_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.update_questions
  WHERE reference_number IS NOT NULL;
  
  NEW.reference_number := 'Q-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Create triggers for auto-generating reference numbers
DROP TRIGGER IF EXISTS set_update_reference_number ON public.updates;
CREATE TRIGGER set_update_reference_number
  BEFORE INSERT ON public.updates
  FOR EACH ROW
  WHEN (NEW.reference_number IS NULL)
  EXECUTE FUNCTION public.generate_upd_number();

DROP TRIGGER IF EXISTS set_leave_request_reference_number ON public.leave_requests;
CREATE TRIGGER set_leave_request_reference_number
  BEFORE INSERT ON public.leave_requests
  FOR EACH ROW
  WHEN (NEW.reference_number IS NULL)
  EXECUTE FUNCTION public.generate_lr_number();

DROP TRIGGER IF EXISTS set_article_request_reference_number ON public.article_requests;
CREATE TRIGGER set_article_request_reference_number
  BEFORE INSERT ON public.article_requests
  FOR EACH ROW
  WHEN (NEW.reference_number IS NULL)
  EXECUTE FUNCTION public.generate_req_number();

DROP TRIGGER IF EXISTS set_question_reference_number ON public.update_questions;
CREATE TRIGGER set_question_reference_number
  BEFORE INSERT ON public.update_questions
  FOR EACH ROW
  WHEN (NEW.reference_number IS NULL)
  EXECUTE FUNCTION public.generate_q_number();

-- Backfill existing updates with reference numbers
WITH numbered_updates AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY posted_at) as rn
  FROM public.updates
  WHERE reference_number IS NULL
)
UPDATE public.updates u
SET reference_number = 'UPD-' || LPAD(nu.rn::TEXT, 4, '0')
FROM numbered_updates nu
WHERE u.id = nu.id;

-- Backfill existing leave_requests with reference numbers
WITH numbered_lr AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.leave_requests
  WHERE reference_number IS NULL
)
UPDATE public.leave_requests lr
SET reference_number = 'LR-' || LPAD(nlr.rn::TEXT, 4, '0')
FROM numbered_lr nlr
WHERE lr.id = nlr.id;

-- Backfill existing article_requests with reference numbers
WITH numbered_ar AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.article_requests
  WHERE reference_number IS NULL
)
UPDATE public.article_requests ar
SET reference_number = 'REQ-' || LPAD(nar.rn::TEXT, 4, '0')
FROM numbered_ar nar
WHERE ar.id = nar.id;

-- Backfill existing update_questions with reference numbers
WITH numbered_q AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.update_questions
  WHERE reference_number IS NULL
)
UPDATE public.update_questions uq
SET reference_number = 'Q-' || LPAD(nq.rn::TEXT, 4, '0')
FROM numbered_q nq
WHERE uq.id = nq.id;