-- Create agent_directory table for Master Directory data
CREATE TABLE public.agent_directory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  zendesk_instance TEXT,
  support_account TEXT,
  agent_name TEXT,
  agent_tag TEXT,
  views TEXT[] DEFAULT '{}',
  ticket_assignment_view_id TEXT,
  weekday_schedule TEXT,
  weekday_total_hours NUMERIC DEFAULT 0,
  wd_ticket_assign TEXT,
  weekend_schedule TEXT,
  weekend_total_hours NUMERIC DEFAULT 0,
  we_ticket_assign TEXT,
  break_schedule TEXT,
  weekday_ot_schedule TEXT,
  weekend_ot_schedule TEXT,
  ot_total_hours NUMERIC DEFAULT 0,
  overall_total_hours NUMERIC DEFAULT 0,
  day_off TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_directory_history table for edit tracking
CREATE TABLE public.agent_directory_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  directory_entry_id UUID NOT NULL REFERENCES public.agent_directory(id) ON DELETE CASCADE,
  changed_by TEXT NOT NULL,
  changes JSONB NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.agent_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_directory_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_directory
-- Super admins can do everything
CREATE POLICY "Super admins can view agent_directory"
  ON public.agent_directory FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert agent_directory"
  ON public.agent_directory FOR INSERT
  WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can update agent_directory"
  ON public.agent_directory FOR UPDATE
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete agent_directory"
  ON public.agent_directory FOR DELETE
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- Admins can view and update
CREATE POLICY "Admins can view agent_directory"
  ON public.agent_directory FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Admins can insert agent_directory"
  ON public.agent_directory FOR INSERT
  WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Admins can update agent_directory"
  ON public.agent_directory FOR UPDATE
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- HR can view and update
CREATE POLICY "HR can view agent_directory"
  ON public.agent_directory FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

CREATE POLICY "HR can insert agent_directory"
  ON public.agent_directory FOR INSERT
  WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

CREATE POLICY "HR can update agent_directory"
  ON public.agent_directory FOR UPDATE
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

-- RLS Policies for agent_directory_history
CREATE POLICY "Super admins can view agent_directory_history"
  ON public.agent_directory_history FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert agent_directory_history"
  ON public.agent_directory_history FOR INSERT
  WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Admins can view agent_directory_history"
  ON public.agent_directory_history FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "Admins can insert agent_directory_history"
  ON public.agent_directory_history FOR INSERT
  WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "HR can view agent_directory_history"
  ON public.agent_directory_history FOR SELECT
  USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

CREATE POLICY "HR can insert agent_directory_history"
  ON public.agent_directory_history FOR INSERT
  WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_agent_directory_updated_at
  BEFORE UPDATE ON public.agent_directory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_changelog_updated_at();