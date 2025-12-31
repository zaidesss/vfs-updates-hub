-- Add remaining HR policies (skip ones that exist)

-- HR can delete article requests
DROP POLICY IF EXISTS "HR can delete article requests" ON public.article_requests;
CREATE POLICY "HR can delete article requests"
ON public.article_requests
FOR DELETE
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

-- HR can delete user roles
DROP POLICY IF EXISTS "HR can delete user roles" ON public.user_roles;
CREATE POLICY "HR can delete user roles"
ON public.user_roles
FOR DELETE
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

-- HR can update user roles
DROP POLICY IF EXISTS "HR can update user roles" ON public.user_roles;
CREATE POLICY "HR can update user roles"
ON public.user_roles
FOR UPDATE
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role))
WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

-- HR can insert user roles
DROP POLICY IF EXISTS "HR can insert user roles" ON public.user_roles;
CREATE POLICY "HR can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

-- HR can view all questions
DROP POLICY IF EXISTS "HR can view all questions" ON public.update_questions;
CREATE POLICY "HR can view all questions"
ON public.update_questions
FOR SELECT
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

-- HR can view all leave requests
DROP POLICY IF EXISTS "HR can view all leave requests" ON public.leave_requests;
CREATE POLICY "HR can view all leave requests"
ON public.leave_requests
FOR SELECT
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

-- HR can update leave requests
DROP POLICY IF EXISTS "HR can update leave requests" ON public.leave_requests;
CREATE POLICY "HR can update leave requests"
ON public.leave_requests
FOR UPDATE
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));