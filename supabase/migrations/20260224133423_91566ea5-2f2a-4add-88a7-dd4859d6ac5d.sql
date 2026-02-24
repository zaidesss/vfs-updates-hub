
-- Create backfill jobs table
CREATE TABLE IF NOT EXISTS public.zd_backfill_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zendesk_instance_name text NOT NULL,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'Running',
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  cursor_unix bigint,
  processed int DEFAULT 0,
  updated int DEFAULT 0,
  skipped int DEFAULT 0,
  errors int DEFAULT 0,
  last_ticket_id bigint,
  error text,
  dry_run boolean DEFAULT false
);

-- Create backfill job items table
CREATE TABLE IF NOT EXISTS public.zd_backfill_job_items (
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.zd_backfill_jobs(id) ON DELETE CASCADE,
  ticket_id bigint NOT NULL,
  action text NOT NULL,
  message text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (job_id, ticket_id)
);

-- Enable RLS
ALTER TABLE public.zd_backfill_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zd_backfill_job_items ENABLE ROW LEVEL SECURITY;

-- SuperAdmin-only policies for zd_backfill_jobs
CREATE POLICY "SuperAdmins can select backfill jobs"
  ON public.zd_backfill_jobs FOR SELECT
  TO authenticated
  USING (public.is_super_admin((SELECT auth.jwt()->>'email')));

CREATE POLICY "SuperAdmins can insert backfill jobs"
  ON public.zd_backfill_jobs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin((SELECT auth.jwt()->>'email')));

CREATE POLICY "SuperAdmins can update backfill jobs"
  ON public.zd_backfill_jobs FOR UPDATE
  TO authenticated
  USING (public.is_super_admin((SELECT auth.jwt()->>'email')));

-- SuperAdmin-only policies for zd_backfill_job_items
CREATE POLICY "SuperAdmins can select backfill job items"
  ON public.zd_backfill_job_items FOR SELECT
  TO authenticated
  USING (public.is_super_admin((SELECT auth.jwt()->>'email')));

CREATE POLICY "SuperAdmins can insert backfill job items"
  ON public.zd_backfill_job_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin((SELECT auth.jwt()->>'email')));

-- Service role policy for edge function access
CREATE POLICY "Service role full access backfill jobs"
  ON public.zd_backfill_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access backfill job items"
  ON public.zd_backfill_job_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
