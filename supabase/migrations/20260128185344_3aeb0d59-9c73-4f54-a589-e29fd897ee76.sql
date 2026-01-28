-- Drop existing foreign key constraints that reference agent_directory
ALTER TABLE profile_status 
DROP CONSTRAINT IF EXISTS profile_status_profile_id_fkey;

ALTER TABLE profile_events 
DROP CONSTRAINT IF EXISTS profile_events_profile_id_fkey;

-- Recreate foreign keys pointing to agent_profiles
ALTER TABLE profile_status
ADD CONSTRAINT profile_status_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES agent_profiles(id) ON DELETE CASCADE;

ALTER TABLE profile_events
ADD CONSTRAINT profile_events_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES agent_profiles(id) ON DELETE CASCADE;