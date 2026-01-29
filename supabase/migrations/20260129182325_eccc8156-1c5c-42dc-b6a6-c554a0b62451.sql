
-- Drop and recreate the valid_status constraint with RESTARTING
ALTER TABLE public.profile_status DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE public.profile_status 
  ADD CONSTRAINT valid_status 
  CHECK (current_status IN ('LOGGED_OUT', 'LOGGED_IN', 'ON_BREAK', 'COACHING', 'RESTARTING'));

-- Drop and recreate the valid_event_type constraint with new device restart events
ALTER TABLE public.profile_events DROP CONSTRAINT IF EXISTS valid_event_type;

ALTER TABLE public.profile_events 
  ADD CONSTRAINT valid_event_type 
  CHECK (event_type IN (
    'LOGIN', 'LOGOUT', 'BREAK_IN', 'BREAK_OUT', 
    'COACHING_START', 'COACHING_END',
    'DEVICE_RESTART_START', 'DEVICE_RESTART_END'
  ));
