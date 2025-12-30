-- Create leave_requests table for storing leave/outage requests
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Agent information
  agent_email TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  team_lead_name TEXT NOT NULL,
  role TEXT NOT NULL,
  
  -- Date/Time fields (stored in EST/New York timezone context)
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Calculated fields
  outage_duration_hours NUMERIC(10,2),
  total_days INTEGER,
  daily_hours NUMERIC(10,2),
  
  -- Request details
  outage_reason TEXT NOT NULL,
  attachment_url TEXT,
  
  -- Status workflow: pending -> approved/declined/canceled
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'canceled')),
  remarks TEXT,
  
  -- Approval tracking
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own leave requests
CREATE POLICY "Users can view own leave requests"
ON public.leave_requests
FOR SELECT
USING (agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)));

-- Admins can view all leave requests
CREATE POLICY "Admins can view all leave requests"
ON public.leave_requests
FOR SELECT
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- Users can create leave requests for themselves
CREATE POLICY "Users can create own leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)));

-- Admins can update leave requests (approve/decline)
CREATE POLICY "Admins can update leave requests"
ON public.leave_requests
FOR UPDATE
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- Users can cancel their own pending requests
CREATE POLICY "Users can update own pending requests"
ON public.leave_requests
FOR UPDATE
USING (
  agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
  AND status = 'pending'
);

-- Admins can delete leave requests
CREATE POLICY "Admins can delete leave requests"
ON public.leave_requests
FOR DELETE
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_leave_requests_updated_at();

-- Add index for conflict detection queries (same client + role + date range)
CREATE INDEX idx_leave_requests_conflict ON public.leave_requests (client_name, role, start_date, end_date, status);

-- Add index for user queries
CREATE INDEX idx_leave_requests_agent ON public.leave_requests (agent_email);

-- Add index for calendar queries
CREATE INDEX idx_leave_requests_calendar ON public.leave_requests (start_date, end_date, status);