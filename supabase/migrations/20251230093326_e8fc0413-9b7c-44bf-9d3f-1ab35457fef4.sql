-- Create acknowledgements table to store update acknowledgements
CREATE TABLE public.acknowledgements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    update_id TEXT NOT NULL,
    agent_email TEXT NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(update_id, agent_email)
);

-- Enable Row Level Security
ALTER TABLE public.acknowledgements ENABLE ROW LEVEL SECURITY;

-- Users can view all acknowledgements (for admin dashboard and stats)
CREATE POLICY "Authenticated users can view acknowledgements"
ON public.acknowledgements
FOR SELECT
TO authenticated
USING (true);

-- Users can only insert their own acknowledgement
CREATE POLICY "Users can insert own acknowledgement"
ON public.acknowledgements
FOR INSERT
TO authenticated
WITH CHECK (agent_email = lower((current_setting('request.jwt.claims'::text, true)::json ->> 'email'::text)));

-- Create index for faster lookups
CREATE INDEX idx_acknowledgements_update_id ON public.acknowledgements(update_id);
CREATE INDEX idx_acknowledgements_agent_email ON public.acknowledgements(agent_email);