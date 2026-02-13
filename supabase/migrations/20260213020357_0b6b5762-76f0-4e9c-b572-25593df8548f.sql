
-- Phase 1: Create Snapshot Tables + State Tracking

-- 1. weekly_scorecard_snapshots
CREATE TABLE IF NOT EXISTS public.weekly_scorecard_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_email TEXT NOT NULL,
  agent_name TEXT,
  support_type TEXT,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  schedule_source TEXT,
  schedule_json JSONB,
  expected_hours NUMERIC,
  scheduled_days INTEGER,
  days_present INTEGER,
  productivity NUMERIC,
  productivity_count INTEGER,
  call_aht_seconds NUMERIC,
  chat_aht_seconds NUMERIC,
  chat_frt_seconds NUMERIC,
  qa NUMERIC,
  revalida NUMERIC,
  reliability NUMERIC,
  ot_productivity NUMERIC,
  order_escalation NUMERIC,
  final_score NUMERIC,
  approved_leave_days INTEGER,
  planned_leave_days INTEGER,
  unplanned_outage_days INTEGER,
  is_on_leave BOOLEAN,
  version INTEGER NOT NULL DEFAULT 1,
  is_final BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_email, week_start)
);

-- 2. weekly_agent_metrics
CREATE TABLE IF NOT EXISTS public.weekly_agent_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_email TEXT NOT NULL,
  week_start DATE NOT NULL,
  attendance_json JSONB,
  total_hours_worked NUMERIC,
  total_break_minutes NUMERIC,
  total_tickets INTEGER,
  email_count INTEGER,
  chat_count INTEGER,
  call_count INTEGER,
  avg_gap_seconds NUMERIC,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  is_final BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_email, week_start)
);

-- 3. weekly_incident_snapshots
CREATE TABLE IF NOT EXISTS public.weekly_incident_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_email TEXT NOT NULL,
  week_start DATE NOT NULL,
  incidents_json JSONB,
  incident_count INTEGER,
  by_type JSONB,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  is_final BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_email, week_start)
);

-- 4. weekly_ticket_summary
CREATE TABLE IF NOT EXISTS public.weekly_ticket_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_email TEXT NOT NULL,
  week_start DATE NOT NULL,
  zd_instance TEXT,
  daily_breakdown JSONB,
  total_tickets INTEGER,
  archive_file_path TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  is_final BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_email, week_start, zd_instance)
);

-- 5. weekly_snapshot_state
CREATE TABLE IF NOT EXISTS public.weekly_snapshot_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  last_computed_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  raw_data_deleted_at TIMESTAMPTZ,
  archive_file_path TEXT,
  error_message TEXT,
  lock_key UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_scorecard_snapshots_agent_week ON public.weekly_scorecard_snapshots(agent_email, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_scorecard_snapshots_is_final ON public.weekly_scorecard_snapshots(is_final, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_agent_metrics_agent_week ON public.weekly_agent_metrics(agent_email, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_agent_metrics_is_final ON public.weekly_agent_metrics(is_final, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_incident_snapshots_agent_week ON public.weekly_incident_snapshots(agent_email, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_incident_snapshots_is_final ON public.weekly_incident_snapshots(is_final, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_ticket_summary_agent_week ON public.weekly_ticket_summary(agent_email, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_ticket_summary_is_final ON public.weekly_ticket_summary(is_final, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_snapshot_state_status ON public.weekly_snapshot_state(status, week_start);

-- Enable RLS on all snapshot tables
ALTER TABLE public.weekly_scorecard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_incident_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_ticket_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_snapshot_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All agents can view snapshots (historical data is not sensitive)
CREATE POLICY "Snapshots are viewable by all agents" ON public.weekly_scorecard_snapshots FOR SELECT USING (true);
CREATE POLICY "Snapshots are insertable by service" ON public.weekly_scorecard_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Snapshots are updatable by service" ON public.weekly_scorecard_snapshots FOR UPDATE USING (true);

CREATE POLICY "Metrics are viewable by all agents" ON public.weekly_agent_metrics FOR SELECT USING (true);
CREATE POLICY "Metrics are insertable by service" ON public.weekly_agent_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Metrics are updatable by service" ON public.weekly_agent_metrics FOR UPDATE USING (true);

CREATE POLICY "Incidents are viewable by all agents" ON public.weekly_incident_snapshots FOR SELECT USING (true);
CREATE POLICY "Incidents are insertable by service" ON public.weekly_incident_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Incidents are updatable by service" ON public.weekly_incident_snapshots FOR UPDATE USING (true);

CREATE POLICY "Ticket summary is viewable by all agents" ON public.weekly_ticket_summary FOR SELECT USING (true);
CREATE POLICY "Ticket summary is insertable by service" ON public.weekly_ticket_summary FOR INSERT WITH CHECK (true);
CREATE POLICY "Ticket summary is updatable by service" ON public.weekly_ticket_summary FOR UPDATE USING (true);

CREATE POLICY "Snapshot state is viewable by all agents" ON public.weekly_snapshot_state FOR SELECT USING (true);
CREATE POLICY "Snapshot state is insertable by service" ON public.weekly_snapshot_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Snapshot state is updatable by service" ON public.weekly_snapshot_state FOR UPDATE USING (true);

-- Timestamp update triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_weekly_scorecard_snapshots_updated_at
BEFORE UPDATE ON public.weekly_scorecard_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_agent_metrics_updated_at
BEFORE UPDATE ON public.weekly_agent_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_incident_snapshots_updated_at
BEFORE UPDATE ON public.weekly_incident_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_ticket_summary_updated_at
BEFORE UPDATE ON public.weekly_ticket_summary
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_snapshot_state_updated_at
BEFORE UPDATE ON public.weekly_snapshot_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
