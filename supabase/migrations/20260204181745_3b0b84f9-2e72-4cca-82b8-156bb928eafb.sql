-- Create storage bucket for article attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-attachments', 'article-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read files (public bucket)
CREATE POLICY "Public read access for article attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-attachments');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload article attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'article-attachments' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete article attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'article-attachments' AND auth.role() = 'authenticated');