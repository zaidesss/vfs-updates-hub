import { supabase } from "@/integrations/supabase/client";

export interface AgentScheduleRow {
  id: string;
  email: string;
  agent_name: string | null;
  full_name: string | null;
  position: string | null;
  zendesk_instance: string | null;
  support_type: string[] | null;
  employment_status: string | null;
  day_off: string[] | null;
  mon_schedule: string | null;
  tue_schedule: string | null;
  wed_schedule: string | null;
  thu_schedule: string | null;
  fri_schedule: string | null;
  sat_schedule: string | null;
  sun_schedule: string | null;
  mon_ot_schedule: string | null;
  tue_ot_schedule: string | null;
  wed_ot_schedule: string | null;
  thu_ot_schedule: string | null;
  fri_ot_schedule: string | null;
  sat_ot_schedule: string | null;
  sun_ot_schedule: string | null;
}

export interface CoverageOverride {
  id: string;
  agent_id: string;
  date: string;
  override_start: string;
  override_end: string;
  reason: string;
  created_by: string | null;
  created_at: string;
}

export interface LeaveForDate {
  agent_email: string;
  start_time: string;
  end_time: string;
  outage_reason: string;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export function getScheduleForDay(agent: AgentScheduleRow, dayIndex: number): { schedule: string | null; otSchedule: string | null } {
  const day = DAY_KEYS[dayIndex];
  const schedule = agent[`${day}_schedule` as keyof AgentScheduleRow] as string | null;
  const otSchedule = agent[`${day}_ot_schedule` as keyof AgentScheduleRow] as string | null;
  return { schedule, otSchedule };
}

export function isDayOff(agent: AgentScheduleRow, dayName: string): boolean {
  if (!agent.day_off) return false;
  return agent.day_off.some(d => d.toLowerCase() === dayName.toLowerCase());
}

export async function fetchAgentSchedules(): Promise<AgentScheduleRow[]> {
  const { data, error } = await supabase
    .from('agent_profiles')
    .select('id, email, agent_name, full_name, position, zendesk_instance, support_type, employment_status, day_off, mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule, mon_ot_schedule, tue_ot_schedule, wed_ot_schedule, thu_ot_schedule, fri_ot_schedule, sat_ot_schedule, sun_ot_schedule')
    .neq('employment_status', 'Terminated')
    .order('full_name');

  if (error) throw error;
  return data || [];
}

export async function fetchOverridesForDate(date: string): Promise<CoverageOverride[]> {
  const { data, error } = await supabase
    .from('coverage_overrides')
    .select('*')
    .eq('date', date);

  if (error) throw error;
  return data || [];
}

export async function upsertOverride(override: {
  agent_id: string;
  date: string;
  override_start: string;
  override_end: string;
  reason?: string;
  created_by: string;
}): Promise<CoverageOverride> {
  const { data, error } = await supabase
    .from('coverage_overrides')
    .upsert(
      {
        agent_id: override.agent_id,
        date: override.date,
        override_start: override.override_start,
        override_end: override.override_end,
        reason: override.reason || 'manual',
        created_by: override.created_by,
      },
      { onConflict: 'agent_id,date' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteOverride(id: string): Promise<void> {
  const { error } = await supabase
    .from('coverage_overrides')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function fetchLeavesForDate(date: string): Promise<LeaveForDate[]> {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('agent_email, start_time, end_time, outage_reason')
    .eq('status', 'approved')
    .lte('start_date', date)
    .gte('end_date', date);

  if (error) throw error;
  return data || [];
}

// Group agents by ZD instance + position
export type AgentGroup = {
  label: string;
  agents: AgentScheduleRow[];
};

export function groupAgents(agents: AgentScheduleRow[]): AgentGroup[] {
  const groupMap = new Map<string, AgentScheduleRow[]>();

  for (const agent of agents) {
    const zd = agent.zendesk_instance || 'Unknown';
    const pos = agent.position || 'Unknown';
    const key = `${zd} - ${pos}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(agent);
  }

  // Sort groups alphabetically
  return Array.from(groupMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, agents]) => ({ label, agents }));
}
