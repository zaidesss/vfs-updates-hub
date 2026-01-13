-- Create portal_changelog table for tracking portal changes
CREATE TABLE public.portal_changelog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  feature_link TEXT,
  visible_to_roles TEXT[] NOT NULL DEFAULT ARRAY['user', 'hr', 'admin', 'super_admin'],
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portal_changelog ENABLE ROW LEVEL SECURITY;

-- Users can view entries where their role is in visible_to_roles
CREATE POLICY "Users can view relevant changelog entries"
ON public.portal_changelog
FOR SELECT
USING (
  (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'user'::app_role) AND 'user' = ANY(visible_to_roles))
  OR (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'hr'::app_role) AND 'hr' = ANY(visible_to_roles))
  OR (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'admin'::app_role) AND 'admin' = ANY(visible_to_roles))
  OR (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role) AND 'super_admin' = ANY(visible_to_roles))
);

-- Super Admins can insert changelog entries
CREATE POLICY "Super Admins can insert changelog entries"
ON public.portal_changelog
FOR INSERT
WITH CHECK (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- Super Admins can update changelog entries
CREATE POLICY "Super Admins can update changelog entries"
ON public.portal_changelog
FOR UPDATE
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- Super Admins can delete changelog entries
CREATE POLICY "Super Admins can delete changelog entries"
ON public.portal_changelog
FOR DELETE
USING (has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text), 'super_admin'::app_role));

-- Create function to generate CL-XXXX reference numbers
CREATE OR REPLACE FUNCTION public.generate_cl_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.portal_changelog
  WHERE reference_number IS NOT NULL;
  
  NEW.reference_number := 'CL-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Create trigger for auto-generating reference numbers
CREATE TRIGGER set_changelog_reference_number
BEFORE INSERT ON public.portal_changelog
FOR EACH ROW
EXECUTE FUNCTION public.generate_cl_number();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_changelog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for updating updated_at
CREATE TRIGGER update_changelog_updated_at
BEFORE UPDATE ON public.portal_changelog
FOR EACH ROW
EXECUTE FUNCTION public.update_changelog_updated_at();