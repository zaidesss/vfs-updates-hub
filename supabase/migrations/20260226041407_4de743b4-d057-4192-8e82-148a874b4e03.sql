
CREATE OR REPLACE FUNCTION public.get_effective_schedule(p_agent_id uuid, p_target_date date)
 RETURNS TABLE(effective_schedule text, effective_ot_schedule text, is_day_off boolean, is_override boolean, override_reason text, effective_break_schedule text, effective_quota_email integer, effective_quota_chat integer, effective_quota_phone integer, effective_quota_ot_email integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_regular RECORD;
  v_ot RECORD;
  v_dayoff RECORD;
  v_legacy RECORD;
  v_assignment RECORD;
  v_profile RECORD;
  v_found_regular BOOLEAN := false;
  v_found_ot BOOLEAN := false;
  v_found_dayoff BOOLEAN := false;
  v_found_legacy BOOLEAN := false;
  v_dow INTEGER;
  v_day_name TEXT;
  v_day_short TEXT;
  v_base_schedule TEXT;
  v_base_ot TEXT;
  v_base_break TEXT;
  v_base_quota_email INTEGER;
  v_base_quota_chat INTEGER;
  v_base_quota_phone INTEGER;
  v_base_quota_ot_email INTEGER;
  v_is_day_off BOOLEAN;
  v_eff_schedule TEXT;
  v_eff_ot TEXT;
  v_eff_break TEXT;
  v_has_override BOOLEAN := false;
  v_reason TEXT;
  v_target_week_start DATE;
BEGIN
  v_target_week_start := DATE_TRUNC('week', p_target_date)::DATE;

  SELECT co.override_start, co.override_end, co.reason, co.break_schedule
  INTO v_regular
  FROM coverage_overrides co
  WHERE co.agent_id = p_agent_id AND co.date = p_target_date AND co.override_type = 'regular'
  LIMIT 1;
  v_found_regular := FOUND;

  SELECT co.override_start, co.override_end, co.reason
  INTO v_ot
  FROM coverage_overrides co
  WHERE co.agent_id = p_agent_id AND co.date = p_target_date AND co.override_type = 'ot'
  LIMIT 1;
  v_found_ot := FOUND;

  SELECT co.override_start, co.override_end, co.reason
  INTO v_dayoff
  FROM coverage_overrides co
  WHERE co.agent_id = p_agent_id AND co.date = p_target_date AND co.override_type = 'dayoff'
  LIMIT 1;
  v_found_dayoff := FOUND;

  SELECT co.override_start, co.override_end, co.reason
  INTO v_legacy
  FROM coverage_overrides co
  WHERE co.agent_id = p_agent_id AND co.date = p_target_date AND co.override_type = 'override'
  LIMIT 1;
  v_found_legacy := FOUND;

  SELECT asa.*
  INTO v_assignment
  FROM agent_schedule_assignments asa
  WHERE asa.agent_id = p_agent_id
    AND asa.effective_week_start <= v_target_week_start
  ORDER BY asa.effective_week_start DESC
  LIMIT 1;

  SELECT ap.* INTO v_profile
  FROM agent_profiles ap WHERE ap.id = p_agent_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, true, false, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  v_dow := EXTRACT(DOW FROM p_target_date)::INTEGER;

  IF v_assignment IS NOT NULL THEN
    CASE v_dow
      WHEN 1 THEN v_day_name := 'Monday';    v_day_short := 'Mon'; v_base_schedule := v_assignment.mon_schedule; v_base_ot := v_assignment.mon_ot_schedule;
      WHEN 2 THEN v_day_name := 'Tuesday';   v_day_short := 'Tue'; v_base_schedule := v_assignment.tue_schedule; v_base_ot := v_assignment.tue_ot_schedule;
      WHEN 3 THEN v_day_name := 'Wednesday'; v_day_short := 'Wed'; v_base_schedule := v_assignment.wed_schedule; v_base_ot := v_assignment.wed_ot_schedule;
      WHEN 4 THEN v_day_name := 'Thursday';  v_day_short := 'Thu'; v_base_schedule := v_assignment.thu_schedule; v_base_ot := v_assignment.thu_ot_schedule;
      WHEN 5 THEN v_day_name := 'Friday';    v_day_short := 'Fri'; v_base_schedule := v_assignment.fri_schedule; v_base_ot := v_assignment.fri_ot_schedule;
      WHEN 6 THEN v_day_name := 'Saturday';  v_day_short := 'Sat'; v_base_schedule := v_assignment.sat_schedule; v_base_ot := v_assignment.sat_ot_schedule;
      WHEN 0 THEN v_day_name := 'Sunday';    v_day_short := 'Sun'; v_base_schedule := v_assignment.sun_schedule; v_base_ot := v_assignment.sun_ot_schedule;
    END CASE;
    v_base_break := v_assignment.break_schedule;
    v_base_quota_email := v_assignment.quota_email;
    v_base_quota_chat := v_assignment.quota_chat;
    v_base_quota_phone := v_assignment.quota_phone;
    v_base_quota_ot_email := v_assignment.quota_ot_email;
    v_is_day_off := (v_assignment.day_off IS NOT NULL AND v_day_short = ANY(v_assignment.day_off));
  ELSE
    CASE v_dow
      WHEN 1 THEN v_day_name := 'Monday';    v_day_short := 'Mon'; v_base_schedule := v_profile.mon_schedule; v_base_ot := v_profile.mon_ot_schedule;
      WHEN 2 THEN v_day_name := 'Tuesday';   v_day_short := 'Tue'; v_base_schedule := v_profile.tue_schedule; v_base_ot := v_profile.tue_ot_schedule;
      WHEN 3 THEN v_day_name := 'Wednesday'; v_day_short := 'Wed'; v_base_schedule := v_profile.wed_schedule; v_base_ot := v_profile.wed_ot_schedule;
      WHEN 4 THEN v_day_name := 'Thursday';  v_day_short := 'Thu'; v_base_schedule := v_profile.thu_schedule; v_base_ot := v_profile.thu_ot_schedule;
      WHEN 5 THEN v_day_name := 'Friday';    v_day_short := 'Fri'; v_base_schedule := v_profile.fri_schedule; v_base_ot := v_profile.fri_ot_schedule;
      WHEN 6 THEN v_day_name := 'Saturday';  v_day_short := 'Sat'; v_base_schedule := v_profile.sat_schedule; v_base_ot := v_profile.sat_ot_schedule;
      WHEN 0 THEN v_day_name := 'Sunday';    v_day_short := 'Sun'; v_base_schedule := v_profile.sun_schedule; v_base_ot := v_profile.sun_ot_schedule;
    END CASE;
    v_base_break := v_profile.break_schedule;
    v_base_quota_email := v_profile.quota_email;
    v_base_quota_chat := v_profile.quota_chat;
    v_base_quota_phone := v_profile.quota_phone;
    v_base_quota_ot_email := v_profile.quota_ot_email;
    v_is_day_off := (v_profile.day_off IS NOT NULL AND v_day_short = ANY(v_profile.day_off));
  END IF;

  -- Legacy override (only if no typed overrides exist)
  IF v_found_legacy AND NOT v_found_regular AND NOT v_found_ot AND NOT v_found_dayoff THEN
    RETURN QUERY SELECT
      (v_legacy.override_start || ' - ' || v_legacy.override_end)::TEXT,
      NULL::TEXT, false, true, v_legacy.reason,
      v_base_break, v_base_quota_email, v_base_quota_chat, v_base_quota_phone, v_base_quota_ot_email;
    RETURN;
  END IF;

  IF v_found_dayoff THEN
    v_is_day_off := true;
    v_has_override := true;
    v_reason := v_dayoff.reason;
  END IF;

  IF v_found_regular THEN
    v_eff_schedule := v_regular.override_start || ' - ' || v_regular.override_end;
    v_has_override := true;
    v_is_day_off := false;
    v_reason := COALESCE(v_reason, v_regular.reason);
    v_eff_break := COALESCE(v_regular.break_schedule, v_base_break);
  ELSE
    IF v_is_day_off THEN
      v_eff_schedule := 'Day Off';
    ELSE
      v_eff_schedule := v_base_schedule;
    END IF;
    v_eff_break := v_base_break;
  END IF;

  IF v_found_ot THEN
    v_eff_ot := v_ot.override_start || ' - ' || v_ot.override_end;
    v_has_override := true;
    v_reason := COALESCE(v_reason, v_ot.reason);
  ELSE
    v_eff_ot := v_base_ot;
  END IF;

  RETURN QUERY SELECT
    v_eff_schedule, v_eff_ot,
    v_is_day_off AND NOT v_found_regular,
    v_has_override, v_reason, v_eff_break,
    v_base_quota_email, v_base_quota_chat, v_base_quota_phone, v_base_quota_ot_email;
  RETURN;
END;
$function$;
