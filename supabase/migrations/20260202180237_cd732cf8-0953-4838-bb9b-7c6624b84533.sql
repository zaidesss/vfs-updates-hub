-- Insert 10 action plans for Accuracy category
INSERT INTO public.qa_action_plans (action_text, category, display_order, is_active) VALUES
('Use proper spelling and grammar in all responses', 'Accuracy', 1, true),
('Proofread messages before sending', 'Accuracy', 2, true),
('Structure responses clearly with logical flow', 'Accuracy', 3, true),
('Thoroughly read and understand the ticket before responding', 'Accuracy', 4, true),
('Identify the root cause before offering solutions', 'Accuracy', 5, true),
('Verify information accuracy before providing to customer', 'Accuracy', 6, true),
('Provide complete solutions that address all aspects of the issue', 'Accuracy', 7, true),
('Aim to resolve issues on first contact when possible', 'Accuracy', 8, true),
('Respond within expected timeframes', 'Accuracy', 9, true),
('Avoid unnecessary back-and-forth by gathering all needed info upfront', 'Accuracy', 10, true);

-- Insert 10 action plans for Compliance category
INSERT INTO public.qa_action_plans (action_text, category, display_order, is_active) VALUES
('Always verify customer identity before making account changes', 'Compliance', 11, true),
('Follow all company policies and procedures', 'Compliance', 12, true),
('Escalate issues to appropriate teams when required', 'Compliance', 13, true),
('Document all interactions and actions taken accurately', 'Compliance', 14, true),
('Protect customer data and maintain confidentiality', 'Compliance', 15, true),
('Never share internal processes or system issues with customers', 'Compliance', 16, true),
('Verify security questions before processing sensitive requests', 'Compliance', 17, true),
('Follow proper escalation procedures for complex issues', 'Compliance', 18, true),
('Maintain accurate notes and ticket updates', 'Compliance', 19, true),
('Use approved templates and messaging only', 'Compliance', 20, true);

-- Insert 10 action plans for Customer Experience category
INSERT INTO public.qa_action_plans (action_text, category, display_order, is_active) VALUES
('Always greet the customer and introduce yourself', 'Customer Experience', 21, true),
('Show empathy and understanding for customer frustrations', 'Customer Experience', 22, true),
('Actively listen and acknowledge customer concerns', 'Customer Experience', 23, true),
('Offer proactive assistance and anticipate needs', 'Customer Experience', 24, true),
('Use positive and professional language throughout', 'Customer Experience', 25, true),
('Build rapport by personalizing interactions', 'Customer Experience', 26, true),
('Properly close interactions with next steps and follow-up', 'Customer Experience', 27, true),
('Address all customer concerns in a single response when possible', 'Customer Experience', 28, true),
('Express appreciation for the customer patience and business', 'Customer Experience', 29, true),
('Maintain a helpful and solution-focused tone', 'Customer Experience', 30, true);