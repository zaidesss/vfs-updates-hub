
-- Step 1A: Add columns to coverage_overrides
ALTER TABLE public.coverage_overrides
  ADD COLUMN IF NOT EXISTS override_type TEXT NOT NULL DEFAULT 'override',
  ADD COLUMN IF NOT EXISTS break_schedule TEXT,
  ADD COLUMN IF NOT EXISTS previous_value TEXT;

-- Drop the unique constraint on (agent_id, date)
ALTER TABLE public.coverage_overrides
  DROP CONSTRAINT IF EXISTS coverage_overrides_agent_id_date_key;

-- Create new unique index on (agent_id, date, override_type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_coverage_overrides_agent_date_type
  ON public.coverage_overrides (agent_id, date, override_type);

-- Step 1B: Create coverage_override_logs table
CREATE TABLE IF NOT EXISTS public.coverage_override_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  date DATE NOT NULL,
  override_type TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  break_schedule TEXT,
  changed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coverage_override_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read logs
CREATE POLICY "Authenticated users can read override logs"
  ON public.coverage_override_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can insert logs
CREATE POLICY "Authenticated users can insert override logs"
  ON public.coverage_override_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Index for fast week-based queries
CREATE INDEX IF NOT EXISTS idx_coverage_override_logs_date
  ON public.coverage_override_logs (date);
