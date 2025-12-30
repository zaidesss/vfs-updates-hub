-- Add 'obsolete' to update_status enum
ALTER TYPE update_status ADD VALUE IF NOT EXISTS 'obsolete';

-- Create update_questions table for user questions
CREATE TABLE public.update_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  update_id UUID NOT NULL REFERENCES public.updates(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.update_questions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own questions
CREATE POLICY "Users can insert own questions"
ON public.update_questions
FOR INSERT
WITH CHECK (user_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)));

-- Admins can view all questions
CREATE POLICY "Admins can view all questions"
ON public.update_questions
FOR SELECT
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- Users can view their own questions
CREATE POLICY "Users can view own questions"
ON public.update_questions
FOR SELECT
USING (user_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)));

-- Create update_change_history table for tracking edits
CREATE TABLE public.update_change_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  update_id UUID NOT NULL REFERENCES public.updates(id) ON DELETE CASCADE,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changes JSONB NOT NULL
);

-- Enable RLS
ALTER TABLE public.update_change_history ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view change history
CREATE POLICY "Authenticated users can view change history"
ON public.update_change_history
FOR SELECT
USING (true);

-- Only admins can insert change history (done via API when editing)
CREATE POLICY "Admins can insert change history"
ON public.update_change_history
FOR INSERT
WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- Add name column to user_roles for storing display names
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS name TEXT;

-- Create table for tracking reminder notifications
CREATE TABLE public.reminder_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  update_id UUID REFERENCES public.updates(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'daily'
);

-- Enable RLS
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view reminder logs
CREATE POLICY "Admins can view reminder logs"
ON public.reminder_logs
FOR SELECT
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- Service role can insert (for edge function)
CREATE POLICY "Service can insert reminder logs"
ON public.reminder_logs
FOR INSERT
WITH CHECK (true);