-- Fix Security Issue 1: Leave requests calendar exposure
-- Drop the overly permissive policy that exposes all leave details
DROP POLICY IF EXISTS "All users can view pending and approved requests for calendar" ON public.leave_requests;

-- Create a more restrictive policy that only allows viewing necessary calendar fields
-- Users can see that someone is out, but not sensitive details like reasons
-- This is implemented via a view instead of direct table access
CREATE OR REPLACE VIEW public.leave_calendar_view AS
SELECT 
  id,
  agent_name,
  start_date,
  end_date,
  status,
  client_name
FROM public.leave_requests
WHERE status IN ('pending', 'approved');

-- Grant select on the view to authenticated users
GRANT SELECT ON public.leave_calendar_view TO authenticated;

-- Fix Security Issue 2: Reminder logs overly permissive insert
-- Drop the permissive insert policy
DROP POLICY IF EXISTS "Service can insert reminder logs" ON public.reminder_logs;

-- Create a function that can insert reminder logs (called by edge functions with service role)
CREATE OR REPLACE FUNCTION public.insert_reminder_log(
  p_user_email TEXT,
  p_update_id UUID DEFAULT NULL,
  p_reminder_type TEXT DEFAULT 'daily'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.reminder_logs (user_email, update_id, reminder_type)
  VALUES (p_user_email, p_update_id, p_reminder_type)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- No direct insert policy - only the function can insert
-- Edge functions use service role key which bypasses RLS