-- Add UPDATE policy for admins/super_admins on zendesk_agent_metrics
CREATE POLICY "Admins can update zendesk metrics" 
ON public.zendesk_agent_metrics 
FOR UPDATE 
TO authenticated
USING (
  public.is_admin(auth.jwt() ->> 'email') OR 
  public.is_super_admin(auth.jwt() ->> 'email')
);

-- Also add INSERT policy for admins (in case they need to create new entries)
CREATE POLICY "Admins can insert zendesk metrics" 
ON public.zendesk_agent_metrics 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.is_admin(auth.jwt() ->> 'email') OR 
  public.is_super_admin(auth.jwt() ->> 'email')
);