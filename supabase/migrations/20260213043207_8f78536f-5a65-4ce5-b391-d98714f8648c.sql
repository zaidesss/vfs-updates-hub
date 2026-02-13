-- Add quota_ot_email column to attendance_snapshots for effective-dated OT quota preservation
ALTER TABLE public.attendance_snapshots
ADD COLUMN quota_ot_email integer DEFAULT NULL;