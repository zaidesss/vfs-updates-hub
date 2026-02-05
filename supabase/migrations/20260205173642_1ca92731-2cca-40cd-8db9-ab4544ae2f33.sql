-- Drop the existing constraint
ALTER TABLE profile_status DROP CONSTRAINT IF EXISTS valid_status;

-- Recreate with ON_OT included
ALTER TABLE profile_status ADD CONSTRAINT valid_status 
CHECK (current_status = ANY (ARRAY[
  'LOGGED_OUT'::text, 
  'LOGGED_IN'::text, 
  'ON_BREAK'::text, 
  'COACHING'::text, 
  'RESTARTING'::text, 
  'ON_BIO'::text,
  'ON_OT'::text
]));