
-- Create coverage_overrides table
CREATE TABLE public.coverage_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  override_start text NOT NULL,
  override_end text NOT NULL,
  reason text NOT NULL DEFAULT 'manual',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_id, date)
);

-- Enable RLS
ALTER TABLE public.coverage_overrides ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "Authenticated users can view coverage overrides"
ON public.coverage_overrides
FOR SELECT
TO authenticated
USING (true);

-- Admin/HR/Super Admin can insert
CREATE POLICY "Admins can insert coverage overrides"
ON public.coverage_overrides
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(lower((SELECT auth.jwt()->>'email')), 'admin')
  OR public.has_role(lower((SELECT auth.jwt()->>'email')), 'hr')
  OR public.has_role(lower((SELECT auth.jwt()->>'email')), 'super_admin')
);

-- Admin/HR/Super Admin can update
CREATE POLICY "Admins can update coverage overrides"
ON public.coverage_overrides
FOR UPDATE
TO authenticated
USING (
  public.has_role(lower((SELECT auth.jwt()->>'email')), 'admin')
  OR public.has_role(lower((SELECT auth.jwt()->>'email')), 'hr')
  OR public.has_role(lower((SELECT auth.jwt()->>'email')), 'super_admin')
);

-- Admin/HR/Super Admin can delete
CREATE POLICY "Admins can delete coverage overrides"
ON public.coverage_overrides
FOR DELETE
TO authenticated
USING (
  public.has_role(lower((SELECT auth.jwt()->>'email')), 'admin')
  OR public.has_role(lower((SELECT auth.jwt()->>'email')), 'hr')
  OR public.has_role(lower((SELECT auth.jwt()->>'email')), 'super_admin')
);

-- Index for fast lookups by date
CREATE INDEX idx_coverage_overrides_date ON public.coverage_overrides(date);
CREATE INDEX idx_coverage_overrides_agent_date ON public.coverage_overrides(agent_id, date);
