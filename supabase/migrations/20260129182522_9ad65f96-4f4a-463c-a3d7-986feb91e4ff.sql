
-- Drop and recreate the valid_new_status constraint with RESTARTING
ALTER TABLE public.profile_events DROP CONSTRAINT IF EXISTS valid_new_status;

ALTER TABLE public.profile_events 
  ADD CONSTRAINT valid_new_status 
  CHECK (new_status IN ('LOGGED_OUT', 'LOGGED_IN', 'ON_BREAK', 'COACHING', 'RESTARTING'));

-- Drop and recreate the valid_prev_status constraint with RESTARTING
ALTER TABLE public.profile_events DROP CONSTRAINT IF EXISTS valid_prev_status;

ALTER TABLE public.profile_events 
  ADD CONSTRAINT valid_prev_status 
  CHECK (prev_status IN ('LOGGED_OUT', 'LOGGED_IN', 'ON_BREAK', 'COACHING', 'RESTARTING'));
