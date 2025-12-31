-- Allow HR role to delete leave requests
CREATE POLICY "HR can delete leave requests"
ON public.leave_requests
FOR DELETE
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));