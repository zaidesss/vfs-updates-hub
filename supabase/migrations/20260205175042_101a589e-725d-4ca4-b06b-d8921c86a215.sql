-- Drop the existing event_type constraint
ALTER TABLE profile_events DROP CONSTRAINT IF EXISTS valid_event_type;

-- Recreate with all event types including OT and BIO
ALTER TABLE profile_events ADD CONSTRAINT valid_event_type 
CHECK (event_type = ANY (ARRAY[
  'LOGIN'::text, 
  'LOGOUT'::text, 
  'BREAK_IN'::text, 
  'BREAK_OUT'::text, 
  'COACHING_START'::text, 
  'COACHING_END'::text, 
  'DEVICE_RESTART_START'::text, 
  'DEVICE_RESTART_END'::text,
  'BIO_START'::text,
  'BIO_END'::text,
  'OT_LOGIN'::text,
  'OT_LOGOUT'::text
]));