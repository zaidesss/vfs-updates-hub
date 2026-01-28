-- Allow all authenticated users to view agent_profiles for Team Status Board
CREATE POLICY "Authenticated users can view all agent_profiles for team status"
ON agent_profiles
FOR SELECT TO authenticated
USING (true);

-- Allow all authenticated users to view agent_directory for Team Status Board
CREATE POLICY "Authenticated users can view all agent_directory for team status"
ON agent_directory
FOR SELECT TO authenticated
USING (true);