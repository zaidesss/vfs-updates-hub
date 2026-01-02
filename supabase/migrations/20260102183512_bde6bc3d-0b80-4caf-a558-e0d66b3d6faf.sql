-- Create failed_emails table to track email failures for retry and monitoring
CREATE TABLE public.failed_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  error_message TEXT,
  payload JSONB,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.failed_emails ENABLE ROW LEVEL SECURITY;

-- Only admins and HR can view failed emails
CREATE POLICY "Admins can view failed emails"
ON public.failed_emails
FOR SELECT
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "HR can view failed emails"
ON public.failed_emails
FOR SELECT
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

-- Service role can insert failed emails (from edge functions)
CREATE POLICY "Service role can insert failed emails"
ON public.failed_emails
FOR INSERT
WITH CHECK (true);

-- Admins can update failed emails (for retry/resolve)
CREATE POLICY "Admins can update failed emails"
ON public.failed_emails
FOR UPDATE
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

CREATE POLICY "HR can update failed emails"
ON public.failed_emails
FOR UPDATE
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role));

-- Create notification_settings table for user preferences
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  in_app_notifications BOOLEAN DEFAULT true,
  updates_notifications BOOLEAN DEFAULT true,
  leave_notifications BOOLEAN DEFAULT true,
  question_notifications BOOLEAN DEFAULT true,
  request_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view own notification settings"
ON public.notification_settings
FOR SELECT
USING (user_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)));

-- Users can insert their own settings
CREATE POLICY "Users can insert own notification settings"
ON public.notification_settings
FOR INSERT
WITH CHECK (user_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)));

-- Users can update their own settings
CREATE POLICY "Users can update own notification settings"
ON public.notification_settings
FOR UPDATE
USING (user_email = lower(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)));

-- Admins can view all settings
CREATE POLICY "Admins can view all notification settings"
ON public.notification_settings
FOR SELECT
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_leave_requests_updated_at();