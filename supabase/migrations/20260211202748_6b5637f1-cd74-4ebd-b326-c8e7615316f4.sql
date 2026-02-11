
CREATE OR REPLACE FUNCTION public.get_effective_schedule(p_agent_id uuid, p_target_date date)
 RETURNS TABLE(effective_schedule text, effective_ot_schedule text, is_day_off boolean, is_override boolean, override_reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_regular RECORD;
  v_ot RECORD;
  v_dayoff RECORD;
  v_legacy RECORD;
  v_profile RECORD;
  v_dow INTEGER;
  v_day_name TEXT;
  v_base_schedule TEXT;
  v_base_ot TEXT;
  v_is_day_off BOOLEAN;
  v_eff_schedule TEXT;
  v_eff_ot TEXT;
  v_has_override BOOLEAN := false;
  v_reason TEXT;
BEGIN
  -- 1. Check for typed overrides (regular, ot, dayoff)
  SELECT co.override_start, co.override_end, co.reason
  INTO v_regular
  FROM coverage_overrides co
  WHERE co.agent_id = p_agent_id AND co.date = p_target_date AND co.override_type = 'regular'
  LIMIT 1;

  SELECT co.override_start, co.override_end, co.reason
  INTO v_ot
  FROM coverage_overrides co
  WHERE co.agent_id = p_agent_id AND co.date = p_target_date AND co.override_type = 'ot'
  LIMIT 1;

  SELECT co.override_start, co.override_end, co.reason
  INTO v_dayoff
  FROM coverage_overrides co
  WHERE co.agent_id = p_agent_id AND co.date = p_target_date AND co.override_type = 'dayoff'
  LIMIT 1;

  -- 2. Check for legacy 'override' type (backward compat)
  SELECT co.override_start, co.override_end, co.reason
  INTO v_legacy
  FROM coverage_overrides co
  WHERE co.agent_id = p_agent_id AND co.date = p_target_date AND co.override_type = 'override'
  LIMIT 1;

  -- 3. Get base profile
  SELECT ap.* INTO v_profile
  FROM agent_profiles ap WHERE ap.id = p_agent_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, true, false, NULL::TEXT;
    RETURN;
  END IF;

  v_dow := EXTRACT(DOW FROM p_target_date)::INTEGER;

  CASE v_dow
    WHEN 1 THEN v_day_name := 'Monday';    v_base_schedule := v_profile.mon_schedule; v_base_ot := v_profile.mon_ot_schedule;
    WHEN 2 THEN v_day_name := 'Tuesday';   v_base_schedule := v_profile.tue_schedule; v_base_ot := v_profile.tue_ot_schedule;
    WHEN 3 THEN v_day_name := 'Wednesday'; v_base_schedule := v_profile.wed_schedule; v_base_ot := v_profile.wed_ot_schedule;
    WHEN 4 THEN v_day_name := 'Thursday';  v_base_schedule := v_profile.thu_schedule; v_base_ot := v_profile.thu_ot_schedule;
    WHEN 5 THEN v_day_name := 'Friday';    v_base_schedule := v_profile.fri_schedule; v_base_ot := v_profile.fri_ot_schedule;
    WHEN 6 THEN v_day_name := 'Saturday';  v_base_schedule := v_profile.sat_schedule; v_base_ot := v_profile.sat_ot_schedule;
    WHEN 0 THEN v_day_name := 'Sunday';    v_base_schedule := v_profile.sun_schedule; v_base_ot := v_profile.sun_ot_schedule;
  END CASE;

  v_is_day_off := (v_profile.day_off IS NOT NULL AND v_day_name = ANY(v_profile.day_off));

  -- 4. Apply overrides with precedence

  -- If legacy override exists and no typed overrides, use legacy behavior
  IF v_legacy IS NOT NULL AND v_regular IS NULL AND v_ot IS NULL AND v_dayoff IS NULL THEN
    RETURN QUERY SELECT
      (v_legacy.override_start || ' - ' || v_legacy.override_end)::TEXT,
      NULL::TEXT,
      false,
      true,
      v_legacy.reason;
    RETURN;
  END IF;

  -- Day off override
  IF v_dayoff IS NOT NULL THEN
    v_is_day_off := true;
    v_has_override := true;
    v_reason := v_dayoff.reason;
  END IF;

  -- Regular schedule override
  IF v_regular IS NOT NULL THEN
    v_eff_schedule := v_regular.override_start || ' - ' || v_regular.override_end;
    v_has_override := true;
    v_is_day_off := false;
    v_reason := COALESCE(v_reason, v_regular.reason);
  ELSE
    IF v_is_day_off THEN
      v_eff_schedule := 'Day Off';
    ELSE
      v_eff_schedule := v_base_schedule;
    END IF;
  END IF;

  -- OT schedule override
  IF v_ot IS NOT NULL THEN
    v_eff_ot := v_ot.override_start || ' - ' || v_ot.override_end;
    v_has_override := true;
    v_reason := COALESCE(v_reason, v_ot.reason);
  ELSE
    v_eff_ot := v_base_ot;
  END IF;

  RETURN QUERY SELECT
    v_eff_schedule,
    v_eff_ot,
    v_is_day_off AND v_regular IS NULL,
    v_has_override,
    v_reason;
  RETURN;
END;
$function$;
