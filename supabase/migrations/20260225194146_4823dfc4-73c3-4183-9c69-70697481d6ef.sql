
CREATE OR REPLACE FUNCTION public.get_brain_voice_counts(
  p_start_ts timestamptz,
  p_end_ts timestamptz
)
RETURNS TABLE (log_date date, voice_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (timestamp AT TIME ZONE 'America/New_York')::date AS log_date,
    COUNT(*) AS voice_count
  FROM ticket_logs
  WHERE LOWER(ticket_type) = 'call'
    AND zd_instance = 'customerserviceadvocates'
    AND timestamp >= p_start_ts
    AND timestamp <= p_end_ts
  GROUP BY (timestamp AT TIME ZONE 'America/New_York')::date
  ORDER BY log_date;
$$;
