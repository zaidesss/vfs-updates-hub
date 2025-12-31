-- Fix the SECURITY DEFINER view issue by dropping and recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.leave_calendar_view;

-- Recreate view with SECURITY INVOKER (default, explicit for clarity)
CREATE VIEW public.leave_calendar_view 
WITH (security_invoker = true)
AS
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

-- Add RLS policy for leave_requests that allows authenticated users to see only limited info
-- This backs the view's security
CREATE POLICY "Authenticated users can view calendar data via view"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (status IN ('pending', 'approved'));