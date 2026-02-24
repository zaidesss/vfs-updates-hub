ALTER TABLE public.agent_profiles ADD COLUMN IF NOT EXISTS upwork_contract_type text;
ALTER TABLE public.agent_directory ADD COLUMN IF NOT EXISTS upwork_contract_type text;