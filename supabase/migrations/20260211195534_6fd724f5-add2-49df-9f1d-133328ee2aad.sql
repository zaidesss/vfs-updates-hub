-- Create slack_threads table for storing thread parent timestamps
CREATE TABLE public.slack_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_email TEXT NOT NULL,
  channel TEXT NOT NULL,
  thread_ts TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to ensure one thread parent per agent per channel per day
CREATE UNIQUE INDEX idx_slack_threads_unique ON public.slack_threads(agent_email, channel, date);

-- Enable Row Level Security
ALTER TABLE public.slack_threads ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role only (edge functions use service role key)
-- Prevent all direct user access
CREATE POLICY "Service role only access"
ON public.slack_threads
FOR ALL
USING (false)
WITH CHECK (false);