-- Add per-day OT schedule columns to agent_profiles
ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS mon_ot_schedule text,
ADD COLUMN IF NOT EXISTS tue_ot_schedule text,
ADD COLUMN IF NOT EXISTS wed_ot_schedule text,
ADD COLUMN IF NOT EXISTS thu_ot_schedule text,
ADD COLUMN IF NOT EXISTS fri_ot_schedule text,
ADD COLUMN IF NOT EXISTS sat_ot_schedule text,
ADD COLUMN IF NOT EXISTS sun_ot_schedule text;

-- Add per-day OT schedule columns to agent_directory
ALTER TABLE public.agent_directory
ADD COLUMN IF NOT EXISTS mon_ot_schedule text,
ADD COLUMN IF NOT EXISTS tue_ot_schedule text,
ADD COLUMN IF NOT EXISTS wed_ot_schedule text,
ADD COLUMN IF NOT EXISTS thu_ot_schedule text,
ADD COLUMN IF NOT EXISTS fri_ot_schedule text,
ADD COLUMN IF NOT EXISTS sat_ot_schedule text,
ADD COLUMN IF NOT EXISTS sun_ot_schedule text;

-- Add comments for documentation
COMMENT ON COLUMN public.agent_profiles.mon_ot_schedule IS 'Monday OT schedule (e.g., 6:00 PM-9:00 PM)';
COMMENT ON COLUMN public.agent_profiles.tue_ot_schedule IS 'Tuesday OT schedule';
COMMENT ON COLUMN public.agent_profiles.wed_ot_schedule IS 'Wednesday OT schedule';
COMMENT ON COLUMN public.agent_profiles.thu_ot_schedule IS 'Thursday OT schedule';
COMMENT ON COLUMN public.agent_profiles.fri_ot_schedule IS 'Friday OT schedule';
COMMENT ON COLUMN public.agent_profiles.sat_ot_schedule IS 'Saturday OT schedule';
COMMENT ON COLUMN public.agent_profiles.sun_ot_schedule IS 'Sunday OT schedule';

COMMENT ON COLUMN public.agent_directory.mon_ot_schedule IS 'Monday OT schedule (synced from profiles)';
COMMENT ON COLUMN public.agent_directory.tue_ot_schedule IS 'Tuesday OT schedule (synced from profiles)';
COMMENT ON COLUMN public.agent_directory.wed_ot_schedule IS 'Wednesday OT schedule (synced from profiles)';
COMMENT ON COLUMN public.agent_directory.thu_ot_schedule IS 'Thursday OT schedule (synced from profiles)';
COMMENT ON COLUMN public.agent_directory.fri_ot_schedule IS 'Friday OT schedule (synced from profiles)';
COMMENT ON COLUMN public.agent_directory.sat_ot_schedule IS 'Saturday OT schedule (synced from profiles)';
COMMENT ON COLUMN public.agent_directory.sun_ot_schedule IS 'Sunday OT schedule (synced from profiles)';