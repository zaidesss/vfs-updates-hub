-- Allow all authenticated users to view pending and approved leave requests for calendar
CREATE POLICY "All users can view calendar requests"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (status IN ('pending', 'approved'));