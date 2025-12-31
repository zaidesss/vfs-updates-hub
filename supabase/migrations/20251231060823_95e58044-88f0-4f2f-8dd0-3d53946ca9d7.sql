-- Create leave request change history table
CREATE TABLE public.leave_request_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leave_request_id UUID NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changes JSONB NOT NULL
);

-- Enable RLS
ALTER TABLE public.leave_request_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all history
CREATE POLICY "Admins can view all leave request history"
ON public.leave_request_history
FOR SELECT
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- Users can view history of their own requests
CREATE POLICY "Users can view history of own requests"
ON public.leave_request_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leave_requests lr 
    WHERE lr.id = leave_request_id 
    AND lr.agent_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
  )
);

-- Allow authenticated users to insert history (when editing)
CREATE POLICY "Authenticated users can insert history"
ON public.leave_request_history
FOR INSERT
WITH CHECK (true);