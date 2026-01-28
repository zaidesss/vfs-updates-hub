-- Drop and recreate the "Users can" policies for profile_status
DROP POLICY IF EXISTS "Users can insert own profile_status" ON profile_status;
DROP POLICY IF EXISTS "Users can update own profile_status" ON profile_status;
DROP POLICY IF EXISTS "Users can view own profile_status" ON profile_status;

CREATE POLICY "Users can insert own profile_status" ON profile_status
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM agent_profiles ap
    WHERE ap.id = profile_status.profile_id
    AND ap.email = lower((current_setting('request.jwt.claims', true)::json->>'email'))
  )
);

CREATE POLICY "Users can update own profile_status" ON profile_status
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM agent_profiles ap
    WHERE ap.id = profile_status.profile_id
    AND ap.email = lower((current_setting('request.jwt.claims', true)::json->>'email'))
  )
);

CREATE POLICY "Users can view own profile_status" ON profile_status
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM agent_profiles ap
    WHERE ap.id = profile_status.profile_id
    AND ap.email = lower((current_setting('request.jwt.claims', true)::json->>'email'))
  )
);

-- Same for profile_events
DROP POLICY IF EXISTS "Users can insert own profile_events" ON profile_events;
DROP POLICY IF EXISTS "Users can view own profile_events" ON profile_events;

CREATE POLICY "Users can insert own profile_events" ON profile_events
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM agent_profiles ap
    WHERE ap.id = profile_events.profile_id
    AND ap.email = lower((current_setting('request.jwt.claims', true)::json->>'email'))
  )
);

CREATE POLICY "Users can view own profile_events" ON profile_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM agent_profiles ap
    WHERE ap.id = profile_events.profile_id
    AND ap.email = lower((current_setting('request.jwt.claims', true)::json->>'email'))
  )
);

-- Add policy for users to see their own agent_directory row
CREATE POLICY "Users can view own agent_directory" ON agent_directory
FOR SELECT USING (
  email = lower((current_setting('request.jwt.claims', true)::json->>'email'))
);