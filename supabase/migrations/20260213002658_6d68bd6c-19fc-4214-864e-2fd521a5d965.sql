
-- Drop old functions first (return type changed)
DROP FUNCTION IF EXISTS public.get_effective_schedules_for_week(uuid, date);
DROP FUNCTION IF EXISTS public.get_effective_schedule(uuid, date);

-- ============================================================
-- Recreate get_effective_schedule with new return type
-- (now includes break_schedule, quotas from assignments)
-- ============================================================
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
  v_dow INTEGER;
  v_day_name TEXT;
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

  SELECT co.override_start, co.override_end, co.reason
  INTO v_legacy
  FROM coverage_overrides co
  WHERE co.agent_id = p_agent_id AND co.date = p_target_date AND co.override_type = 'override'
  LIMIT 1;

  -- Effective-dated assignment lookup
  SELECT asa.*
  INTO v_assignment
  FROM agent_schedule_assignments asa
  WHERE asa.agent_id = p_agent_id
    AND asa.effective_week_start <= v_target_week_start
  ORDER BY asa.effective_week_start DESC
  LIMIT 1;

  -- Fallback profile
  SELECT ap.* INTO v_profile
  FROM agent_profiles ap WHERE ap.id = p_agent_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, true, false, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  v_dow := EXTRACT(DOW FROM p_target_date)::INTEGER;

  IF v_assignment IS NOT NULL THEN
    CASE v_dow
      WHEN 1 THEN v_day_name := 'Monday';    v_base_schedule := v_assignment.mon_schedule; v_base_ot := v_assignment.mon_ot_schedule;
      WHEN 2 THEN v_day_name := 'Tuesday';   v_base_schedule := v_assignment.tue_schedule; v_base_ot := v_assignment.tue_ot_schedule;
      WHEN 3 THEN v_day_name := 'Wednesday'; v_base_schedule := v_assignment.wed_schedule; v_base_ot := v_assignment.wed_ot_schedule;
      WHEN 4 THEN v_day_name := 'Thursday';  v_base_schedule := v_assignment.thu_schedule; v_base_ot := v_assignment.thu_ot_schedule;
      WHEN 5 THEN v_day_name := 'Friday';    v_base_schedule := v_assignment.fri_schedule; v_base_ot := v_assignment.fri_ot_schedule;
      WHEN 6 THEN v_day_name := 'Saturday';  v_base_schedule := v_assignment.sat_schedule; v_base_ot := v_assignment.sat_ot_schedule;
      WHEN 0 THEN v_day_name := 'Sunday';    v_base_schedule := v_assignment.sun_schedule; v_base_ot := v_assignment.sun_ot_schedule;
    END CASE;
    v_base_break := v_assignment.break_schedule;
    v_base_quota_email := v_assignment.quota_email;
    v_base_quota_chat := v_assignment.quota_chat;
    v_base_quota_phone := v_assignment.quota_phone;
    v_base_quota_ot_email := v_assignment.quota_ot_email;
    v_is_day_off := (v_assignment.day_off IS NOT NULL AND v_day_name = ANY(v_assignment.day_off));
  ELSE
    CASE v_dow
      WHEN 1 THEN v_day_name := 'Monday';    v_base_schedule := v_profile.mon_schedule; v_base_ot := v_profile.mon_ot_schedule;
      WHEN 2 THEN v_day_name := 'Tuesday';   v_base_schedule := v_profile.tue_schedule; v_base_ot := v_profile.tue_ot_schedule;
      WHEN 3 THEN v_day_name := 'Wednesday'; v_base_schedule := v_profile.wed_schedule; v_base_ot := v_profile.wed_ot_schedule;
      WHEN 4 THEN v_day_name := 'Thursday';  v_base_schedule := v_profile.thu_schedule; v_base_ot := v_profile.thu_ot_schedule;
      WHEN 5 THEN v_day_name := 'Friday';    v_base_schedule := v_profile.fri_schedule; v_base_ot := v_profile.fri_ot_schedule;
      WHEN 6 THEN v_day_name := 'Saturday';  v_base_schedule := v_profile.sat_schedule; v_base_ot := v_profile.sat_ot_schedule;
      WHEN 0 THEN v_day_name := 'Sunday';    v_base_schedule := v_profile.sun_schedule; v_base_ot := v_profile.sun_ot_schedule;
    END CASE;
    v_base_break := v_profile.break_schedule;
    v_base_quota_email := v_profile.quota_email;
    v_base_quota_chat := v_profile.quota_chat;
    v_base_quota_phone := v_profile.quota_phone;
    v_base_quota_ot_email := v_profile.quota_ot_email;
    v_is_day_off := (v_profile.day_off IS NOT NULL AND v_day_name = ANY(v_profile.day_off));
  END IF;

  -- Legacy override
  IF v_legacy IS NOT NULL AND v_regular IS NULL AND v_ot IS NULL AND v_dayoff IS NULL THEN
    RETURN QUERY SELECT
      (v_legacy.override_start || ' - ' || v_legacy.override_end)::TEXT,
      NULL::TEXT, false, true, v_legacy.reason,
      v_base_break, v_base_quota_email, v_base_quota_chat, v_base_quota_phone, v_base_quota_ot_email;
    RETURN;
  END IF;

  IF v_dayoff IS NOT NULL THEN
    v_is_day_off := true;
    v_has_override := true;
    v_reason := v_dayoff.reason;
  END IF;

  IF v_regular IS NOT NULL THEN
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

  IF v_ot IS NOT NULL THEN
    v_eff_ot := v_ot.override_start || ' - ' || v_ot.override_end;
    v_has_override := true;
    v_reason := COALESCE(v_reason, v_ot.reason);
  ELSE
    v_eff_ot := v_base_ot;
  END IF;

  RETURN QUERY SELECT
    v_eff_schedule, v_eff_ot,
    v_is_day_off AND v_regular IS NULL,
    v_has_override, v_reason, v_eff_break,
    v_base_quota_email, v_base_quota_chat, v_base_quota_phone, v_base_quota_ot_email;
  RETURN;
END;
$function$;

-- ============================================================
-- Recreate get_effective_schedules_for_week with new signature
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_effective_schedules_for_week(p_agent_id uuid, p_week_start date)
 RETURNS TABLE(day_date date, day_name text, effective_schedule text, effective_ot_schedule text, is_day_off boolean, is_override boolean, override_reason text, effective_break_schedule text, effective_quota_email integer, effective_quota_chat integer, effective_quota_phone integer, effective_quota_ot_email integer)
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
      es.override_reason,
      es.effective_break_schedule,
      es.effective_quota_email,
      es.effective_quota_chat,
      es.effective_quota_phone,
      es.effective_quota_ot_email
    FROM public.get_effective_schedule(p_agent_id, v_date) es;
  END LOOP;
  RETURN;
END;
$function$;
