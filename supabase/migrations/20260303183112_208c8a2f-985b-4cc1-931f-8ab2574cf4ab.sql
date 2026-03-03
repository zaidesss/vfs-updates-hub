CREATE POLICY "Admins can update submissions"
ON public.nb_quiz_submissions
FOR UPDATE
TO authenticated
USING (
  has_role((SELECT (auth.jwt() ->> 'email'::text)), 'admin'::app_role)
  OR has_role((SELECT (auth.jwt() ->> 'email'::text)), 'super_admin'::app_role)
  OR has_role((SELECT (auth.jwt() ->> 'email'::text)), 'hr'::app_role)
)
WITH CHECK (
  has_role((SELECT (auth.jwt() ->> 'email'::text)), 'admin'::app_role)
  OR has_role((SELECT (auth.jwt() ->> 'email'::text)), 'super_admin'::app_role)
  OR has_role((SELECT (auth.jwt() ->> 'email'::text)), 'hr'::app_role)
);