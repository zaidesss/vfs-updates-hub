-- Create qa_action_plans table first (referenced by qa_action_needed)
CREATE TABLE public.qa_action_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_text TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create qa_evaluations table
CREATE TABLE public.qa_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT UNIQUE,
  agent_email TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  evaluator_email TEXT NOT NULL,
  evaluator_name TEXT,
  audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  zd_instance TEXT NOT NULL,
  ticket_id TEXT NOT NULL,
  ticket_url TEXT,
  interaction_type TEXT NOT NULL,
  ticket_content TEXT,
  total_score INTEGER NOT NULL DEFAULT 0,
  total_max INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  has_critical_fail BOOLEAN NOT NULL DEFAULT false,
  rating TEXT,
  accuracy_feedback TEXT,
  accuracy_kudos TEXT,
  compliance_feedback TEXT,
  compliance_kudos TEXT,
  customer_exp_feedback TEXT,
  customer_exp_kudos TEXT,
  agent_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create qa_evaluation_scores table
CREATE TABLE public.qa_evaluation_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.qa_evaluations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  behavior_identifier TEXT,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  score_earned INTEGER,
  max_points INTEGER NOT NULL DEFAULT 6,
  ai_suggested_score INTEGER,
  ai_accepted BOOLEAN,
  critical_error_detected BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create qa_action_needed table
CREATE TABLE public.qa_action_needed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.qa_evaluations(id) ON DELETE CASCADE,
  action_plan_id UUID REFERENCES public.qa_action_plans(id),
  custom_action TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to generate QA reference numbers
CREATE OR REPLACE FUNCTION public.generate_qa_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.qa_evaluations
  WHERE reference_number IS NOT NULL;
  
  NEW.reference_number := 'QA-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

-- Create trigger for auto-generating reference numbers
CREATE TRIGGER generate_qa_reference_number
  BEFORE INSERT ON public.qa_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_qa_number();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_qa_evaluations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create trigger for updating timestamps
CREATE TRIGGER update_qa_evaluations_updated_at
  BEFORE UPDATE ON public.qa_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_qa_evaluations_updated_at();

-- Enable RLS on all tables
ALTER TABLE public.qa_action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_action_needed ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qa_action_plans (read by all authenticated, manage by admins)
CREATE POLICY "Anyone can view active action plans"
  ON public.qa_action_plans
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage action plans"
  ON public.qa_action_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE email = (SELECT auth.jwt() ->> 'email')
      AND role IN ('admin', 'super_admin', 'hr')
    )
  );

-- RLS Policies for qa_evaluations
CREATE POLICY "Admins can view all evaluations"
  ON public.qa_evaluations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE email = (SELECT auth.jwt() ->> 'email')
      AND role IN ('admin', 'super_admin', 'hr')
    )
  );

CREATE POLICY "Agents can view their own evaluations"
  ON public.qa_evaluations
  FOR SELECT
  USING (agent_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Admins can create evaluations"
  ON public.qa_evaluations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE email = (SELECT auth.jwt() ->> 'email')
      AND role IN ('admin', 'super_admin', 'hr')
    )
  );

CREATE POLICY "Admins can update evaluations"
  ON public.qa_evaluations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE email = (SELECT auth.jwt() ->> 'email')
      AND role IN ('admin', 'super_admin', 'hr')
    )
  );

CREATE POLICY "Agents can acknowledge their evaluations"
  ON public.qa_evaluations
  FOR UPDATE
  USING (agent_email = (SELECT auth.jwt() ->> 'email'))
  WITH CHECK (agent_email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "Admins can delete evaluations"
  ON public.qa_evaluations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE email = (SELECT auth.jwt() ->> 'email')
      AND role IN ('admin', 'super_admin', 'hr')
    )
  );

-- RLS Policies for qa_evaluation_scores
CREATE POLICY "Users can view scores for accessible evaluations"
  ON public.qa_evaluation_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.qa_evaluations e
      WHERE e.id = evaluation_id
      AND (
        e.agent_email = (SELECT auth.jwt() ->> 'email')
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE email = (SELECT auth.jwt() ->> 'email')
          AND role IN ('admin', 'super_admin', 'hr')
        )
      )
    )
  );

CREATE POLICY "Admins can manage scores"
  ON public.qa_evaluation_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE email = (SELECT auth.jwt() ->> 'email')
      AND role IN ('admin', 'super_admin', 'hr')
    )
  );

-- RLS Policies for qa_action_needed
CREATE POLICY "Users can view actions for accessible evaluations"
  ON public.qa_action_needed
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.qa_evaluations e
      WHERE e.id = evaluation_id
      AND (
        e.agent_email = (SELECT auth.jwt() ->> 'email')
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE email = (SELECT auth.jwt() ->> 'email')
          AND role IN ('admin', 'super_admin', 'hr')
        )
      )
    )
  );

CREATE POLICY "Admins can manage actions"
  ON public.qa_action_needed
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE email = (SELECT auth.jwt() ->> 'email')
      AND role IN ('admin', 'super_admin', 'hr')
    )
  );

CREATE POLICY "Agents can resolve their own actions"
  ON public.qa_action_needed
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.qa_evaluations e
      WHERE e.id = evaluation_id
      AND e.agent_email = (SELECT auth.jwt() ->> 'email')
    )
  );

-- Seed predefined action plans
INSERT INTO public.qa_action_plans (action_text, category, display_order) VALUES
  ('Get proof of delivery before offering replacement', 'Delivery', 1),
  ('Confirm address on file instead of asking again', 'Communication', 2),
  ('Apologize when response is delayed', 'Communication', 3),
  ('Introduce yourself when taking over a ticket', 'Communication', 4),
  ('Start carrier trace before offering resolution', 'Delivery', 5),
  ('Include delivery details in first reply', 'Delivery', 6),
  ('Confirm address format: "Is this correct? [address]"', 'Communication', 7),
  ('Review order details before responding', 'Process', 8),
  ('Address the customer''s concern first', 'Customer Experience', 9),
  ('Focus on solution, not process steps', 'Customer Experience', 10),
  ('Read all previous notes before replying', 'Process', 11),
  ('Check shipping and customs before replacing', 'Delivery', 12),
  ('Do not share internal issues with customers', 'Compliance', 13),
  ('Do not cancel subscription without request', 'Compliance', 14),
  ('Verify refund status before promising refund', 'Process', 15),
  ('Escalate refund errors with correct details', 'Process', 16),
  ('Do not replace if delivery is confirmed', 'Delivery', 17),
  ('Address all concerns in one response', 'Customer Experience', 18),
  ('Lead with confidence, not open-ended options', 'Communication', 19),
  ('Review case history upon return from leave', 'Process', 20);

-- Create indexes for better performance
CREATE INDEX idx_qa_evaluations_agent_email ON public.qa_evaluations(agent_email);
CREATE INDEX idx_qa_evaluations_evaluator_email ON public.qa_evaluations(evaluator_email);
CREATE INDEX idx_qa_evaluations_audit_date ON public.qa_evaluations(audit_date);
CREATE INDEX idx_qa_evaluations_status ON public.qa_evaluations(status);
CREATE INDEX idx_qa_evaluation_scores_evaluation_id ON public.qa_evaluation_scores(evaluation_id);
CREATE INDEX idx_qa_action_needed_evaluation_id ON public.qa_action_needed(evaluation_id);
CREATE INDEX idx_qa_action_needed_is_resolved ON public.qa_action_needed(is_resolved);