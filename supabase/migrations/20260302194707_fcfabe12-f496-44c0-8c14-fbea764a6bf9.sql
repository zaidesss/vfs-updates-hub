CREATE TABLE public.sla_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  zd_instance text NOT NULL CHECK (zd_instance IN ('ZD1', 'ZD2')),
  total_new integer NOT NULL DEFAULT 0,
  total_responded integer NOT NULL DEFAULT 0,
  remaining_unanswered integer NOT NULL DEFAULT 0,
  avg_first_reply_minutes integer,
  avg_full_resolution_minutes integer,
  distribution jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (date, zd_instance)
);

ALTER TABLE public.sla_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read snapshots"
  ON public.sla_daily_snapshots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert snapshots"
  ON public.sla_daily_snapshots FOR INSERT TO service_role WITH CHECK (true);