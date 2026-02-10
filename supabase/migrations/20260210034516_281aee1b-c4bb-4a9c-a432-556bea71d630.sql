
-- Create guide-images storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('guide-images', 'guide-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view guide images (public bucket)
CREATE POLICY "Guide images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'guide-images');

-- Allow authenticated admins/HR/super_admin to upload guide images
CREATE POLICY "Admins can upload guide images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'guide-images');

-- Allow authenticated admins to update guide images
CREATE POLICY "Admins can update guide images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'guide-images');

-- Allow authenticated admins to delete guide images
CREATE POLICY "Admins can delete guide images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'guide-images');
