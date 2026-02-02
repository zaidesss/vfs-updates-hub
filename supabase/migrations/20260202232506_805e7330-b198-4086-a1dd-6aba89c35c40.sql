-- Create optimized function for Ticket Dashboard data
-- This consolidates 5 separate queries into a single database call

CREATE OR REPLACE FUNCTION get_ticket_dashboard_data(
  p_zd_instance text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  agent_name text,
  agent_email text,
  log_date date,
  email_count bigint,
  chat_count bigint,
  call_count bigint,
  avg_gap_seconds numeric,
  is_logged_in boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ticket_counts AS (
    SELECT 
      tl.agent_name,
      tl.agent_email,
      (tl.timestamp AT TIME ZONE 'America/New_York')::date as log_date,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'email') as email_count,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'chat') as chat_count,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'call') as call_count
    FROM ticket_logs tl
    WHERE tl.zd_instance = p_zd_instance
      AND tl.timestamp >= (p_start_date::text || 'T00:00:00Z')::timestamptz
      AND tl.timestamp <= (p_end_date::text || 'T23:59:59.999Z')::timestamptz
    GROUP BY tl.agent_name, tl.agent_email, (tl.timestamp AT TIME ZONE 'America/New_York')::date
  ),
  agent_status AS (
    SELECT 
      ad.agent_tag,
      ad.email,
      ps.current_status = 'LOGGED_IN' as is_logged_in
    FROM agent_directory ad
    LEFT JOIN agent_profiles ap ON LOWER(ad.email) = LOWER(ap.email)
    LEFT JOIN profile_status ps ON ap.id = ps.profile_id
    WHERE ad.agent_tag IS NOT NULL
  ),
  gaps AS (
    SELECT 
      tgd.agent_name,
      tgd.date as log_date,
      tgd.avg_gap_seconds
    FROM ticket_gap_daily tgd
    WHERE tgd.date >= p_start_date AND tgd.date <= p_end_date
  )
  SELECT 
    tc.agent_name,
    tc.agent_email,
    tc.log_date,
    tc.email_count,
    tc.chat_count,
    tc.call_count,
    g.avg_gap_seconds,
    COALESCE(ast.is_logged_in, false) as is_logged_in
  FROM ticket_counts tc
  LEFT JOIN gaps g ON tc.agent_name = g.agent_name AND tc.log_date = g.log_date
  LEFT JOIN agent_status ast ON LOWER(tc.agent_name) = LOWER(ast.agent_tag)
  ORDER BY tc.agent_name, tc.log_date;
END;
$$;