
-- Cache table for Zendesk Insights results
CREATE TABLE public.zendesk_insights_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zd_instance TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_tickets INTEGER,
  avg_resolution_time_seconds INTEGER,
  full_resolution_time_minutes INTEGER,
  csat_score INTEGER,
  csat_good INTEGER,
  csat_total INTEGER,
  avg_frt_seconds INTEGER,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(zd_instance, week_start)
);

-- Enable RLS
ALTER TABLE public.zendesk_insights_cache ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read cache
CREATE POLICY "Authenticated users can read insights cache"
  ON public.zendesk_insights_cache
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role (edge functions) can insert/update
-- Edge functions use service_role key, which bypasses RLS
-- No insert/update policies needed for regular users

CREATE INDEX idx_insights_cache_lookup ON public.zendesk_insights_cache (zd_instance, week_start);
