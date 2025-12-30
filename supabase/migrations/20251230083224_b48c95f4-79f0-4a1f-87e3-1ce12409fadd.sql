-- Remove existing admin seeds with real emails and replace with generic ones
DELETE FROM public.user_roles WHERE email IN (
  'hr@virtualfreelancesolutions.com',
  'jaeransanchez@gmail.com',
  'dzaydee06@gmail.com',
  'joanargao@gmail.com',
  'salmeromalcomeduc@gmail.com',
  'mjesguerraiman@gmail.com'
);

-- Insert generic admin placeholder (real admins should be added via secure process)
INSERT INTO public.user_roles (email, role) 
VALUES ('admin@example.com', 'admin')
ON CONFLICT (email) DO NOTHING;