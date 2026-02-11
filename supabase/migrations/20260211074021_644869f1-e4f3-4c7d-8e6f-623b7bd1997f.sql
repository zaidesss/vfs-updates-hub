
-- Single-date effective schedule lookup
CREATE OR REPLACE FUNCTION public.get_effective_schedule(
  p_agent_id UUID,
  p_target_date DATE
)
RETURNS TABLE(
  effective_schedule TEXT,
  effective_ot_schedule TEXT,
  is_day_off BOOLEAN,
  is_override BOOLEAN,
  override_reason TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_override RECORD;
  v_profile RECORD;
  v_dow INTEGER; -- 0=Sun, 1=Mon, ..., 6=Sat
  v_day_name TEXT;
  v_base_schedule TEXT;
  v_base_ot TEXT;
  v_is_day_off BOOLEAN;
BEGIN
  -- 1. Check for coverage override on this date
  SELECT co.override_start, co.override_end, co.reason
  INTO v_override
  FROM coverage_overrides co
  WHERE co.agent_id = p_agent_id
    AND co.date = p_target_date
  LIMIT 1;

  IF FOUND THEN
    -- Override exists — return it as effective schedule
    RETURN QUERY SELECT
      (v_override.override_start || ' - ' || v_override.override_end)::TEXT,
      NULL::TEXT,
      false,
      true,
      v_override.reason;
    RETURN;
  END IF;

  -- 2. Fall back to agent_profiles base schedule
  SELECT ap.* INTO v_profile
  FROM agent_profiles ap
  WHERE ap.id = p_agent_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, true, false, NULL::TEXT;
    RETURN;
  END IF;

  v_dow := EXTRACT(DOW FROM p_target_date)::INTEGER; -- 0=Sun

  -- Map DOW to day name and schedule columns
  CASE v_dow
    WHEN 1 THEN v_day_name := 'Monday';    v_base_schedule := v_profile.mon_schedule; v_base_ot := v_profile.mon_ot_schedule;
    WHEN 2 THEN v_day_name := 'Tuesday';   v_base_schedule := v_profile.tue_schedule; v_base_ot := v_profile.tue_ot_schedule;
    WHEN 3 THEN v_day_name := 'Wednesday'; v_base_schedule := v_profile.wed_schedule; v_base_ot := v_profile.wed_ot_schedule;
    WHEN 4 THEN v_day_name := 'Thursday';  v_base_schedule := v_profile.thu_schedule; v_base_ot := v_profile.thu_ot_schedule;
    WHEN 5 THEN v_day_name := 'Friday';    v_base_schedule := v_profile.fri_schedule; v_base_ot := v_profile.fri_ot_schedule;
    WHEN 6 THEN v_day_name := 'Saturday';  v_base_schedule := v_profile.sat_schedule; v_base_ot := v_profile.sat_ot_schedule;
    WHEN 0 THEN v_day_name := 'Sunday';    v_base_schedule := v_profile.sun_schedule; v_base_ot := v_profile.sun_ot_schedule;
  END CASE;

  -- Check if this day is in the day_off array
  v_is_day_off := (v_profile.day_off IS NOT NULL AND v_day_name = ANY(v_profile.day_off));

  IF v_is_day_off THEN
    RETURN QUERY SELECT 'Day Off'::TEXT, NULL::TEXT, true, false, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT
      COALESCE(v_base_schedule, NULL)::TEXT,
      COALESCE(v_base_ot, NULL)::TEXT,
      false,
      false,
      NULL::TEXT;
  END IF;

  RETURN;
END;
$function$;

-- Batch variant: returns 7 rows (Mon-Sun) for a full week
CREATE OR REPLACE FUNCTION public.get_effective_schedules_for_week(
  p_agent_id UUID,
  p_week_start DATE  -- should be a Monday
)
RETURNS TABLE(
  day_date DATE,
  day_name TEXT,
  effective_schedule TEXT,
  effective_ot_schedule TEXT,
  is_day_off BOOLEAN,
  is_override BOOLEAN,
  override_reason TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_date DATE;
  v_day_names TEXT[] := ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
BEGIN
  FOR i IN 0..6 LOOP
    v_date := p_week_start + i;
    RETURN QUERY
    SELECT
      v_date,
      v_day_names[i+1],
      es.effective_schedule,
      es.effective_ot_schedule,
      es.is_day_off,
      es.is_override,
      es.override_reason
    FROM public.get_effective_schedule(p_agent_id, v_date) es;
  END LOOP;
  RETURN;
END;
$function$;
