-- Create scorecard_config table for metric weights and goals
CREATE TABLE public.scorecard_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  support_type TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 0,
  goal NUMERIC NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(support_type, metric_key)
);

-- Create zendesk_agent_metrics table for cached Zendesk performance data
CREATE TABLE public.zendesk_agent_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_email TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  call_aht_seconds NUMERIC,
  chat_aht_seconds NUMERIC,
  chat_frt_seconds NUMERIC,
  total_calls INTEGER DEFAULT 0,
  total_chats INTEGER DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_email, week_start, week_end)
);

-- Enable RLS
ALTER TABLE public.scorecard_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zendesk_agent_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for scorecard_config (everyone can read, admins can modify)
CREATE POLICY "Everyone can view scorecard config"
  ON public.scorecard_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert scorecard config"
  ON public.scorecard_config FOR INSERT
  WITH CHECK (public.is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Admins can update scorecard config"
  ON public.scorecard_config FOR UPDATE
  USING (public.is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Admins can delete scorecard config"
  ON public.scorecard_config FOR DELETE
  USING (public.is_admin(auth.jwt() ->> 'email'));

-- RLS policies for zendesk_agent_metrics (everyone can read, system can write)
CREATE POLICY "Everyone can view zendesk metrics"
  ON public.zendesk_agent_metrics FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert zendesk metrics"
  ON public.zendesk_agent_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update zendesk metrics"
  ON public.zendesk_agent_metrics FOR UPDATE
  USING (true);

-- Trigger for updated_at on scorecard_config
CREATE TRIGGER update_scorecard_config_updated_at
  BEFORE UPDATE ON public.scorecard_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leave_requests_updated_at();

-- Insert default configuration for Hybrid Support
INSERT INTO public.scorecard_config (support_type, metric_key, weight, goal, is_enabled, display_order) VALUES
  ('Hybrid Support', 'productivity', 15, 100, true, 1),
  ('Hybrid Support', 'call_aht', 15, 300, true, 2),
  ('Hybrid Support', 'chat_aht', 15, 180, true, 3),
  ('Hybrid Support', 'chat_frt', 10, 60, true, 4),
  ('Hybrid Support', 'qa', 20, 96, true, 5),
  ('Hybrid Support', 'revalida', 10, 100, true, 6),
  ('Hybrid Support', 'reliability', 15, 100, true, 7);

-- Insert default configuration for Phone Support
INSERT INTO public.scorecard_config (support_type, metric_key, weight, goal, is_enabled, display_order) VALUES
  ('Phone Support', 'call_aht', 30, 300, true, 1),
  ('Phone Support', 'qa', 25, 96, true, 2),
  ('Phone Support', 'revalida', 20, 100, true, 3),
  ('Phone Support', 'reliability', 25, 100, true, 4);

-- Insert default configuration for Chat Support
INSERT INTO public.scorecard_config (support_type, metric_key, weight, goal, is_enabled, display_order) VALUES
  ('Chat Support', 'chat_aht', 25, 180, true, 1),
  ('Chat Support', 'chat_frt', 20, 60, true, 2),
  ('Chat Support', 'qa', 20, 96, true, 3),
  ('Chat Support', 'revalida', 15, 100, true, 4),
  ('Chat Support', 'reliability', 20, 100, true, 5);

-- Insert default configuration for Email Support
INSERT INTO public.scorecard_config (support_type, metric_key, weight, goal, is_enabled, display_order) VALUES
  ('Email Support', 'productivity', 30, 100, true, 1),
  ('Email Support', 'qa', 30, 96, true, 2),
  ('Email Support', 'revalida', 15, 100, true, 3),
  ('Email Support', 'reliability', 25, 100, true, 4);

-- Insert default configuration for Logistics (reliability only)
INSERT INTO public.scorecard_config (support_type, metric_key, weight, goal, is_enabled, display_order) VALUES
  ('Logistics', 'reliability', 100, 100, true, 1);