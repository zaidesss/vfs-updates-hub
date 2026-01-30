-- Add new work configuration columns to agent_profiles
ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS agent_name text,
ADD COLUMN IF NOT EXISTS agent_tag text,
ADD COLUMN IF NOT EXISTS zendesk_instance text,
ADD COLUMN IF NOT EXISTS support_account text,
ADD COLUMN IF NOT EXISTS support_type text[],
ADD COLUMN IF NOT EXISTS views text[],
ADD COLUMN IF NOT EXISTS ticket_assignment_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ticket_assignment_view_id text,
ADD COLUMN IF NOT EXISTS quota_email integer,
ADD COLUMN IF NOT EXISTS quota_chat integer,
ADD COLUMN IF NOT EXISTS quota_phone integer,
ADD COLUMN IF NOT EXISTS mon_schedule text,
ADD COLUMN IF NOT EXISTS tue_schedule text,
ADD COLUMN IF NOT EXISTS wed_schedule text,
ADD COLUMN IF NOT EXISTS thu_schedule text,
ADD COLUMN IF NOT EXISTS fri_schedule text,
ADD COLUMN IF NOT EXISTS sat_schedule text,
ADD COLUMN IF NOT EXISTS sun_schedule text,
ADD COLUMN IF NOT EXISTS break_schedule text,
ADD COLUMN IF NOT EXISTS weekday_ot_schedule text,
ADD COLUMN IF NOT EXISTS weekend_ot_schedule text,
ADD COLUMN IF NOT EXISTS day_off text[];

-- Migrate existing position values to standardized dropdown options
UPDATE public.agent_profiles SET position = 
  CASE 
    WHEN LOWER(position) LIKE '%hybrid%' THEN 'Hybrid Support'
    WHEN LOWER(position) LIKE '%team lead%' OR LOWER(position) LIKE '%tl%' THEN 'Team Lead'
    WHEN LOWER(position) LIKE '%logistics%' THEN 'Logistics'
    WHEN LOWER(position) LIKE '%email%' THEN 'Email Support'
    WHEN LOWER(position) LIKE '%chat%' THEN 'Chat Support'
    WHEN LOWER(position) LIKE '%phone%' OR LOWER(position) LIKE '%call%' THEN 'Phone Support'
    WHEN LOWER(position) LIKE '%technical%' OR LOWER(position) LIKE '%tech%' THEN 'Technical Support'
    ELSE position
  END
WHERE position IS NOT NULL;