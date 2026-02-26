DROP VIEW IF EXISTS public.agent_profiles_team_status;

CREATE VIEW public.agent_profiles_team_status WITH (security_invoker = false) AS
SELECT id,
    email,
    agent_name,
    full_name,
    "position",
    zendesk_instance,
    support_type,
    employment_status,
    day_off,
    break_schedule,
    ot_enabled,
    mon_schedule,
    tue_schedule,
    wed_schedule,
    thu_schedule,
    fri_schedule,
    sat_schedule,
    sun_schedule,
    mon_ot_schedule,
    tue_ot_schedule,
    wed_ot_schedule,
    thu_ot_schedule,
    fri_ot_schedule,
    sat_ot_schedule,
    sun_ot_schedule
FROM agent_profiles;

GRANT SELECT ON public.agent_profiles_team_status TO authenticated;