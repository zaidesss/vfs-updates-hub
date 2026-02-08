ALTER TABLE public.revalida_v2_answers
ADD CONSTRAINT revalida_v2_answers_attempt_question_unique 
UNIQUE (attempt_id, question_id);