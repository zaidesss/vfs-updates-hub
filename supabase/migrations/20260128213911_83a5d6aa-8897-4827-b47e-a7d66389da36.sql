-- Allow all authenticated users to view all profile_status records
-- This is safe as profile_status only contains status info (not sensitive data)
-- and all team members should be able to see who is online for the Team Status Board

CREATE POLICY "Authenticated users can view all profile_status"
ON profile_status
FOR SELECT TO authenticated
USING (true);