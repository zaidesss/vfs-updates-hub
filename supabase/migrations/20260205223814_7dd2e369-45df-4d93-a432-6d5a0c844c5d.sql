-- ============================================
-- RPC: get_agent_dashboard_data
-- Purpose: Consolidate dashboard queries into a single call
-- Returns: Comprehensive agent profile, status, and metrics data
-- ============================================

CREATE OR REPLACE FUNCTION public.get_agent_dashboard_data(
  p_profile_id UUID
)
RETURNS TABLE (
  profile_id UUID,
  email TEXT,
  full_name TEXT,
  agent_name TEXT,
  agent_position TEXT,
  zendesk_instance TEXT,
  support_type TEXT,
  ticket_assignment_view_id TEXT,
  quota_email INTEGER,
  quota_chat INTEGER,
  quota_phone INTEGER,
  mon_schedule TEXT,
  tue_schedule TEXT,
  wed_schedule TEXT,
  thu_schedule TEXT,
  fri_schedule TEXT,
  sat_schedule TEXT,
  sun_schedule TEXT,
  day_off TEXT[],
  ot_enabled BOOLEAN,
  current_status TEXT,
  status_since TIMESTAMP WITH TIME ZONE,
  current_status_counter INTEGER,
  latest_login_time TIMESTAMP WITH TIME ZONE,
  week_start_date DATE,
  week_end_date DATE,
  total_tickets_week INTEGER,
  total_tickets_today INTEGER,
  avg_response_gap_seconds INTEGER
) AS $$
WITH date_range AS (
  SELECT 
    DATE_TRUNC('week', NOW() AT TIME ZONE 'America/New_York')::DATE as week_start,
    (DATE_TRUNC('week', NOW() AT TIME ZONE 'America/New_York') + INTERVAL '6 days')::DATE as week_end,
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
$$ LANGUAGE SQL STABLE SECURITY DEFINER;