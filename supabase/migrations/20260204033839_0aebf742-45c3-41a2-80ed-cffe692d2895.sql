-- Add zendesk_user_id column to agent_profiles
ALTER TABLE public.agent_profiles 
ADD COLUMN IF NOT EXISTS zendesk_user_id text;