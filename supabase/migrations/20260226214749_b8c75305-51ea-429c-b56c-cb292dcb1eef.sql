
-- Step 1: Create get_team_status_data - bulk schedule resolver for all agents
CREATE OR REPLACE FUNCTION public.get_team_status_data(p_date date)
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  "position" text[],
  break_schedule text,
  effective_schedule text,
  effective_ot_schedule text,
  is_day_off boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dow INTEGER;
  v_day_short TEXT;
  v_week_start DATE;
BEGIN
  v_dow := EXTRACT(DOW FROM p_date)::INTEGER;
  v_week_start := DATE_TRUNC('week', p_date)::DATE;

  CASE v_dow
    WHEN 1 THEN v_day_short := 'Mon';
    WHEN 2 THEN v_day_short := 'Tue';
    WHEN 3 THEN v_day_short := 'Wed';
    WHEN 4 THEN v_day_short := 'Thu';
    WHEN 5 THEN v_day_short := 'Fri';
    WHEN 6 THEN v_day_short := 'Sat';
    WHEN 0 THEN v_day_short := 'Sun';
  END CASE;

  RETURN QUERY
  WITH agents AS (
    SELECT ap.id, ap.email, ap.full_name, ap."position", ap.break_schedule,
           ap.mon_schedule, ap.tue_schedule, ap.wed_schedule, ap.thu_schedule,
           ap.fri_schedule, ap.sat_schedule, ap.sun_schedule,
           ap.mon_ot_schedule, ap.tue_ot_schedule, ap.wed_ot_schedule, ap.thu_ot_schedule,
           ap.fri_ot_schedule, ap.sat_ot_schedule, ap.sun_ot_schedule,
           ap.day_off
    FROM agent_profiles ap
    WHERE ap.employment_status IS DISTINCT FROM 'Terminated'
  ),
  -- Get the most recent schedule assignment for each agent (effective_week_start <= target week)
  latest_assignments AS (
    SELECT DISTINCT ON (asa.agent_id)
           asa.agent_id,
           asa.mon_schedule, asa.tue_schedule, asa.wed_schedule, asa.thu_schedule,
           asa.fri_schedule, asa.sat_schedule, asa.sun_schedule,
           asa.mon_ot_schedule, asa.tue_ot_schedule, asa.wed_ot_schedule, asa.thu_ot_schedule,
           asa.fri_ot_schedule, asa.sat_ot_schedule, asa.sun_ot_schedule,
           asa.day_off, asa.break_schedule
    FROM agent_schedule_assignments asa
    WHERE asa.effective_week_start <= v_week_start
    ORDER BY asa.agent_id, asa.effective_week_start DESC
  ),
  -- Get coverage overrides for the target date
  regular_overrides AS (
    SELECT co.agent_id, co.override_start, co.override_end, co.reason, co.break_schedule
    FROM coverage_overrides co
    WHERE co.date = p_date AND co.override_type = 'regular'
  ),
  ot_overrides AS (
    SELECT co.agent_id, co.override_start, co.override_end
    FROM coverage_overrides co
    WHERE co.date = p_date AND co.override_type = 'ot'
  ),
  dayoff_overrides AS (
    SELECT co.agent_id
    FROM coverage_overrides co
    WHERE co.date = p_date AND co.override_type = 'dayoff'
  ),
  legacy_overrides AS (
    SELECT co.agent_id, co.override_start, co.override_end
    FROM coverage_overrides co
    WHERE co.date = p_date AND co.override_type = 'override'
  ),
  resolved AS (
    SELECT
      a.id,
      a.email,
      a.full_name,
      a."position",
      -- Break schedule: regular override > assignment > profile
      COALESCE(ro.break_schedule, la.break_schedule, a.break_schedule) AS resolved_break,
      -- Base schedule from assignment or profile
      CASE v_dow
        WHEN 1 THEN COALESCE(la.mon_schedule, a.mon_schedule)
        WHEN 2 THEN COALESCE(la.tue_schedule, a.tue_schedule)
        WHEN 3 THEN COALESCE(la.wed_schedule, a.wed_schedule)
        WHEN 4 THEN COALESCE(la.thu_schedule, a.thu_schedule)
        WHEN 5 THEN COALESCE(la.fri_schedule, a.fri_schedule)
        WHEN 6 THEN COALESCE(la.sat_schedule, a.sat_schedule)
        WHEN 0 THEN COALESCE(la.sun_schedule, a.sun_schedule)
      END AS base_schedule,
      -- Base OT schedule from assignment or profile
      CASE v_dow
        WHEN 1 THEN COALESCE(la.mon_ot_schedule, a.mon_ot_schedule)
        WHEN 2 THEN COALESCE(la.tue_ot_schedule, a.tue_ot_schedule)
        WHEN 3 THEN COALESCE(la.wed_ot_schedule, a.wed_ot_schedule)
        WHEN 4 THEN COALESCE(la.thu_ot_schedule, a.thu_ot_schedule)
        WHEN 5 THEN COALESCE(la.fri_ot_schedule, a.fri_ot_schedule)
        WHEN 6 THEN COALESCE(la.sat_ot_schedule, a.sat_ot_schedule)
        WHEN 0 THEN COALESCE(la.sun_ot_schedule, a.sun_ot_schedule)
      END AS base_ot,
      -- Is day off from assignment or profile
      CASE
        WHEN la.agent_id IS NOT NULL THEN (la.day_off IS NOT NULL AND v_day_short = ANY(la.day_off))
        ELSE (a.day_off IS NOT NULL AND v_day_short = ANY(a.day_off))
      END AS base_is_day_off,
      -- Override data
      ro.agent_id IS NOT NULL AS has_regular_override,
      ro.override_start AS ro_start,
      ro.override_end AS ro_end,
      oo.agent_id IS NOT NULL AS has_ot_override,
      oo.override_start AS oo_start,
      oo.override_end AS oo_end,
      do2.agent_id IS NOT NULL AS has_dayoff_override,
      lo.agent_id IS NOT NULL AS has_legacy_override,
      lo.override_start AS lo_start,
      lo.override_end AS lo_end
    FROM agents a
    LEFT JOIN latest_assignments la ON a.id = la.agent_id
    LEFT JOIN regular_overrides ro ON a.id = ro.agent_id
    LEFT JOIN ot_overrides oo ON a.id = oo.agent_id
    LEFT JOIN dayoff_overrides do2 ON a.id = do2.agent_id
    LEFT JOIN legacy_overrides lo ON a.id = lo.agent_id
  )
  SELECT
    r.id,
    r.email,
    r.full_name,
    r."position",
    r.resolved_break,
    -- Effective schedule
    CASE
      -- Legacy override (only if no typed overrides)
      WHEN r.has_legacy_override AND NOT r.has_regular_override AND NOT r.has_ot_override AND NOT r.has_dayoff_override
        THEN (r.lo_start || ' - ' || r.lo_end)
      -- Regular override replaces schedule and clears day off
      WHEN r.has_regular_override THEN (r.ro_start || ' - ' || r.ro_end)
      -- Day off override
      WHEN r.has_dayoff_override THEN 'Day Off'
      -- Base day off
      WHEN r.base_is_day_off THEN 'Day Off'
      -- Base schedule
      ELSE r.base_schedule
    END AS effective_schedule,
    -- Effective OT schedule
    CASE
      WHEN r.has_legacy_override AND NOT r.has_regular_override AND NOT r.has_ot_override AND NOT r.has_dayoff_override
        THEN NULL
      WHEN r.has_ot_override THEN (r.oo_start || ' - ' || r.oo_end)
      ELSE r.base_ot
    END AS effective_ot_schedule,
    -- Is day off
    CASE
      WHEN r.has_legacy_override AND NOT r.has_regular_override AND NOT r.has_ot_override AND NOT r.has_dayoff_override
        THEN false
      WHEN r.has_regular_override THEN false
      WHEN r.has_dayoff_override THEN true
      ELSE r.base_is_day_off
    END AS is_day_off
  FROM resolved r;
END;
$$;

-- Step 2: Create get_team_outages_today - secure outage data access
CREATE OR REPLACE FUNCTION public.get_team_outages_today(p_date date)
RETURNS TABLE(
  agent_email text,
  outage_reason text,
  start_date date,
  end_date date,
  start_time text,
  end_time text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    lr.agent_email,
    lr.outage_reason,
    lr.start_date,
    lr.end_date,
    lr.start_time,
    lr.end_time,
    lr.status
  FROM public.leave_requests lr
  WHERE lr.status IN ('approved', 'pending', 'for_review')
    AND lr.start_date <= p_date
    AND lr.end_date >= p_date;
$$;

-- Step 3: Add SELECT policy on profile_status for all authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profile_status' 
    AND policyname = 'Allow authenticated users to view all statuses'
  ) THEN
    CREATE POLICY "Allow authenticated users to view all statuses"
    ON public.profile_status FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;
