CREATE OR REPLACE FUNCTION get_ticket_dashboard_data(
  p_zd_instance TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  agent_name TEXT,
  agent_email TEXT,
  log_date DATE,
  email_count BIGINT,
  chat_count BIGINT,
  call_count BIGINT,
  avg_gap_seconds INTEGER,
  is_logged_in BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH ticket_counts AS (
    SELECT 
      tl.agent_name AS tc_agent_name,
      MAX(tl.agent_email) FILTER (WHERE tl.agent_email IS NOT NULL) as tc_agent_email,
      (tl.timestamp AT TIME ZONE 'America/New_York')::date as tc_log_date,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'email') as tc_email_count,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'chat') as tc_chat_count,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'call') as tc_call_count
    FROM ticket_logs tl
    WHERE tl.zd_instance = p_zd_instance
      AND tl.timestamp >= (p_start_date::text || 'T00:00:00Z')::timestamptz
      AND tl.timestamp <= (p_end_date::text || 'T23:59:59.999Z')::timestamptz
    GROUP BY tl.agent_name, (tl.timestamp AT TIME ZONE 'America/New_York')::date
  ),
  agent_status AS (
    SELECT 
      ad.agent_tag,
      ad.email,
      ps.current_status = 'LOGGED_IN' as as_is_logged_in
    FROM agent_directory ad
    LEFT JOIN agent_profiles ap ON LOWER(ad.email) = LOWER(ap.email)
    LEFT JOIN profile_status ps ON ap.id = ps.profile_id
    WHERE ad.agent_tag IS NOT NULL
  ),
  gaps AS (
    SELECT 
      tgd.agent_name AS g_agent_name,
      tgd.date as g_log_date,
      tgd.avg_gap_seconds AS g_avg_gap_seconds
    FROM ticket_gap_daily tgd
    WHERE tgd.date >= p_start_date AND tgd.date <= p_end_date
  )
  SELECT 
    tc.tc_agent_name,
    tc.tc_agent_email,
    tc.tc_log_date,
    tc.tc_email_count,
    tc.tc_chat_count,
    tc.tc_call_count,
    g.g_avg_gap_seconds,
    COALESCE(ast.as_is_logged_in, false)
  FROM ticket_counts tc
  LEFT JOIN gaps g ON tc.tc_agent_name = g.g_agent_name AND tc.tc_log_date = g.g_log_date
  LEFT JOIN agent_status ast ON LOWER(tc.tc_agent_name) = LOWER(ast.agent_tag)
  ORDER BY tc.tc_agent_name, tc.tc_log_date;
END;
$$;