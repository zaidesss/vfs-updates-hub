-- Add RLS policy to allow all authenticated users to view pending/approved leave requests for calendar
CREATE POLICY "All users can view pending and approved requests for calendar"
ON public.leave_requests
FOR SELECT
USING (status IN ('pending', 'approved'));

-- Create storage bucket for leave attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('leave-attachments', 'leave-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for users to upload their own attachments
CREATE POLICY "Users can upload leave attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'leave-attachments' AND
  auth.role() = 'authenticated'
);

-- RLS policy for viewing leave attachments (public bucket)
CREATE POLICY "Anyone can view leave attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'leave-attachments');

-- RLS policy for users to update their own attachments
CREATE POLICY "Users can update own leave attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'leave-attachments')
WITH CHECK (bucket_id = 'leave-attachments' AND auth.role() = 'authenticated');

-- RLS policy for users to delete their own attachments
CREATE POLICY "Users can delete own leave attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'leave-attachments' AND auth.role() = 'authenticated');