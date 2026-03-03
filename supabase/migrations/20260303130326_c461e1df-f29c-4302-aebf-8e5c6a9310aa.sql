
CREATE TABLE public.nb_quiz_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_date date NOT NULL UNIQUE,
  is_visible boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

ALTER TABLE public.nb_quiz_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings
CREATE POLICY "Authenticated users can read quiz settings"
  ON public.nb_quiz_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins/super_admins can update
CREATE POLICY "Admins can manage quiz settings"
  ON public.nb_quiz_settings FOR ALL
  TO authenticated
  USING (
    public.has_role(lower(auth.jwt() ->> 'email'), 'admin') OR
    public.has_role(lower(auth.jwt() ->> 'email'), 'super_admin')
  )
  WITH CHECK (
    public.has_role(lower(auth.jwt() ->> 'email'), 'admin') OR
    public.has_role(lower(auth.jwt() ->> 'email'), 'super_admin')
  );

-- Seed default rows for the 4 quiz dates (all hidden by default)
INSERT INTO public.nb_quiz_settings (quiz_date, is_visible)
VALUES
  ('2026-03-03', false),
  ('2026-03-04', false),
  ('2026-03-05', false),
  ('2026-03-06', false);
