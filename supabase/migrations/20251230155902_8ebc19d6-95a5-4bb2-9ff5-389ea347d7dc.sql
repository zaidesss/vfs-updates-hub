-- Fix: Drop the restrictive policy that only allows pending updates
DROP POLICY IF EXISTS "Users can update own pending requests" ON public.leave_requests;

-- Create new policy allowing users to update any of their own requests
CREATE POLICY "Users can update own requests"
ON public.leave_requests
FOR UPDATE
USING (agent_email = lower((current_setting('request.jwt.claims'::text, true))::json ->> 'email'))
WITH CHECK (agent_email = lower((current_setting('request.jwt.claims'::text, true))::json ->> 'email'));

-- Create agent_profiles table
CREATE TABLE IF NOT EXISTS public.agent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  phone_number text,
  birthday date,
  start_date date,
  home_address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  position text,
  team_lead text,
  clients text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

-- Agents can view their own profile
CREATE POLICY "Users can view own profile"
ON public.agent_profiles FOR SELECT
USING (email = lower((current_setting('request.jwt.claims'::text, true))::json ->> 'email'));

-- Agents can update their own profile
CREATE POLICY "Users can update own profile"
ON public.agent_profiles FOR UPDATE
USING (email = lower((current_setting('request.jwt.claims'::text, true))::json ->> 'email'));

-- Agents can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.agent_profiles FOR INSERT
WITH CHECK (email = lower((current_setting('request.jwt.claims'::text, true))::json ->> 'email'));

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.agent_profiles FOR SELECT
USING (has_role((current_setting('request.jwt.claims'::text, true))::json ->> 'email', 'admin'));

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.agent_profiles FOR UPDATE
USING (has_role((current_setting('request.jwt.claims'::text, true))::json ->> 'email', 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_agent_profiles_updated_at
BEFORE UPDATE ON public.agent_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_leave_requests_updated_at();