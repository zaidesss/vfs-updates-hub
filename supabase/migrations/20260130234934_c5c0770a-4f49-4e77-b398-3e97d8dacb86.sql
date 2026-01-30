-- Add is_auto_generated flag to track system-created requests
ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS is_auto_generated boolean DEFAULT false;