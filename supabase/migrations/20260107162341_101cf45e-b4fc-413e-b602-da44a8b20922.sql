-- Create priority enum
CREATE TYPE public.improvement_priority AS ENUM ('low', 'medium', 'high');

-- Create status enum
CREATE TYPE public.improvement_status AS ENUM ('not_started', 'in_progress', 'on_hold', 'completed');

-- Create improvements table
CREATE TABLE public.improvements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  task TEXT NOT NULL,
  description TEXT,
  assignee_email TEXT,
  assignee_name TEXT,
  due_date DATE,
  priority improvement_priority NOT NULL DEFAULT 'medium',
  status improvement_status NOT NULL DEFAULT 'not_started',
  notes TEXT,
  requested_by_email TEXT NOT NULL,
  requested_by_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.improvements ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Super admins can do everything, admins can view
CREATE POLICY "Super admins can view improvements" 
ON public.improvements 
FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Admins can view improvements" 
ON public.improvements 
FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "HR can view improvements" 
ON public.improvements 
FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

CREATE POLICY "Super admins can insert improvements" 
ON public.improvements 
FOR INSERT 
WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can update improvements" 
ON public.improvements 
FOR UPDATE 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete improvements" 
ON public.improvements 
FOR DELETE 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_improvements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_improvements_updated_at
BEFORE UPDATE ON public.improvements
FOR EACH ROW
EXECUTE FUNCTION public.update_improvements_updated_at();