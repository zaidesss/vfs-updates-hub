CREATE TABLE public.guide_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_key TEXT UNIQUE NOT NULL,
  image_url TEXT NOT NULL,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.guide_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view guide images"
  ON public.guide_images FOR SELECT USING (true);

CREATE POLICY "Admins can manage guide images"
  ON public.guide_images FOR ALL
  USING (
    public.has_role(
      lower((SELECT auth.jwt() ->> 'email')),
      'admin'
    )
    OR public.is_super_admin(
      lower((SELECT auth.jwt() ->> 'email'))
    )
  )
  WITH CHECK (
    public.has_role(
      lower((SELECT auth.jwt() ->> 'email')),
      'admin'
    )
    OR public.is_super_admin(
      lower((SELECT auth.jwt() ->> 'email'))
    )
  );