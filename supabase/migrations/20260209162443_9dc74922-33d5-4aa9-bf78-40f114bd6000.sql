CREATE OR REPLACE VIEW public.agent_profiles_team_status AS
SELECT 
  id, email, full_name, position, employment_status,
  day_off, break_schedule,
  mon_schedule, tue_schedule, wed_schedule, thu_schedule, 
  fri_schedule, sat_schedule, sun_schedule,
  mon_ot_schedule, tue_ot_schedule, wed_ot_schedule, thu_ot_schedule, 
  fri_ot_schedule, sat_ot_schedule, sun_ot_schedule
FROM agent_profiles;