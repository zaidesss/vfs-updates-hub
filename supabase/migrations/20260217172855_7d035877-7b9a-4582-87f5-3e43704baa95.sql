
CREATE OR REPLACE FUNCTION public.get_ticket_dashboard_data(p_zd_instance text, p_start_date date, p_end_date date)
 RETURNS TABLE(agent_name text, agent_email text, log_date date, email_count bigint, chat_count bigint, call_count bigint, avg_gap_seconds integer, is_logged_in boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND (tl.timestamp AT TIME ZONE 'America/New_York')::date >= p_start_date
      AND (tl.timestamp AT TIME ZONE 'America/New_York')::date <= p_end_date
    GROUP BY tl.agent_name, (tl.timestamp AT TIME ZONE 'America/New_York')::date
  ),
  -- Call counts from Talk API (only for ZD1 / customerserviceadvocates)
  talk_calls AS (
    SELECT
      ccd.agent_name AS talk_agent_name,
      ccd.agent_email AS talk_agent_email,
      ccd.date AS talk_date,
      ccd.call_count AS talk_call_count
    FROM call_count_daily ccd
    WHERE ccd.date >= p_start_date AND ccd.date <= p_end_date
  ),
  -- Merge: for ZD1, include agents that only have call data (no email/chat tickets)
  all_agents AS (
    SELECT tc_agent_name AS a_name, tc_agent_email AS a_email, tc_log_date AS a_date,
           tc_email_count, tc_chat_count, tc_call_count
    FROM ticket_counts
    UNION ALL
    -- Add talk-only agents (have calls but no ticket_logs entries) for ZD1
    SELECT tc2.talk_agent_name, tc2.talk_agent_email, tc2.talk_date,
           0::bigint, 0::bigint, 0::bigint
    FROM talk_calls tc2
    WHERE p_zd_instance = 'customerserviceadvocates'
      AND NOT EXISTS (
        SELECT 1 FROM ticket_counts ex
        WHERE ex.tc_agent_name = tc2.talk_agent_name AND ex.tc_log_date = tc2.talk_date
      )
  ),
  merged AS (
    SELECT
      aa.a_name,
      aa.a_email,
      aa.a_date,
      SUM(aa.tc_email_count)::bigint AS m_email_count,
      SUM(aa.tc_chat_count)::bigint AS m_chat_count,
      -- For ZD1: use call_count_daily; for others: use ticket_logs call count
      CASE
        WHEN p_zd_instance = 'customerserviceadvocates' THEN
          COALESCE((SELECT tc3.talk_call_count FROM talk_calls tc3
                    WHERE tc3.talk_agent_name = aa.a_name AND tc3.talk_date = aa.a_date
                    LIMIT 1), 0)::bigint
        ELSE SUM(aa.tc_call_count)::bigint
      END AS m_call_count
    FROM all_agents aa
    GROUP BY aa.a_name, aa.a_email, aa.a_date
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
    m.a_name,
    m.a_email,
    m.a_date,
    m.m_email_count,
    m.m_chat_count,
    m.m_call_count,
    g.g_avg_gap_seconds,
    COALESCE(ast.as_is_logged_in, false)
  FROM merged m
  LEFT JOIN gaps g ON m.a_name = g.g_agent_name AND m.a_date = g.g_log_date
  LEFT JOIN agent_status ast ON LOWER(m.a_name) = LOWER(ast.agent_tag)
  ORDER BY m.a_name, m.a_date;
END;
$function$;
