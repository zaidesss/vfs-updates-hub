-- Add new fields to agent_directory table
ALTER TABLE public.agent_directory 
ADD COLUMN IF NOT EXISTS quota numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS support_type text DEFAULT 'Email',
ADD COLUMN IF NOT EXISTS mon_schedule text,
ADD COLUMN IF NOT EXISTS tue_schedule text,
ADD COLUMN IF NOT EXISTS wed_schedule text,
ADD COLUMN IF NOT EXISTS thu_schedule text,
ADD COLUMN IF NOT EXISTS fri_schedule text,
ADD COLUMN IF NOT EXISTS sat_schedule text,
ADD COLUMN IF NOT EXISTS sun_schedule text;

-- Create profile_status table (current state per profile)
CREATE TABLE IF NOT EXISTS public.profile_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.agent_directory(id) ON DELETE CASCADE,
  current_status text NOT NULL DEFAULT 'LOGGED_OUT',
  status_since timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id),
  CONSTRAINT valid_status CHECK (current_status IN ('LOGGED_OUT', 'LOGGED_IN', 'ON_BREAK', 'COACHING'))
);

-- Create profile_events table (append-only audit log)
CREATE TABLE IF NOT EXISTS public.profile_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.agent_directory(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  prev_status text NOT NULL,
  new_status text NOT NULL,
  triggered_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_event_type CHECK (event_type IN ('LOGIN', 'LOGOUT', 'BREAK_IN', 'BREAK_OUT', 'COACHING_START', 'COACHING_END')),
  CONSTRAINT valid_prev_status CHECK (prev_status IN ('LOGGED_OUT', 'LOGGED_IN', 'ON_BREAK', 'COACHING')),
  CONSTRAINT valid_new_status CHECK (new_status IN ('LOGGED_OUT', 'LOGGED_IN', 'ON_BREAK', 'COACHING'))
);

-- Enable RLS on new tables
ALTER TABLE public.profile_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_status
-- Super admins can do everything
CREATE POLICY "Super admins can manage profile_status" ON public.profile_status
FOR ALL USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- Admins can view and update
CREATE POLICY "Admins can view profile_status" ON public.profile_status
FOR SELECT USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Admins can update profile_status" ON public.profile_status
FOR UPDATE USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Admins can insert profile_status" ON public.profile_status
FOR INSERT WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- HR can view and update
CREATE POLICY "HR can view profile_status" ON public.profile_status
FOR SELECT USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

CREATE POLICY "HR can update profile_status" ON public.profile_status
FOR UPDATE USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

CREATE POLICY "HR can insert profile_status" ON public.profile_status
FOR INSERT WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

-- Users can view their own profile status (need to join with agent_directory to check email)
CREATE POLICY "Users can view own profile_status" ON public.profile_status
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.agent_directory ad 
    WHERE ad.id = profile_status.profile_id 
    AND ad.email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
  )
);

-- Users can update their own profile status
CREATE POLICY "Users can update own profile_status" ON public.profile_status
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.agent_directory ad 
    WHERE ad.id = profile_status.profile_id 
    AND ad.email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
  )
);

-- Users can insert their own profile status
CREATE POLICY "Users can insert own profile_status" ON public.profile_status
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agent_directory ad 
    WHERE ad.id = profile_status.profile_id 
    AND ad.email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
  )
);

-- RLS Policies for profile_events
-- Super admins can do everything
CREATE POLICY "Super admins can manage profile_events" ON public.profile_events
FOR ALL USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- Admins can view and insert
CREATE POLICY "Admins can view profile_events" ON public.profile_events
FOR SELECT USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Admins can insert profile_events" ON public.profile_events
FOR INSERT WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- HR can view and insert
CREATE POLICY "HR can view profile_events" ON public.profile_events
FOR SELECT USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

CREATE POLICY "HR can insert profile_events" ON public.profile_events
FOR INSERT WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

-- Users can view their own events
CREATE POLICY "Users can view own profile_events" ON public.profile_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.agent_directory ad 
    WHERE ad.id = profile_events.profile_id 
    AND ad.email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
  )
);

-- Users can insert their own events
CREATE POLICY "Users can insert own profile_events" ON public.profile_events
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agent_directory ad 
    WHERE ad.id = profile_events.profile_id 
    AND ad.email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profile_status_profile_id ON public.profile_status(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_events_profile_id ON public.profile_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_events_created_at ON public.profile_events(created_at DESC);