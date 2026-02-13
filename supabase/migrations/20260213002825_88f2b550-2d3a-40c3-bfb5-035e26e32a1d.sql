
-- Create agent_schedule_assignments table
CREATE TABLE public.agent_schedule_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
  effective_week_start DATE NOT NULL,
  mon_schedule TEXT,
  tue_schedule TEXT,
  wed_schedule TEXT,
  thu_schedule TEXT,
  fri_schedule TEXT,
  sat_schedule TEXT,
  sun_schedule TEXT,
  mon_ot_schedule TEXT,
  tue_ot_schedule TEXT,
  wed_ot_schedule TEXT,
  thu_ot_schedule TEXT,
  fri_ot_schedule TEXT,
  sat_ot_schedule TEXT,
  sun_ot_schedule TEXT,
  day_off TEXT[],
  break_schedule TEXT,
  ot_enabled BOOLEAN DEFAULT false,
  quota_email INTEGER,
  quota_chat INTEGER,
  quota_phone INTEGER,
  quota_ot_email INTEGER,
  source TEXT NOT NULL DEFAULT 'agent_profile',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  CONSTRAINT unique_agent_week UNIQUE (agent_id, effective_week_start)
);

CREATE INDEX idx_schedule_assignments_agent_week 
  ON public.agent_schedule_assignments (agent_id, effective_week_start DESC);

ALTER TABLE public.agent_schedule_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read schedule assignments"
  ON public.agent_schedule_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage schedule assignments"
  ON public.agent_schedule_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE email = lower(auth.jwt() ->> 'email')
      AND role IN ('admin', 'super_admin', 'hr')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE email = lower(auth.jwt() ->> 'email')
      AND role IN ('admin', 'super_admin', 'hr')
    )
  );

-- Backfill current schedules
INSERT INTO public.agent_schedule_assignments (
  agent_id, effective_week_start,
  mon_schedule, tue_schedule, wed_schedule, thu_schedule,
  fri_schedule, sat_schedule, sun_schedule,
  mon_ot_schedule, tue_ot_schedule, wed_ot_schedule, thu_ot_schedule,
  fri_ot_schedule, sat_ot_schedule, sun_ot_schedule,
  day_off, break_schedule, ot_enabled,
  quota_email, quota_chat, quota_phone, quota_ot_email,
  source, created_by, notes
)
SELECT
  ap.id,
  DATE_TRUNC('week', NOW() AT TIME ZONE 'America/New_York')::DATE,
  ap.mon_schedule, ap.tue_schedule, ap.wed_schedule, ap.thu_schedule,
  ap.fri_schedule, ap.sat_schedule, ap.sun_schedule,
  ap.mon_ot_schedule, ap.tue_ot_schedule, ap.wed_ot_schedule, ap.thu_ot_schedule,
  ap.fri_ot_schedule, ap.sat_ot_schedule, ap.sun_ot_schedule,
  ap.day_off, ap.break_schedule, COALESCE(ap.ot_enabled, false),
  ap.quota_email, ap.quota_chat, ap.quota_phone, ap.quota_ot_email,
  'migration', 'system', 'Initial snapshot from agent_profiles'
FROM public.agent_profiles ap
WHERE ap.employment_status IS DISTINCT FROM 'Terminated';
