-- Drop the problematic policy that's exposing all pending/approved requests
DROP POLICY IF EXISTS "Authenticated users can view calendar data via view" ON public.leave_requests;