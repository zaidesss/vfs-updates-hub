CREATE TABLE public.zendesk_cache (
  cache_key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.zendesk_cache DISABLE ROW LEVEL SECURITY;