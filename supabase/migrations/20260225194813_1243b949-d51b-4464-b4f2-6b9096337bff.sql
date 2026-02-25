
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
    date AS log_date,
    SUM(call_count)::bigint AS voice_count
  FROM call_count_daily
  WHERE date >= (p_start_ts AT TIME ZONE 'America/New_York')::date
    AND date <= (p_end_ts AT TIME ZONE 'America/New_York')::date
  GROUP BY date
  ORDER BY date;
$$;
