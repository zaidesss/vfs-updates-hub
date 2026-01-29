-- Create ticket_logs table for Zendesk webhook data
CREATE TABLE public.ticket_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zd_instance TEXT NOT NULL,
  ticket_id TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  ticket_type TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  agent_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ticket_gap_daily table for daily average gaps
CREATE TABLE public.ticket_gap_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  agent_name TEXT NOT NULL,
  agent_email TEXT,
  ticket_count INTEGER NOT NULL DEFAULT 0,
  total_gap_seconds INTEGER DEFAULT 0,
  avg_gap_seconds INTEGER DEFAULT 0,
  min_gap_seconds INTEGER,
  max_gap_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, agent_name)
);

-- Create indexes for common queries
CREATE INDEX idx_ticket_logs_agent_name ON public.ticket_logs(agent_name);
CREATE INDEX idx_ticket_logs_timestamp ON public.ticket_logs(timestamp DESC);
CREATE INDEX idx_ticket_logs_ticket_type ON public.ticket_logs(ticket_type);
CREATE INDEX idx_ticket_logs_created_at ON public.ticket_logs(created_at DESC);
CREATE INDEX idx_ticket_gap_daily_date ON public.ticket_gap_daily(date DESC);
CREATE INDEX idx_ticket_gap_daily_agent ON public.ticket_gap_daily(agent_name);

-- Enable RLS on ticket_logs
ALTER TABLE public.ticket_logs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read ticket_logs
CREATE POLICY "All authenticated users can read ticket_logs"
  ON public.ticket_logs FOR SELECT
  USING (true);

-- Enable RLS on ticket_gap_daily
ALTER TABLE public.ticket_gap_daily ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read ticket_gap_daily
CREATE POLICY "All authenticated users can read ticket_gap_daily"
  ON public.ticket_gap_daily FOR SELECT
  USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_logs;

-- Create storage bucket for archives
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-archives', 'ticket-archives', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Admins and super admins can read archives
CREATE POLICY "Admins can read ticket archives"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ticket-archives' AND (
    has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role) OR
    has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role)
  ));