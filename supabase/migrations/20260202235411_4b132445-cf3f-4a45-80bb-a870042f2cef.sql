-- Create agent_reports table for behavioral compliance tracking
CREATE TABLE public.agent_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_email text NOT NULL,
  agent_name text NOT NULL,
  profile_id uuid REFERENCES public.agent_profiles(id),
  incident_type text NOT NULL,
  incident_date date NOT NULL,
  severity text DEFAULT 'medium',
  status text DEFAULT 'open',
  details jsonb DEFAULT '{}',
  frequency_count integer DEFAULT 1,
  reviewed_by text,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_incident_type CHECK (incident_type IN (
    'QUOTA_NOT_MET', 'NO_LOGOUT', 'HIGH_GAP', 'EXCESSIVE_RESTARTS',
    'TIME_NOT_MET', 'LATE_LOGIN', 'EARLY_OUT', 'BIO_OVERUSE'
  )),
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high')),
  CONSTRAINT valid_status CHECK (status IN ('open', 'reviewed', 'validated', 'dismissed'))
);

-- Indexes for common queries
CREATE INDEX idx_agent_reports_agent_email ON public.agent_reports(agent_email);
CREATE INDEX idx_agent_reports_incident_date ON public.agent_reports(incident_date);
CREATE INDEX idx_agent_reports_status ON public.agent_reports(status);
CREATE INDEX idx_agent_reports_incident_type ON public.agent_reports(incident_type);

-- Composite unique constraint to prevent duplicate reports
CREATE UNIQUE INDEX idx_agent_reports_unique 
ON public.agent_reports(agent_email, incident_type, incident_date);

-- Add bio break columns to profile_status
ALTER TABLE public.profile_status 
ADD COLUMN bio_time_remaining_seconds integer DEFAULT NULL,
ADD COLUMN bio_allowance_seconds integer DEFAULT NULL;

-- Enable RLS on agent_reports
ALTER TABLE public.agent_reports ENABLE ROW LEVEL SECURITY;

-- Admins, HR, Super Admins can view all reports
CREATE POLICY "Admins can view all reports" ON public.agent_reports
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE email = (auth.jwt() ->> 'email')
    AND role IN ('admin', 'hr', 'super_admin')
  )
);

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON public.agent_reports
FOR SELECT USING (
  agent_email = (auth.jwt() ->> 'email')
);

-- Admins can insert reports
CREATE POLICY "Admins can insert reports" ON public.agent_reports
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE email = (auth.jwt() ->> 'email')
    AND role IN ('admin', 'hr', 'super_admin')
  )
);

-- Admins can update reports
CREATE POLICY "Admins can update reports" ON public.agent_reports
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE email = (auth.jwt() ->> 'email')
    AND role IN ('admin', 'hr', 'super_admin')
  )
);

-- Admins can delete reports
CREATE POLICY "Admins can delete reports" ON public.agent_reports
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE email = (auth.jwt() ->> 'email')
    AND role IN ('admin', 'hr', 'super_admin')
  )
);

-- Service role can manage reports (for edge functions)
CREATE POLICY "Service role can manage reports" ON public.agent_reports
FOR ALL USING (true) WITH CHECK (true);