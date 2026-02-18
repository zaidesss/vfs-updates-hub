-- Add NCNS to valid_incident_type constraint
ALTER TABLE public.agent_reports DROP CONSTRAINT valid_incident_type;
ALTER TABLE public.agent_reports ADD CONSTRAINT valid_incident_type CHECK (incident_type = ANY (ARRAY['QUOTA_NOT_MET','NO_LOGOUT','HIGH_GAP','EXCESSIVE_RESTARTS','TIME_NOT_MET','LATE_LOGIN','EARLY_OUT','BIO_OVERUSE','OVERBREAK','NCNS']));

-- Add critical to valid_severity constraint
ALTER TABLE public.agent_reports DROP CONSTRAINT valid_severity;
ALTER TABLE public.agent_reports ADD CONSTRAINT valid_severity CHECK (severity = ANY (ARRAY['low','medium','high','critical']));