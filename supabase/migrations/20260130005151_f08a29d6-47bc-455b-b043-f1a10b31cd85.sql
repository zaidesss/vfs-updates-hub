-- Add organization context columns to upwork_tokens table
ALTER TABLE public.upwork_tokens 
ADD COLUMN IF NOT EXISTS organization_id TEXT,
ADD COLUMN IF NOT EXISTS organization_name TEXT;