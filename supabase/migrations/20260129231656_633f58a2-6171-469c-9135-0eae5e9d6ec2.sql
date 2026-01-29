-- Add upwork_contract_id column to agent_directory table
ALTER TABLE public.agent_directory 
ADD COLUMN upwork_contract_id TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.agent_directory.upwork_contract_id IS 'Upwork contract ID for fetching timesheet data';