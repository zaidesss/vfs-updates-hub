-- Add unique constraint to prevent multiple attempts per agent per batch
ALTER TABLE public.revalida_v2_attempts 
ADD CONSTRAINT unique_agent_batch_attempt UNIQUE (batch_id, agent_email);