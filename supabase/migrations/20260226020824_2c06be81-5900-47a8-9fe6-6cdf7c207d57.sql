
CREATE OR REPLACE FUNCTION public.get_weekly_scorecard_data(p_week_start date, p_week_end date, p_support_type text DEFAULT 'all'::text)
 RETURNS TABLE(agent_email text, agent_name text, agent_position text, profile_id uuid, quota_email integer, quota_chat integer, quota_phone integer, quota_ot_email integer, day_off text[], mon_schedule text, tue_schedule text, wed_schedule text, thu_schedule text, fri_schedule text, sat_schedule text, sun_schedule text, email_count bigint, chat_count bigint, call_count bigint, ot_email_count bigint, qa_average numeric, revalida_score numeric, days_with_login integer, approved_leave_days integer, planned_leave_days integer, unplanned_outage_days integer, call_aht_seconds integer, chat_aht_seconds integer, chat_frt_seconds integer, order_escalation numeric, is_saved boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH eligible_agents AS (
    SELECT 
      ap.id,
      ap.email,
      COALESCE(ap.agent_name, ap.full_name) as display_name,
      ap.full_name,
      ap.position,
      CASE
        WHEN ap.position @> ARRAY['Email','Chat','Phone'] THEN 'Hybrid'
        WHEN ap.position @> ARRAY['Email','Phone'] THEN 'Hybrid'
        WHEN 'Phone' = ANY(ap.position) THEN 'Hybrid'
        WHEN 'Logistics' = ANY(ap.position) THEN 'Logistics'
        ELSE 'Chat'
      END as resolved_position,
      ap.quota_email,
      ap.quota_chat,
      ap.quota_phone,
      ap.quota_ot_email,
      ap.day_off,
      ap.mon_schedule,
      ap.tue_schedule,
      ap.wed_schedule,
      ap.thu_schedule,
      ap.fri_schedule,
      ap.sat_schedule,
      ap.sun_schedule
    FROM agent_profiles ap
    WHERE ap.employment_status != 'Terminated'
      AND NOT (ap.position && ARRAY['Team Lead','Technical'])
      AND (p_support_type = 'all' OR
           CASE
             WHEN ap.position @> ARRAY['Email','Chat','Phone'] THEN 'Hybrid'
             WHEN ap.position @> ARRAY['Email','Phone'] THEN 'Hybrid'
             WHEN 'Phone' = ANY(ap.position) THEN 'Hybrid'
             WHEN 'Logistics' = ANY(ap.position) THEN 'Logistics'
             ELSE 'Chat'
           END = p_support_type)
  ),
  ticket_counts AS (
    SELECT 
      LOWER(tl.agent_email) as email,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'email' AND COALESCE(tl.is_ot, false) = false) as email_count,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'chat') as chat_count,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'call') as call_count,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'email' AND tl.is_ot = true) as ot_email_count
    FROM ticket_logs tl
    WHERE tl.timestamp >= p_week_start::timestamptz
      AND tl.timestamp < (p_week_end + 1)::timestamptz
    GROUP BY LOWER(tl.agent_email)
  ),
  qa_scores AS (
    SELECT 
      LOWER(qe.agent_email) as email,
      AVG(qe.percentage) as qa_average
    FROM qa_evaluations qe
    WHERE qe.work_week_start >= p_week_start AND qe.work_week_start <= p_week_end
    GROUP BY LOWER(qe.agent_email)
  ),
  revalida_scores AS (
    SELECT DISTINCT ON (LOWER(ra.agent_email))
      LOWER(ra.agent_email) as email,
      ra.final_percent as score
    FROM revalida_attempts ra
    JOIN revalida_batches rb ON ra.batch_id = rb.id
    WHERE rb.start_at >= p_week_start::timestamptz
      AND rb.start_at < (p_week_end + 1)::timestamptz
      AND ra.status = 'graded'
    ORDER BY LOWER(ra.agent_email), ra.submitted_at DESC
  ),
  login_counts AS (
    SELECT 
      pe.profile_id,
      COUNT(DISTINCT DATE(pe.created_at AT TIME ZONE 'America/New_York')) as days_with_login
    FROM profile_events pe
    WHERE pe.event_type = 'LOGIN'
      AND pe.created_at >= p_week_start::timestamptz
      AND pe.created_at < (p_week_end + 1)::timestamptz
    GROUP BY pe.profile_id
  ),
  leave_days AS (
    SELECT 
      LOWER(lr.agent_email) as email,
      COUNT(DISTINCT d.dt::date) as total_leave_days,
      COUNT(DISTINCT d.dt::date) FILTER (
        WHERE lr.outage_reason = 'Planned Leave'
      ) as planned_leave_days,
      COUNT(DISTINCT d.dt::date) FILTER (
        WHERE lr.outage_reason IS DISTINCT FROM 'Planned Leave'
      ) as unplanned_outage_days
    FROM leave_requests lr
    CROSS JOIN LATERAL generate_series(
      GREATEST(lr.start_date, p_week_start),
      LEAST(lr.end_date, p_week_end),
      '1 day'::interval
    ) as d(dt)
    WHERE lr.status = 'approved'
      AND lr.start_date <= p_week_end
      AND lr.end_date >= p_week_start
    GROUP BY LOWER(lr.agent_email)
  ),
  zendesk_metrics AS (
    SELECT 
      LOWER(zm.agent_email) as email,
      zm.call_aht_seconds::integer as call_aht_seconds,
      zm.chat_aht_seconds::integer as chat_aht_seconds,
      zm.chat_frt_seconds::integer as chat_frt_seconds,
      zm.order_escalation
    FROM zendesk_agent_metrics zm
    WHERE zm.week_start = p_week_start
      AND zm.week_end = p_week_end
  ),
  saved_status AS (
    SELECT DISTINCT LOWER(ss.agent_email) as email
    FROM saved_scorecards ss
    WHERE ss.week_start = p_week_start
      AND ss.week_end = p_week_end
  )
  SELECT 
    ea.email::TEXT,
    ea.display_name::TEXT,
    ea.resolved_position::TEXT,
    ea.id,
    ea.quota_email,
    ea.quota_chat,
    ea.quota_phone,
    ea.quota_ot_email,
    ea.day_off,
    ea.mon_schedule,
    ea.tue_schedule,
    ea.wed_schedule,
    ea.thu_schedule,
    ea.fri_schedule,
    ea.sat_schedule,
    ea.sun_schedule,
    COALESCE(tc.email_count, 0),
    COALESCE(tc.chat_count, 0),
    COALESCE(tc.call_count, 0),
    COALESCE(tc.ot_email_count, 0),
    qs.qa_average,
    rs.score,
    COALESCE(lc.days_with_login, 0)::INTEGER,
    COALESCE(ld.total_leave_days, 0)::INTEGER,
    COALESCE(ld.planned_leave_days, 0)::INTEGER,
    COALESCE(ld.unplanned_outage_days, 0)::INTEGER,
    zm.call_aht_seconds,
    zm.chat_aht_seconds,
    zm.chat_frt_seconds,
    zm.order_escalation,
    (ss.email IS NOT NULL)
  FROM eligible_agents ea
  LEFT JOIN ticket_counts tc ON LOWER(ea.email) = tc.email
  LEFT JOIN qa_scores qs ON LOWER(ea.email) = qs.email
  LEFT JOIN revalida_scores rs ON LOWER(ea.email) = rs.email
  LEFT JOIN login_counts lc ON ea.id = lc.profile_id
  LEFT JOIN leave_days ld ON LOWER(ea.email) = ld.email
  LEFT JOIN zendesk_metrics zm ON LOWER(ea.email) = zm.email
  LEFT JOIN saved_status ss ON LOWER(ea.email) = ss.email
  ORDER BY ea.full_name;
END;
$function$;
