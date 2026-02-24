
CREATE TABLE public.capacity_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_response_time_minutes integer NOT NULL DEFAULT 5,
  agent_hours_per_day numeric NOT NULL DEFAULT 5,
  working_days_per_week integer NOT NULL DEFAULT 5,
  number_of_agents integer NOT NULL DEFAULT 1,
  business_hours_start time NOT NULL DEFAULT '09:00:00',
  business_hours_end time NOT NULL DEFAULT '14:00:00',
  timezone text NOT NULL DEFAULT 'America/New_York',
  utilization_alert_threshold integer NOT NULL DEFAULT 85,
  after_hours_threshold integer NOT NULL DEFAULT 30,
  alert_email text NOT NULL DEFAULT 'hr@virtualfreelancesolutions.com',
  client_allocated_hours numeric NOT NULL DEFAULT 5,
  working_days integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.capacity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read capacity_settings"
  ON public.capacity_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage capacity_settings"
  ON public.capacity_settings FOR ALL
  TO authenticated
  USING (
    public.is_admin(lower((SELECT auth.jwt() ->> 'email')))
    OR public.is_super_admin(lower((SELECT auth.jwt() ->> 'email')))
  );

-- Insert default row
INSERT INTO public.capacity_settings DEFAULT VALUES;
