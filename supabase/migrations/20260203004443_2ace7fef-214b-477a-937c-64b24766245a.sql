-- Add 'ON_BIO' to the valid_status check constraint on profile_status table
ALTER TABLE profile_status DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE profile_status ADD CONSTRAINT valid_status 
  CHECK (current_status = ANY (ARRAY['LOGGED_OUT', 'LOGGED_IN', 'ON_BREAK', 'COACHING', 'RESTARTING', 'ON_BIO']));