
-- Create call_count_daily table for storing daily call counts from Zendesk Talk API
CREATE TABLE public.call_count_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_email text NOT NULL,
  agent_name text NOT NULL,
  date date NOT NULL,
  call_count integer NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT call_count_daily_agent_date_unique UNIQUE (agent_email, date)
);

-- Enable RLS
ALTER TABLE public.call_count_daily ENABLE ROW LEVEL SECURITY;

-- SELECT for authenticated users
CREATE POLICY "Authenticated users can view call counts"
ON public.call_count_daily
FOR SELECT
TO authenticated
USING (true);

-- All ops for service role (edge functions use service role key)
-- Service role bypasses RLS by default, so no explicit policy needed

-- Add index for date range queries
CREATE INDEX idx_call_count_daily_date ON public.call_count_daily (date);
CREATE INDEX idx_call_count_daily_agent_date ON public.call_count_daily (agent_name, date);
