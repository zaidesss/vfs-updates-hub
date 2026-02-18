
-- Create portal_audit_log table
CREATE TABLE public.portal_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL,
  action_type text NOT NULL,
  entity_id text,
  entity_label text,
  reference_number text,
  changed_by text NOT NULL,
  changes jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portal_audit_log ENABLE ROW LEVEL SECURITY;

-- Super Admin, Admin, HR can SELECT all rows
CREATE POLICY "Admins and HR can view audit logs"
ON public.portal_audit_log
FOR SELECT
TO authenticated
USING (
  public.has_role(lower(auth.jwt()->>'email'), 'admin')
  OR public.has_role(lower(auth.jwt()->>'email'), 'super_admin')
  OR public.has_role(lower(auth.jwt()->>'email'), 'hr')
);

-- INSERT allowed for authenticated users (app writes logs)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.portal_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- No UPDATE or DELETE policies (immutable audit trail)

-- Index for common query patterns
CREATE INDEX idx_audit_log_area ON public.portal_audit_log (area);
CREATE INDEX idx_audit_log_created_at ON public.portal_audit_log (created_at DESC);
CREATE INDEX idx_audit_log_changed_by ON public.portal_audit_log (changed_by);
CREATE INDEX idx_audit_log_action_type ON public.portal_audit_log (action_type);
