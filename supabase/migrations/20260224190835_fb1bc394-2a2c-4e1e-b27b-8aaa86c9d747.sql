
-- Drop the dependent view first
DROP VIEW IF EXISTS public.agent_profiles_team_status;

-- Convert position from text to text[] in agent_profiles
ALTER TABLE public.agent_profiles 
  ALTER COLUMN position TYPE text[] 
  USING CASE WHEN position IS NOT NULL THEN ARRAY[position] ELSE NULL END;

-- Convert upwork_contract_type from text to text[] in agent_profiles
ALTER TABLE public.agent_profiles 
  ALTER COLUMN upwork_contract_type TYPE text[] 
  USING CASE WHEN upwork_contract_type IS NOT NULL THEN ARRAY[upwork_contract_type] ELSE NULL END;

-- Convert upwork_contract_type from text to text[] in agent_directory
ALTER TABLE public.agent_directory 
  ALTER COLUMN upwork_contract_type TYPE text[] 
  USING CASE WHEN upwork_contract_type IS NOT NULL THEN ARRAY[upwork_contract_type] ELSE NULL END;

-- Recreate the view with position as text[] (same columns)
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
