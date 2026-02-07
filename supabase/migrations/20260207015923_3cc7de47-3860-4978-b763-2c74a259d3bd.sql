-- Step 1: Update existing reliability config for Logistics
UPDATE scorecard_config 
SET weight = 30, goal = 98, display_order = 4 
WHERE support_type = 'Logistics' AND metric_key = 'reliability';

-- Step 2: Add new scorecard_config entries for Logistics
INSERT INTO scorecard_config (support_type, metric_key, weight, goal, is_enabled, display_order)
VALUES 
  ('Logistics', 'order_escalation', 35, 95, true, 1),
  ('Logistics', 'qa', 30, 95, true, 2),
  ('Logistics', 'revalida', 5, 95, true, 3)
ON CONFLICT (support_type, metric_key) DO UPDATE SET
  weight = EXCLUDED.weight,
  goal = EXCLUDED.goal,
  is_enabled = EXCLUDED.is_enabled,
  display_order = EXCLUDED.display_order;

-- Step 3: Add order_escalation column to zendesk_agent_metrics
ALTER TABLE zendesk_agent_metrics 
ADD COLUMN IF NOT EXISTS order_escalation NUMERIC;

-- Step 4: Add order_escalation column to saved_scorecards
ALTER TABLE saved_scorecards 
ADD COLUMN IF NOT EXISTS order_escalation NUMERIC;

-- Step 5: Update the RPC function to return order_escalation
CREATE OR REPLACE FUNCTION get_weekly_scorecard_data(
  p_week_start TEXT,
  p_week_end TEXT,
  p_support_type TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if user has admin/HR role
  IF NOT EXISTS (
    SELECT 1 FROM agent_profiles 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'HR', 'Super Admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or HR role required';
  END IF;

  SELECT json_build_object(
    'agents', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', ap.id,
          'email', ap.email,
          'full_name', ap.full_name,
          'position', ap.position,
          'team_lead', ap.team_lead,
          'employment_status', ap.employment_status
        )
      ), '[]'::json)
      FROM agent_profiles ap
      WHERE ap.employment_status != 'Terminated'
      AND (p_support_type IS NULL OR ap.position ILIKE '%' || p_support_type || '%')
    ),
    'tickets', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'agent_email', tl.agent_email,
          'ticket_type', tl.ticket_type,
          'count', tl.count,
          'is_ot', tl.is_ot
        )
      ), '[]'::json)
      FROM (
        SELECT 
          agent_email,
          ticket_type,
          is_ot,
          COUNT(*)::int as count
        FROM ticket_logs
        WHERE timestamp >= (p_week_start || ' 00:00:00')::timestamptz
        AND timestamp < (p_week_end || ' 23:59:59')::timestamptz
        AND agent_email IS NOT NULL
        GROUP BY agent_email, ticket_type, is_ot
      ) tl
    ),
    'qa_scores', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'agent_email', qe.agent_email,
          'total_score', qe.total_score,
          'max_score', qe.max_score
        )
      ), '[]'::json)
      FROM qa_evaluations qe
      WHERE qe.evaluation_date >= p_week_start::date
      AND qe.evaluation_date <= p_week_end::date
      AND qe.status = 'sent'
    ),
    'revalida_scores', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'agent_email', ra.agent_email,
          'final_percent', ra.final_percent
        )
      ), '[]'::json)
      FROM revalida_attempts ra
      JOIN revalida_batches rb ON ra.batch_id = rb.id
      WHERE rb.start_at >= (p_week_start || ' 00:00:00')::timestamptz
      AND rb.start_at <= (p_week_end || ' 23:59:59')::timestamptz
      AND ra.status = 'graded'
    ),
    'attendance', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'profile_id', pe.profile_id,
          'event_type', pe.event_type,
          'created_at', pe.created_at
        )
      ), '[]'::json)
      FROM profile_events pe
      WHERE pe.created_at >= (p_week_start || ' 00:00:00')::timestamptz
      AND pe.created_at < (p_week_end || ' 23:59:59')::timestamptz
      AND pe.event_type IN ('LOGIN', 'LOGOUT')
    ),
    'leave_requests', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'agent_email', lr.agent_email,
          'leave_type', lr.leave_type,
          'start_date', lr.start_date,
          'end_date', lr.end_date,
          'status', lr.status
        )
      ), '[]'::json)
      FROM leave_requests lr
      WHERE lr.status = 'approved'
      AND lr.start_date <= p_week_end::date
      AND lr.end_date >= p_week_start::date
    ),
    'zendesk_metrics', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'agent_email', zm.agent_email,
          'week_start', zm.week_start,
          'call_aht', zm.call_aht,
          'chat_aht', zm.chat_aht,
          'chat_frt', zm.chat_frt,
          'order_escalation', zm.order_escalation
        )
      ), '[]'::json)
      FROM zendesk_agent_metrics zm
      WHERE zm.week_start = p_week_start
    ),
    'saved_scorecards', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'agent_email', ss.agent_email,
          'week_start', ss.week_start,
          'final_score', ss.final_score,
          'productivity_score', ss.productivity_score,
          'qa_score', ss.qa_score,
          'revalida_score', ss.revalida_score,
          'reliability_score', ss.reliability_score,
          'call_aht', ss.call_aht,
          'chat_aht', ss.chat_aht,
          'chat_frt', ss.chat_frt,
          'order_escalation', ss.order_escalation
        )
      ), '[]'::json)
      FROM saved_scorecards ss
      WHERE ss.week_start = p_week_start
    ),
    'scorecard_config', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'support_type', sc.support_type,
          'metric_key', sc.metric_key,
          'weight', sc.weight,
          'goal', sc.goal,
          'is_enabled', sc.is_enabled,
          'display_order', sc.display_order
        )
      ), '[]'::json)
      FROM scorecard_config sc
      WHERE sc.is_enabled = true
    )
  ) INTO result;

  RETURN result;
END;
$$;