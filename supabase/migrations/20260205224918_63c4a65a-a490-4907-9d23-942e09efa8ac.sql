-- Create consolidated RPC for Team Scorecard
-- This replaces 10+ parallel queries with a single database call
CREATE OR REPLACE FUNCTION public.get_weekly_scorecard_data(
  p_week_start DATE,
  p_week_end DATE,
  p_support_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  agent_email TEXT,
  agent_name TEXT,
  agent_position TEXT,
  profile_id UUID,
  quota_email INTEGER,
  quota_chat INTEGER,
  quota_phone INTEGER,
  day_off TEXT[],
  mon_schedule TEXT,
  tue_schedule TEXT,
  wed_schedule TEXT,
  thu_schedule TEXT,
  fri_schedule TEXT,
  sat_schedule TEXT,
  sun_schedule TEXT,
  email_count BIGINT,
  chat_count BIGINT,
  call_count BIGINT,
  qa_average NUMERIC,
  revalida_score NUMERIC,
  days_with_login INTEGER,
  approved_leave_days INTEGER,
  call_aht_seconds INTEGER,
  chat_aht_seconds INTEGER,
  chat_frt_seconds INTEGER,
  is_saved BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start_str TEXT := to_char(p_week_start, 'YYYY-MM-DD');
  v_week_end_str TEXT := to_char(p_week_end, 'YYYY-MM-DD');
BEGIN
  RETURN QUERY
  WITH eligible_agents AS (
    SELECT 
      ap.id,
      ap.email,
      COALESCE(ap.agent_name, ap.full_name) as display_name,
      ap.full_name,
      ap.position,
      ap.quota_email,
      ap.quota_chat,
      ap.quota_phone,
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
      AND ap.position NOT IN ('Team Lead', 'Technical Support')
      AND (p_support_type = 'all' OR ap.position = p_support_type)
  ),
  ticket_counts AS (
    SELECT 
      LOWER(tl.agent_email) as email,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'email') as email_count,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'chat') as chat_count,
      COUNT(*) FILTER (WHERE LOWER(tl.ticket_type) = 'call') as call_count
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
    WHERE qe.audit_date >= p_week_start AND qe.audit_date <= p_week_end
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
      COUNT(DISTINCT d.dt::date) as leave_day_count
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
      zm.call_aht_seconds,
      zm.chat_aht_seconds,
      zm.chat_frt_seconds
    FROM zendesk_agent_metrics zm
    WHERE zm.week_start = v_week_start_str
      AND zm.week_end = v_week_end_str
  ),
  saved_status AS (
    SELECT DISTINCT LOWER(ss.agent_email) as email
    FROM saved_scorecards ss
    WHERE ss.week_start = v_week_start_str
      AND ss.week_end = v_week_end_str
  )
  SELECT 
    ea.email::TEXT,
    ea.display_name::TEXT,
    ea.position::TEXT,
    ea.id,
    ea.quota_email,
    ea.quota_chat,
    ea.quota_phone,
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
    qs.qa_average,
    rs.score,
    COALESCE(lc.days_with_login, 0)::INTEGER,
    COALESCE(ld.leave_day_count, 0)::INTEGER,
    zm.call_aht_seconds,
    zm.chat_aht_seconds,
    zm.chat_frt_seconds,
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
$$;