-- Create request_type enum
CREATE TYPE request_type AS ENUM ('new_article', 'update_existing', 'general');

-- Create request_status enum
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create article_requests table
CREATE TABLE public.article_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  category update_category,
  request_type request_type NOT NULL DEFAULT 'new_article',
  sample_ticket TEXT,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  status request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on article_requests
ALTER TABLE public.article_requests ENABLE ROW LEVEL SECURITY;

-- Create request_approvals table
CREATE TABLE public.request_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.article_requests(id) ON DELETE CASCADE NOT NULL,
  approver_email TEXT NOT NULL,
  approver_name TEXT,
  approved_at TIMESTAMPTZ,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, approver_email)
);

-- Enable RLS on request_approvals
ALTER TABLE public.request_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for article_requests
CREATE POLICY "Users can view all requests"
ON public.article_requests FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create requests"
ON public.article_requests FOR INSERT TO authenticated
WITH CHECK (submitted_by = lower((current_setting('request.jwt.claims', true)::json->>'email')));

CREATE POLICY "Admins can update requests"
ON public.article_requests FOR UPDATE TO authenticated
USING (has_role((current_setting('request.jwt.claims', true)::json->>'email'), 'admin'::app_role));

CREATE POLICY "Admins can delete requests"
ON public.article_requests FOR DELETE TO authenticated
USING (has_role((current_setting('request.jwt.claims', true)::json->>'email'), 'admin'::app_role));

-- RLS Policies for request_approvals
CREATE POLICY "Users can view all approvals"
ON public.request_approvals FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Approvers can update their own approval"
ON public.request_approvals FOR UPDATE TO authenticated
USING (approver_email = lower((current_setting('request.jwt.claims', true)::json->>'email')));

CREATE POLICY "System can insert approvals"
ON public.request_approvals FOR INSERT TO authenticated
WITH CHECK (true);

-- Add HR delete policy for updates table
CREATE POLICY "HR can delete updates"
ON public.updates FOR DELETE TO authenticated
USING (has_role((current_setting('request.jwt.claims', true)::json->>'email'), 'hr'::app_role));

-- Add HR select policy for updates table
CREATE POLICY "HR can view all updates"
ON public.updates FOR SELECT TO authenticated
USING (has_role((current_setting('request.jwt.claims', true)::json->>'email'), 'hr'::app_role));