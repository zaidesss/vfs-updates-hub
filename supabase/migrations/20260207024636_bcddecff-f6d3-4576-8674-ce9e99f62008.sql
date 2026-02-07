-- Update get_agent_dashboard_data RPC to accept an optional reference date parameter
CREATE OR REPLACE FUNCTION public.get_agent_dashboard_data(
  p_profile_id UUID,
  p_reference_date DATE DEFAULT CURRENT_DATE
)
 RETURNS TABLE(profile_id uuid, email text, full_name text, agent_name text, agent_position text, zendesk_instance text, support_type text, ticket_assignment_view_id text, quota_email integer, quota_chat integer, quota_phone integer, quota_ot_email integer, mon_schedule text, tue_schedule text, wed_schedule text, thu_schedule text, fri_schedule text, sat_schedule text, sun_schedule text, day_off text[], ot_enabled boolean, current_status text, status_since timestamp with time zone, current_status_counter integer, latest_login_time timestamp with time zone, week_start_date date, week_end_date date, total_tickets_week integer, total_tickets_today integer, avg_response_gap_seconds integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH date_range AS (
  SELECT 
    -- Use p_reference_date to calculate week boundaries (Monday-Sunday)
    (DATE_TRUNC('week', p_reference_date::timestamp AT TIME ZONE 'America/New_York'))::DATE as week_start,
    (DATE_TRUNC('week', p_reference_date::timestamp AT TIME ZONE 'America/New_York') + INTERVAL '6 days')::DATE as week_end,
    (NOW() AT TIME ZONE 'America/New_York')::DATE as today
),
agent_base AS (
  SELECT 
    ap.id,
    ap.email,
    ap.full_name,
    ap.agent_name,
    ap.position as agent_position,
    ap.quota_email,
    ap.quota_chat,
    ap.quota_phone,
    ap.quota_ot_email,
    ap.mon_schedule,
    ap.tue_schedule,
    ap.wed_schedule,
    ap.thu_schedule,
    ap.fri_schedule,
    ap.sat_schedule,
    ap.sun_schedule,
    ap.day_off,
    ap.zendesk_instance,
    ap.ot_enabled,
    ad.support_type,
    COALESCE(ap.ticket_assignment_view_id, ad.ticket_assignment_view_id) as ticket_assignment_view_id
  FROM public.agent_profiles ap
  LEFT JOIN public.agent_directory ad ON LOWER(ap.email) = LOWER(ad.email)
  WHERE ap.id = p_profile_id
),
agent_status AS (
  SELECT 
    ps.profile_id,
    ps.current_status as status,
    ps.status_since
  FROM public.profile_status ps
  WHERE ps.profile_id = p_profile_id
),
last_login AS (
  SELECT 
    pe.profile_id,
    pe.created_at as login_time
  FROM public.profile_events pe
  WHERE pe.profile_id = p_profile_id
    AND pe.event_type = 'LOGIN'
  ORDER BY pe.created_at DESC
  LIMIT 1
),
status_counter AS (
  SELECT 
    pe.profile_id,
    COUNT(*)::INTEGER as counter
  FROM public.profile_events pe
  CROSS JOIN date_range dr
  WHERE pe.profile_id = p_profile_id
    AND DATE(pe.created_at AT TIME ZONE 'America/New_York') = dr.today
  GROUP BY pe.profile_id
),
tickets_week AS (
  SELECT 
    LOWER(tl.agent_email) as agent_email,
    COUNT(*)::INTEGER as ticket_count
  FROM public.ticket_logs tl
  CROSS JOIN date_range dr
  WHERE DATE(tl.timestamp AT TIME ZONE 'America/New_York') >= dr.week_start
    AND DATE(tl.timestamp AT TIME ZONE 'America/New_York') <= dr.week_end
  GROUP BY LOWER(tl.agent_email)
),
tickets_today AS (
  SELECT 
    LOWER(tl.agent_email) as agent_email,
    COUNT(*)::INTEGER as ticket_count
  FROM public.ticket_logs tl
  CROSS JOIN date_range dr
  WHERE DATE(tl.timestamp AT TIME ZONE 'America/New_York') = dr.today
  GROUP BY LOWER(tl.agent_email)
),
gap_data AS (
  SELECT 
    tgd.agent_email,
    tgd.avg_gap_seconds
  FROM public.ticket_gap_daily tgd
  CROSS JOIN date_range dr
  WHERE tgd.date = dr.today
)
SELECT 
  ab.id,
  ab.email,
  ab.full_name,
  ab.agent_name,
  ab.agent_position,
  ab.zendesk_instance,
  ab.support_type,
  ab.ticket_assignment_view_id,
  ab.quota_email,
  ab.quota_chat,
  ab.quota_phone,
  ab.quota_ot_email,
  ab.mon_schedule,
  ab.tue_schedule,
  ab.wed_schedule,
  ab.thu_schedule,
  ab.fri_schedule,
  ab.sat_schedule,
  ab.sun_schedule,
  ab.day_off,
  ab.ot_enabled,
  COALESCE(ps.status, 'LOGGED_OUT') as current_status,
  COALESCE(ps.status_since, NOW()) as status_since,
  COALESCE(sc.counter, 0) as current_status_counter,
  ll.login_time,
  (SELECT week_start FROM date_range),
  (SELECT week_end FROM date_range),
  COALESCE(tw.ticket_count, 0) as total_tickets_week,
  COALESCE(tt.ticket_count, 0) as total_tickets_today,
  COALESCE(gd.avg_gap_seconds, 0) as avg_response_gap_seconds
FROM agent_base ab
LEFT JOIN agent_status ps ON ab.id = ps.profile_id
LEFT JOIN last_login ll ON ab.id = ll.profile_id
LEFT JOIN status_counter sc ON ab.id = sc.profile_id
LEFT JOIN tickets_week tw ON LOWER(ab.email) = tw.agent_email
LEFT JOIN tickets_today tt ON LOWER(ab.email) = tt.agent_email
LEFT JOIN gap_data gd ON LOWER(ab.email) = LOWER(gd.agent_email);
$function$;