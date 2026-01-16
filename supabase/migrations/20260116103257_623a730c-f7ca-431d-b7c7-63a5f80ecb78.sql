-- Super admin full access to all tables

-- article_requests
CREATE POLICY "Super admins can view all article requests" 
ON public.article_requests FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can update article requests" 
ON public.article_requests FOR UPDATE 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete article requests" 
ON public.article_requests FOR DELETE 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert article requests" 
ON public.article_requests FOR INSERT 
WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- failed_emails
CREATE POLICY "Super admins can view failed emails" 
ON public.failed_emails FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can update failed emails" 
ON public.failed_emails FOR UPDATE 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- leave_requests
CREATE POLICY "Super admins can view all leave requests" 
ON public.leave_requests FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can update leave requests" 
ON public.leave_requests FOR UPDATE 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete leave requests" 
ON public.leave_requests FOR DELETE 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- leave_request_history
CREATE POLICY "Super admins can view all leave request history" 
ON public.leave_request_history FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- updates
CREATE POLICY "Super admins can view all updates" 
ON public.updates FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can create updates" 
ON public.updates FOR INSERT 
WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can update updates" 
ON public.updates FOR UPDATE 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete updates" 
ON public.updates FOR DELETE 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- update_questions
CREATE POLICY "Super admins can update questions" 
ON public.update_questions FOR UPDATE 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can view all questions" 
ON public.update_questions FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- update_change_history
CREATE POLICY "Super admins can insert change history" 
ON public.update_change_history FOR INSERT 
WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

CREATE POLICY "Super admins can view change history" 
ON public.update_change_history FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- question_replies
CREATE POLICY "Super admins can insert replies" 
ON public.question_replies FOR INSERT 
WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- reminder_logs
CREATE POLICY "Super admins can view reminder logs" 
ON public.reminder_logs FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- notification_settings
CREATE POLICY "Super admins can view all notification settings" 
ON public.notification_settings FOR SELECT 
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- profile_change_requests (add INSERT)
CREATE POLICY "Super admins can insert profile change requests" 
ON public.profile_change_requests FOR INSERT 
WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));