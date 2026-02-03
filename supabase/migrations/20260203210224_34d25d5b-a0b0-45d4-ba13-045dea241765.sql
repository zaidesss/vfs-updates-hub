-- Table: ticket_assignment_view_config
-- Central configuration for View IDs per Zendesk instance and support type
CREATE TABLE public.ticket_assignment_view_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zendesk_instance TEXT NOT NULL,
  support_type_pattern TEXT NOT NULL,
  view_id TEXT,
  view_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(zendesk_instance, support_type_pattern)
);

-- Enable RLS
ALTER TABLE public.ticket_assignment_view_config ENABLE ROW LEVEL SECURITY;

-- RLS policies - admins can manage, all authenticated can read
CREATE POLICY "Admins can manage view config"
ON public.ticket_assignment_view_config
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert initial configuration (ZD1 enabled with placeholder, ZD2 disabled)
INSERT INTO public.ticket_assignment_view_config (zendesk_instance, support_type_pattern, view_id, view_name, is_enabled) VALUES
  ('ZD1', 'email_hybrid', 'PENDING_VIEW_ID', 'OpenAssign', false),
  ('ZD1', 'chat_phone', 'PENDING_VIEW_ID', 'NewAssign', false),
  ('ZD2', 'email_hybrid', NULL, 'Pending', false),
  ('ZD2', 'chat_phone', NULL, 'Pending', false);

-- Table: ticket_assignment_locks
-- Per-view locking to prevent race conditions
CREATE TABLE public.ticket_assignment_locks (
  view_id TEXT PRIMARY KEY,
  locked_by TEXT NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '60 seconds')
);

-- Enable RLS
ALTER TABLE public.ticket_assignment_locks ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow all operations for the locking mechanism
CREATE POLICY "Allow lock operations"
ON public.ticket_assignment_locks
FOR ALL
USING (true)
WITH CHECK (true);

-- Table: ticket_assignment_logs
-- Audit trail for all assignment attempts
CREATE TABLE public.ticket_assignment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_email TEXT NOT NULL,
  agent_name TEXT,
  zendesk_instance TEXT,
  view_id TEXT,
  view_name TEXT,
  tickets_requested INTEGER NOT NULL DEFAULT 0,
  tickets_assigned INTEGER NOT NULL DEFAULT 0,
  ticket_ids TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_assignment_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies - admins can read all, agents can read their own
CREATE POLICY "Admins can read all logs"
ON public.ticket_assignment_logs
FOR SELECT
USING (true);

CREATE POLICY "Allow insert for logging"
ON public.ticket_assignment_logs
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_ticket_assignment_logs_agent_email ON public.ticket_assignment_logs(agent_email);
CREATE INDEX idx_ticket_assignment_logs_created_at ON public.ticket_assignment_logs(created_at DESC);
CREATE INDEX idx_ticket_assignment_logs_status ON public.ticket_assignment_logs(status);