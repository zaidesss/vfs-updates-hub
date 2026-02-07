-- Add quota_ot_email column to agent_profiles
ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS quota_ot_email INTEGER DEFAULT NULL;

-- Add is_ot column to ticket_logs for tracking OT tickets
ALTER TABLE public.ticket_logs
ADD COLUMN IF NOT EXISTS is_ot BOOLEAN DEFAULT FALSE;

-- Add index on is_ot for efficient OT ticket filtering
CREATE INDEX IF NOT EXISTS idx_ticket_logs_is_ot ON public.ticket_logs(is_ot);

-- Add composite index for agent email + is_ot + timestamp for dashboard queries
CREATE INDEX IF NOT EXISTS idx_ticket_logs_agent_ot_timestamp 
ON public.ticket_logs(agent_email, is_ot, timestamp);