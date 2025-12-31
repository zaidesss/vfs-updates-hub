-- Update the leave_calendar_view to include outage_reason
DROP VIEW IF EXISTS public.leave_calendar_view;

CREATE VIEW public.leave_calendar_view WITH (security_invoker = true) AS
SELECT 
  id,
  agent_name,
  client_name,
  start_date,
  end_date,
  status,
  outage_reason
FROM public.leave_requests
WHERE status IN ('pending', 'approved');

-- Grant access to authenticated users
GRANT SELECT ON public.leave_calendar_view TO authenticated;