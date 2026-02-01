-- Create upwork_daily_logs table to store daily Upwork tracking data
CREATE TABLE public.upwork_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT NOT NULL,
  agent_email TEXT NOT NULL,
  date DATE NOT NULL,
  first_cell_index INTEGER,         -- Cell index (0-143) when tracking started
  last_cell_index INTEGER,          -- Cell index (0-143) when tracking ended
  first_cell_time TIME,             -- Calculated time when tracking started
  last_cell_time TIME,              -- Calculated time when tracking ended
  total_cells INTEGER DEFAULT 0,    -- Number of 10-min cells tracked
  total_hours NUMERIC(5,2),         -- Calculated total hours
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, date)
);

-- Add RLS policies
ALTER TABLE public.upwork_daily_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own logs
CREATE POLICY "Users can view their own upwork logs"
  ON public.upwork_daily_logs
  FOR SELECT
  USING (auth.jwt() ->> 'email' = agent_email);

-- Allow admins/HR to view all logs
CREATE POLICY "Admins can view all upwork logs"
  ON public.upwork_daily_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE email = auth.jwt() ->> 'email'
      AND role IN ('admin', 'hr', 'super_admin')
    )
  );

-- Allow service role to insert/update (for edge function)
CREATE POLICY "Service role can manage upwork logs"
  ON public.upwork_daily_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_upwork_daily_logs_contract_date ON public.upwork_daily_logs(contract_id, date);
CREATE INDEX idx_upwork_daily_logs_agent_email ON public.upwork_daily_logs(agent_email);