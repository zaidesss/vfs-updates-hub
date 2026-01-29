-- Add new event types for Device Restart
-- Note: We're using a flexible approach since there might not be a constraint

-- First, let's update the profile_status to support RESTARTING status
-- Check and add RESTARTING to allowed statuses if using a check constraint

-- For profile_events: Add support for DEVICE_RESTART_START and DEVICE_RESTART_END event types
-- These will be stored as strings in the event_type column

-- For profile_status: Add support for RESTARTING status
-- This will be stored as a string in the current_status column

-- Enable realtime for notifications table (may already be enabled)
DO $$
BEGIN
  -- Try to add to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;