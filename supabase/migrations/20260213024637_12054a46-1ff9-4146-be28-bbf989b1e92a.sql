-- Create attendance_snapshots table for storing historical weekly attendance data
CREATE TABLE public.attendance_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  leave_type TEXT,
  login_time TEXT,
  logout_time TEXT,
  schedule_start TEXT,
  schedule_end TEXT,
  is_early_out BOOLEAN,
  no_logout BOOLEAN,
  hours_worked_formatted TEXT,
  hours_worked_minutes INTEGER,
  break_duration_minutes INTEGER,
  break_duration_formatted TEXT,
  allowed_break_minutes INTEGER,
  allowed_break_formatted TEXT,
  is_overbreak BOOLEAN,
  break_overage_minutes INTEGER,
  ot_schedule TEXT,
  ot_login_time TEXT,
  ot_logout_time TEXT,
  ot_status TEXT,
  ot_hours_worked_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT attendance_snapshots_unique UNIQUE(profile_id, date)
);

ALTER TABLE public.attendance_snapshots ENABLE ROW LEVEL SECURITY;

-- Agents can view their own snapshots, admins/HR can view all
CREATE POLICY "Users can view attendance snapshots"
  ON public.attendance_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_profiles 
      WHERE agent_profiles.id = attendance_snapshots.profile_id 
      AND agent_profiles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND user_roles.role IN ('admin', 'hr', 'super_admin')
    )
  );

-- Create event_snapshots table for storing historical profile events
CREATE TABLE public.event_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  week_start TEXT NOT NULL,
  event_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT event_snapshots_unique UNIQUE(profile_id, week_start, event_type)
);

ALTER TABLE public.event_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view event snapshots"
  ON public.event_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_profiles 
      WHERE agent_profiles.id = event_snapshots.profile_id 
      AND agent_profiles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND user_roles.role IN ('admin', 'hr', 'super_admin')
    )
  );

CREATE INDEX idx_attendance_snapshots_profile_date ON public.attendance_snapshots(profile_id, date);
CREATE INDEX idx_event_snapshots_profile_week ON public.event_snapshots(profile_id, week_start);