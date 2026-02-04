-- Create saved_scorecards table for frozen/saved scorecard values
CREATE TABLE public.saved_scorecards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  support_type TEXT NOT NULL,
  agent_email TEXT NOT NULL,
  agent_name TEXT,
  productivity NUMERIC,
  productivity_count INTEGER,
  call_aht_seconds NUMERIC,
  chat_aht_seconds NUMERIC,
  chat_frt_seconds NUMERIC,
  qa NUMERIC,
  revalida NUMERIC,
  reliability NUMERIC,
  ot_productivity NUMERIC,
  final_score NUMERIC,
  scheduled_days INTEGER,
  days_present INTEGER,
  approved_leave_days INTEGER,
  is_on_leave BOOLEAN DEFAULT false,
  saved_by TEXT NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one entry per agent per week per support type
  CONSTRAINT saved_scorecards_unique_entry UNIQUE (week_start, week_end, support_type, agent_email)
);

-- Create index for faster lookups
CREATE INDEX idx_saved_scorecards_week ON public.saved_scorecards (week_start, week_end, support_type);
CREATE INDEX idx_saved_scorecards_agent ON public.saved_scorecards (agent_email);

-- Enable Row Level Security
ALTER TABLE public.saved_scorecards ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view saved scorecards
CREATE POLICY "Everyone can view saved scorecards"
ON public.saved_scorecards
FOR SELECT
USING (true);

-- RLS Policy: Only admins and super_admins can insert saved scorecards
CREATE POLICY "Admins can insert saved scorecards"
ON public.saved_scorecards
FOR INSERT
WITH CHECK (
  public.is_admin(auth.jwt() ->> 'email') OR 
  public.is_super_admin(auth.jwt() ->> 'email')
);

-- RLS Policy: Only admins and super_admins can update saved scorecards
CREATE POLICY "Admins can update saved scorecards"
ON public.saved_scorecards
FOR UPDATE
USING (
  public.is_admin(auth.jwt() ->> 'email') OR 
  public.is_super_admin(auth.jwt() ->> 'email')
);

-- RLS Policy: Only admins and super_admins can delete saved scorecards
CREATE POLICY "Admins can delete saved scorecards"
ON public.saved_scorecards
FOR DELETE
USING (
  public.is_admin(auth.jwt() ->> 'email') OR 
  public.is_super_admin(auth.jwt() ->> 'email')
);

-- Add unique constraint to zendesk_agent_metrics for upsert operations
ALTER TABLE public.zendesk_agent_metrics 
ADD CONSTRAINT zendesk_agent_metrics_unique_week 
UNIQUE (agent_email, week_start, week_end);

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;