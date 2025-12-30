-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table (email-based since we use email login, not Supabase auth)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_email TEXT, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE email = lower(_email)
      AND role = _role
  )
$$;

-- Function to check if user is admin (for use in edge functions and frontend)
CREATE OR REPLACE FUNCTION public.is_admin(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(lower(_email), 'admin')
$$;

-- RLS Policies
CREATE POLICY "Anyone can read roles"
ON public.user_roles
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(current_setting('request.jwt.claims', true)::json->>'email', 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(current_setting('request.jwt.claims', true)::json->>'email', 'admin'));

-- Seed initial admins
INSERT INTO public.user_roles (email, role) VALUES
('hr@virtualfreelancesolutions.com', 'admin'),
('jaeransanchez@gmail.com', 'admin'),
('dzaydee06@gmail.com', 'admin'),
('joanargao@gmail.com', 'admin'),
('salmeromalcomeduc@gmail.com', 'admin'),
('mjesguerraiman@gmail.com', 'admin');