-- Drop existing status constraints that are missing ON_BIO and ON_OT
ALTER TABLE profile_events DROP CONSTRAINT IF EXISTS valid_prev_status;
ALTER TABLE profile_events DROP CONSTRAINT IF EXISTS valid_new_status;

-- Recreate with all statuses including ON_BIO and ON_OT
ALTER TABLE profile_events ADD CONSTRAINT valid_prev_status 
CHECK (prev_status = ANY (ARRAY[
  'LOGGED_OUT'::text, 
  'LOGGED_IN'::text, 
  'ON_BREAK'::text, 
  'COACHING'::text, 
  'RESTARTING'::text,
  'ON_BIO'::text,
  'ON_OT'::text
]));

ALTER TABLE profile_events ADD CONSTRAINT valid_new_status 
CHECK (new_status = ANY (ARRAY[
  'LOGGED_OUT'::text, 
  'LOGGED_IN'::text, 
  'ON_BREAK'::text, 
  'COACHING'::text, 
  'RESTARTING'::text,
  'ON_BIO'::text,
  'ON_OT'::text
]));