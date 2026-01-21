-- Create table for configurable dropdown options
CREATE TABLE public.directory_dropdown_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category, value)
);

-- Enable RLS
ALTER TABLE public.directory_dropdown_options ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with admin/hr/super_admin roles to read
CREATE POLICY "Admin and HR can view dropdown options"
  ON public.directory_dropdown_options
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND user_roles.role IN ('admin', 'hr', 'super_admin')
    )
  );

-- Allow admin/hr/super_admin to manage options
CREATE POLICY "Admin and HR can manage dropdown options"
  ON public.directory_dropdown_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND user_roles.role IN ('admin', 'hr', 'super_admin')
    )
  );

-- Seed initial data for Zendesk Instances
INSERT INTO public.directory_dropdown_options (category, value, display_order) VALUES
  ('zendesk_instance', 'ZD1', 1),
  ('zendesk_instance', 'ZD2', 2);

-- Seed initial data for Support Accounts
INSERT INTO public.directory_dropdown_options (category, value, display_order) VALUES
  ('support_account', '1', 1),
  ('support_account', '2', 2),
  ('support_account', '3', 3),
  ('support_account', '4', 4),
  ('support_account', '5', 5),
  ('support_account', '6', 6),
  ('support_account', '7', 7),
  ('support_account', '8', 8),
  ('support_account', '9', 9),
  ('support_account', '10', 10);

-- Seed initial data for Views
INSERT INTO public.directory_dropdown_options (category, value, display_order) VALUES
  ('views', 'Open', 1),
  ('views', 'New', 2),
  ('views', 'ALL', 3);

-- Seed initial data for Day Off
INSERT INTO public.directory_dropdown_options (category, value, display_order) VALUES
  ('day_off', 'Mon', 1),
  ('day_off', 'Tue', 2),
  ('day_off', 'Wed', 3),
  ('day_off', 'Thu', 4),
  ('day_off', 'Fri', 5),
  ('day_off', 'Sat', 6),
  ('day_off', 'Sun', 7);