-- Add unpaid_break_hours column to agent_directory for tracking break deductions
ALTER TABLE agent_directory 
ADD COLUMN unpaid_break_hours NUMERIC DEFAULT 0;