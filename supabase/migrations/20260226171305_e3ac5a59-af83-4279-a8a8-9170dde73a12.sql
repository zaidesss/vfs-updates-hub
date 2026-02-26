
CREATE TABLE public.zendesk_user_ids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zd_instance TEXT NOT NULL,
  support_account TEXT NOT NULL,
  zendesk_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(zd_instance, support_account)
);

-- RLS: readable by authenticated users
ALTER TABLE public.zendesk_user_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read zendesk_user_ids"
  ON public.zendesk_user_ids
  FOR SELECT
  TO authenticated
  USING (true);
