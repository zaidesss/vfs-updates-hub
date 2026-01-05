-- Create table to track deleted users for restore capability
CREATE TABLE public.deleted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  original_role text NOT NULL,
  deleted_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_by text NOT NULL,
  restored_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;

-- Only super admins can view deleted users
CREATE POLICY "Super admins can view deleted users"
ON public.deleted_users
FOR SELECT
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_deleted_users_email ON public.deleted_users(email);
CREATE INDEX idx_deleted_users_restored_at ON public.deleted_users(restored_at);