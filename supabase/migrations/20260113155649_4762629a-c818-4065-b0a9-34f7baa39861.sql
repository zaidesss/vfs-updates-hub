-- Add new columns to agent_profiles table

-- Connectivity Section (User editable)
ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS primary_internet_provider text,
ADD COLUMN IF NOT EXISTS primary_internet_speed text,
ADD COLUMN IF NOT EXISTS backup_internet_provider text,
ADD COLUMN IF NOT EXISTS backup_internet_speed text,
ADD COLUMN IF NOT EXISTS backup_internet_type text;

-- Banking Information (User editable)
ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_account_number text,
ADD COLUMN IF NOT EXISTS bank_account_holder text;

-- Freelance Information (User editable)
ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS upwork_profile_url text,
ADD COLUMN IF NOT EXISTS upwork_username text;

-- Equipment (User editable - for hybrid agents)
ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS headset_model text;

-- Work Setup (Super Admin only)
ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS work_schedule text,
ADD COLUMN IF NOT EXISTS employment_status text DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS payment_frequency text;

-- Create employment_status type check
ALTER TABLE public.agent_profiles
ADD CONSTRAINT check_employment_status 
CHECK (employment_status IS NULL OR employment_status IN ('Active', 'Probationary', 'Training', 'Terminated', 'Resigned'));

-- Create profile_change_requests table
CREATE TABLE IF NOT EXISTS public.profile_change_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number text,
  requested_by_email text NOT NULL,
  requested_by_name text,
  target_email text NOT NULL,
  field_name text NOT NULL,
  current_value text,
  requested_value text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add constraint for status
ALTER TABLE public.profile_change_requests
ADD CONSTRAINT check_request_status 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Enable RLS on profile_change_requests
ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_change_requests

-- Users can insert requests for their own profile
CREATE POLICY "Users can insert own profile change requests"
ON public.profile_change_requests
FOR INSERT
WITH CHECK (
  requested_by_email = lower((current_setting('request.jwt.claims'::text, true)::json ->> 'email'::text))
  AND target_email = lower((current_setting('request.jwt.claims'::text, true)::json ->> 'email'::text))
);

-- Admins can insert requests for any profile
CREATE POLICY "Admins can insert profile change requests"
ON public.profile_change_requests
FOR INSERT
WITH CHECK (
  has_role((current_setting('request.jwt.claims'::text, true)::json ->> 'email'::text), 'admin'::app_role)
);

-- HR can insert profile change requests
CREATE POLICY "HR can insert profile change requests"
ON public.profile_change_requests
FOR INSERT
WITH CHECK (
  has_role((current_setting('request.jwt.claims'::text, true)::json ->> 'email'::text), 'hr'::app_role)
);

-- Users can view their own submitted requests
CREATE POLICY "Users can view own profile change requests"
ON public.profile_change_requests
FOR SELECT
USING (
  requested_by_email = lower((current_setting('request.jwt.claims'::text, true)::json ->> 'email'::text))
);

-- Admins can view all requests
CREATE POLICY "Admins can view all profile change requests"
ON public.profile_change_requests
FOR SELECT
USING (
  has_role((current_setting('request.jwt.claims'::text, true)::json ->> 'email'::text), 'admin'::app_role)
);

-- HR can view all requests
CREATE POLICY "HR can view all profile change requests"
ON public.profile_change_requests
FOR SELECT
USING (
  has_role((current_setting('request.jwt.claims'::text, true)::json ->> 'email'::text), 'hr'::app_role)
);

-- Super Admins can view all requests
CREATE POLICY "Super Admins can view all profile change requests"
ON public.profile_change_requests
FOR SELECT
USING (
  has_role((current_setting('request.jwt.claims'::text, true)::json ->> 'email'::text), 'super_admin'::app_role)
);

-- Super Admins can update requests (approve/reject)
CREATE POLICY "Super Admins can update profile change requests"
ON public.profile_change_requests
FOR UPDATE
USING (
  has_role((current_setting('request.jwt.claims'::text, true)::json ->> 'email'::text), 'super_admin'::app_role)
);

-- Super Admins can delete requests
CREATE POLICY "Super Admins can delete profile change requests"
ON public.profile_change_requests
FOR DELETE
USING (
  has_role((current_setting('request.jwt.claims'::text, true)::json ->> 'email'::text), 'super_admin'::app_role)
);

-- Create function to generate reference number for profile change requests
CREATE OR REPLACE FUNCTION public.generate_pcr_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.profile_change_requests
  WHERE reference_number IS NOT NULL;
  
  NEW.reference_number := 'PCR-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

-- Create trigger for auto-generating reference numbers
CREATE TRIGGER generate_pcr_reference_number
BEFORE INSERT ON public.profile_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.generate_pcr_number();