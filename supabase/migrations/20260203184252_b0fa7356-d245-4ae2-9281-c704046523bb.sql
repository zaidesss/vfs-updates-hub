-- Add ot_enabled column to agent_profiles
ALTER TABLE agent_profiles 
ADD COLUMN ot_enabled boolean DEFAULT false;