
-- Allow super admins to delete audit log entries
CREATE POLICY "Super admins can delete audit logs"
ON public.portal_audit_log
FOR DELETE
TO authenticated
USING (public.is_super_admin(lower(auth.jwt()->>'email')));
