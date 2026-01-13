-- Create table to track if users have seen the demo guide
CREATE TABLE public.demo_guide_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL UNIQUE,
  seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  guide_version INTEGER NOT NULL DEFAULT 1
);

-- Enable RLS
ALTER TABLE public.demo_guide_views ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own record
CREATE POLICY "Users can view their own demo guide status"
ON public.demo_guide_views
FOR SELECT
USING (auth.jwt() ->> 'email' = user_email);

-- Policy: Users can insert their own record
CREATE POLICY "Users can insert their own demo guide status"
ON public.demo_guide_views
FOR INSERT
WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Policy: Users can update their own record
CREATE POLICY "Users can update their own demo guide status"
ON public.demo_guide_views
FOR UPDATE
USING (auth.jwt() ->> 'email' = user_email);