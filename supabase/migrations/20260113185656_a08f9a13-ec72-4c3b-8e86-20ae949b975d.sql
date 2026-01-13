-- Add remarks column to improvements table
ALTER TABLE public.improvements ADD COLUMN IF NOT EXISTS remarks text;