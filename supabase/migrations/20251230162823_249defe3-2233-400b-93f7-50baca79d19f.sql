-- Add hourly rate and rate history columns to agent_profiles
ALTER TABLE public.agent_profiles 
ADD COLUMN hourly_rate numeric,
ADD COLUMN rate_history jsonb DEFAULT '[]'::jsonb;