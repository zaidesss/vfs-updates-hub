-- Add OVERBREAK to valid incident types
ALTER TABLE agent_reports 
DROP CONSTRAINT IF EXISTS valid_incident_type;

ALTER TABLE agent_reports
ADD CONSTRAINT valid_incident_type CHECK (incident_type IN (
  'QUOTA_NOT_MET', 'NO_LOGOUT', 'HIGH_GAP', 'EXCESSIVE_RESTARTS',
  'TIME_NOT_MET', 'LATE_LOGIN', 'EARLY_OUT', 'BIO_OVERUSE', 'OVERBREAK'
));