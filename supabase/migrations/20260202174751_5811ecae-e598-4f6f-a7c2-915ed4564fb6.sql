-- Create table to track action plan occurrences per agent
CREATE TABLE public.qa_action_plan_occurrences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_email TEXT NOT NULL,
  action_plan_id UUID REFERENCES public.qa_action_plans(id) ON DELETE CASCADE,
  subcategory TEXT, -- For tracking by subcategory instead of action plan
  evaluation_id UUID NOT NULL REFERENCES public.qa_evaluations(id) ON DELETE CASCADE,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_qa_action_plan_occurrences_agent ON public.qa_action_plan_occurrences(agent_email);
CREATE INDEX idx_qa_action_plan_occurrences_action_plan ON public.qa_action_plan_occurrences(action_plan_id);
CREATE INDEX idx_qa_action_plan_occurrences_subcategory ON public.qa_action_plan_occurrences(agent_email, subcategory);

-- Enable RLS
ALTER TABLE public.qa_action_plan_occurrences ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view all occurrences
CREATE POLICY "Authenticated users can view action plan occurrences"
ON public.qa_action_plan_occurrences
FOR SELECT
TO authenticated
USING (true);

-- Policy for admins/TLs to insert occurrences
CREATE POLICY "Admins can insert action plan occurrences"
ON public.qa_action_plan_occurrences
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE email = (SELECT auth.jwt() ->> 'email')
    AND role IN ('admin', 'super_admin', 'hr')
  )
);

-- Policy for admins to delete occurrences
CREATE POLICY "Admins can delete action plan occurrences"
ON public.qa_action_plan_occurrences
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE email = (SELECT auth.jwt() ->> 'email')
    AND role IN ('admin', 'super_admin')
  )
);