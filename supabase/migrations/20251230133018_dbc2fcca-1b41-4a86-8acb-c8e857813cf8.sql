-- Add stage and active columns to request_approvals
ALTER TABLE public.request_approvals 
ADD COLUMN IF NOT EXISTS stage smallint NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Add pending_final_review to request_status enum
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'pending_final_review';

-- Add final decision columns to article_requests
ALTER TABLE public.article_requests 
ADD COLUMN IF NOT EXISTS final_decision text,
ADD COLUMN IF NOT EXISTS final_notes text,
ADD COLUMN IF NOT EXISTS final_reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS final_reviewed_by text;

-- Create index for faster approval lookups
CREATE INDEX IF NOT EXISTS idx_request_approvals_active ON public.request_approvals(request_id, active, approved);