-- Create update status enum
CREATE TYPE public.update_status AS ENUM ('draft', 'published');

-- Create updates table
CREATE TABLE public.updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  help_center_url TEXT,
  posted_by TEXT NOT NULL,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deadline_at TIMESTAMP WITH TIME ZONE,
  status update_status NOT NULL DEFAULT 'draft'
);

-- Enable Row Level Security
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read published updates
CREATE POLICY "Authenticated users can view published updates"
ON public.updates
FOR SELECT
TO authenticated
USING (status = 'published' OR has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- Admins can create updates
CREATE POLICY "Admins can create updates"
ON public.updates
FOR INSERT
TO authenticated
WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- Admins can update updates
CREATE POLICY "Admins can update updates"
ON public.updates
FOR UPDATE
TO authenticated
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role))
WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- Admins can delete updates
CREATE POLICY "Admins can delete updates"
ON public.updates
FOR DELETE
TO authenticated
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));