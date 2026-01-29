-- Create table for Upwork OAuth token storage
CREATE TABLE public.upwork_tokens (
  id TEXT PRIMARY KEY DEFAULT 'default',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  refresh_lock_until TIMESTAMPTZ DEFAULT NULL
);

-- Enable RLS - only service role (edge functions) can access
ALTER TABLE public.upwork_tokens ENABLE ROW LEVEL SECURITY;

-- No public policies - this ensures only service_role key can read/write
-- Edge functions use service_role key, so they bypass RLS