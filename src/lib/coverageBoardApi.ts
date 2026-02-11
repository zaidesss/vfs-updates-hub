import { supabase } from "@/integrations/supabase/client";
import { parseScheduleRange } from "@/components/coverage-board/ShiftBlock";

// ── Grid Constants ──────────────────────────────────────────────────────────
export const STICKY_COLS = 3;
export const HOURS_PER_DAY = 24;
export const DAYS_IN_WEEK = 7;
export const TOTAL_HOUR_COLS = HOURS_PER_DAY * DAYS_IN_WEEK; // 168
export const TOTAL_GRID_COLS = STICKY_COLS + TOTAL_HOUR_COLS; // 171
export const TIMELINE_START_COL = STICKY_COLS + 1; // 4 (1-indexed for CSS grid)

// ── Types ───────────────────────────────────────────────────────────────────

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
  start_date: string;
  end_date: string;
}

// ── ShiftBlock types for rendering ──────────────────────────────────────────

export type ShiftBlockType = 'regular' | 'ot' | 'dayoff' | 'outage' | 'override';

export interface RenderableBlock {
  dayOffset: number; // 0=Mon .. 6=Sun
  startHour: number; // decimal
  endHour: number;   // decimal (always > startHour, no wrapping)
  type: ShiftBlockType;
  startLabel: string;
  endLabel: string;
  isOverridden?: boolean;
  outageReason?: string;
}

// ── Day helpers ─────────────────────────────────────────────────────────────

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Our week offset: 0=Mon..6=Sun → JS day index
const OFFSET_TO_JS_DAY = [1, 2, 3, 4, 5, 6, 0];

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

// ── Display helpers ─────────────────────────────────────────────────────────

export function getDisplayName(agent: AgentScheduleRow): string {
  return agent.agent_name || agent.full_name || agent.email;
}

/**
 * Format days off as abbreviated string: "WED-THU", "SUN", or "--"
 */
export function formatDaysOff(agent: AgentScheduleRow): string {
  if (!agent.day_off || agent.day_off.length === 0) return '--';
  const abbrs = agent.day_off.map(d => d.substring(0, 3).toUpperCase());
  return abbrs.join('-');
}

/**
 * Compute daily hours label like "9x5".
 * Calculates duration for each working day, finds mode, returns "{hours}x{workingDays}".
 */
export function computeDailyHours(agent: AgentScheduleRow): string {
  const durations: number[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const jsDayIndex = OFFSET_TO_JS_DAY[offset];
    const dayName = DAY_NAMES_FULL[jsDayIndex];
    if (isDayOff(agent, dayName)) continue;

    const { schedule } = getScheduleForDay(agent, jsDayIndex);
    if (!schedule || schedule.toLowerCase() === 'day off') continue;

    const range = parseScheduleRange(schedule);
    if (!range) continue;

    let dur = range.end - range.start;
    if (dur <= 0) dur += 24; // overnight
    durations.push(Math.round(dur));
  }

  if (durations.length === 0) return '--';

  // Find mode
  const freq = new Map<number, number>();
  for (const d of durations) freq.set(d, (freq.get(d) || 0) + 1);
  let modeHours = durations[0];
  let maxCount = 0;
  for (const [h, c] of freq) {
    if (c > maxCount) { modeHours = h; maxCount = c; }
  }

  return `${modeHours}x${durations.length}`;
}

// ── Effective blocks with precedence ────────────────────────────────────────

/**
 * Returns all renderable blocks for a given agent on a given day offset.
 *
 * Precedence:
 *   1. Manual override (coverage_overrides) → replaces base schedule
 *   2. Leave/outage → overlay on top of base schedule
 *   3. Base schedule (regular + OT)
 *
 * Always returns at least one block (dayoff block if nothing else).
 */
export function getEffectiveBlocks(
  agent: AgentScheduleRow,
  dayOffset: number, // 0=Mon..6=Sun
  override?: CoverageOverride,
  leave?: LeaveForDate,
  showEffective: boolean = true,
): RenderableBlock[] {
  const jsDayIndex = OFFSET_TO_JS_DAY[dayOffset];
  const dayName = DAY_NAMES_FULL[jsDayIndex];
  const agentIsDayOff = isDayOff(agent, dayName);
  const blocks: RenderableBlock[] = [];

  // ── 1. Manual override ──
  if (showEffective && override) {
    const overrideSchedule = `${override.override_start} - ${override.override_end}`;
    const range = parseScheduleRange(overrideSchedule);
    if (range) {
      const segments = splitOvernight(range.start, range.end, dayOffset);
      for (const seg of segments) {
        blocks.push({
          ...seg,
          type: 'override',
          startLabel: override.override_start,
          endLabel: override.override_end,
          isOverridden: true,
        });
      }
    }

    // If there's an outage on top of override, add it
    if (leave) {
      const leaveRange = parseScheduleRange(`${leave.start_time} - ${leave.end_time}`);
      if (leaveRange) {
        blocks.push({
          dayOffset,
          startHour: leaveRange.start,
          endHour: leaveRange.end,
          type: 'outage',
          startLabel: leave.start_time,
          endLabel: leave.end_time,
          outageReason: leave.outage_reason,
        });
      }
    }

    return blocks;
  }

  // ── 2. Base schedule ──
  const { schedule, otSchedule } = getScheduleForDay(agent, jsDayIndex);

  if (agentIsDayOff) {
    blocks.push({
      dayOffset,
      startHour: 0,
      endHour: 24,
      type: 'dayoff',
      startLabel: 'Day Off',
      endLabel: '',
    });
  } else if (schedule && schedule.toLowerCase() !== 'day off') {
    const range = parseScheduleRange(schedule);
    if (range) {
      const segments = splitOvernight(range.start, range.end, dayOffset);
      for (const seg of segments) {
        blocks.push({
          ...seg,
          type: 'regular',
          startLabel: schedule.split(/\s*[-–]\s*/)[0] || '',
          endLabel: schedule.split(/\s*[-–]\s*/)[1] || '',
        });
      }
    }
  }

  // OT
  if (otSchedule && otSchedule.toLowerCase() !== 'day off') {
    const otRange = parseScheduleRange(otSchedule);
    if (otRange) {
      const segments = splitOvernight(otRange.start, otRange.end, dayOffset);
      for (const seg of segments) {
        blocks.push({
          ...seg,
          type: 'ot',
          startLabel: otSchedule.split(/\s*[-–]\s*/)[0] || '',
          endLabel: otSchedule.split(/\s*[-–]\s*/)[1] || '',
        });
      }
    }
  }

  // ── 3. Leave overlay ──
  if (showEffective && leave) {
    const leaveRange = parseScheduleRange(`${leave.start_time} - ${leave.end_time}`);
    if (leaveRange) {
      blocks.push({
        dayOffset,
        startHour: leaveRange.start,
        endHour: leaveRange.end,
        type: 'outage',
        startLabel: leave.start_time,
        endLabel: leave.end_time,
        outageReason: leave.outage_reason,
      });
    }
  }

  // Always return at least a dayoff block
  if (blocks.length === 0) {
    blocks.push({
      dayOffset,
      startHour: 0,
      endHour: 24,
      type: 'dayoff',
      startLabel: 'Day Off',
      endLabel: '',
    });
  }

  return blocks;
}

/**
 * Split an overnight shift into two segments. Does not render beyond Sunday (dayOffset 6).
 */
function splitOvernight(startHour: number, endHour: number, dayOffset: number): Array<{ dayOffset: number; startHour: number; endHour: number }> {
  if (endHour > startHour) {
    return [{ dayOffset, startHour, endHour }];
  }
  // Overnight: startHour > endHour
  const segments: Array<{ dayOffset: number; startHour: number; endHour: number }> = [];
  segments.push({ dayOffset, startHour, endHour: 24 });
  if (dayOffset < 6) {
    segments.push({ dayOffset: dayOffset + 1, startHour: 0, endHour });
  }
  return segments;
}

// ── Data fetching ───────────────────────────────────────────────────────────

export async function fetchAgentSchedules(): Promise<AgentScheduleRow[]> {
  const { data, error } = await supabase
    .from('agent_profiles')
    .select('id, email, agent_name, full_name, position, zendesk_instance, support_type, employment_status, day_off, mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule, mon_ot_schedule, tue_ot_schedule, wed_ot_schedule, thu_ot_schedule, fri_ot_schedule, sat_ot_schedule, sun_ot_schedule')
    .neq('employment_status', 'Terminated')
    .order('full_name');

  if (error) throw error;
  return data || [];
}

export async function fetchOverridesForWeek(startDate: string, endDate: string): Promise<CoverageOverride[]> {
  const { data, error } = await supabase
    .from('coverage_overrides')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

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

export async function fetchLeavesForWeek(startDate: string, endDate: string): Promise<LeaveForDate[]> {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('agent_email, start_time, end_time, outage_reason, start_date, end_date')
    .eq('status', 'approved')
    .lte('start_date', endDate)
    .gte('end_date', startDate);

  if (error) throw error;
  return data || [];
}

export async function fetchLeavesForDate(date: string): Promise<LeaveForDate[]> {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('agent_email, start_time, end_time, outage_reason, start_date, end_date')
    .eq('status', 'approved')
    .lte('start_date', date)
    .gte('end_date', date);

  if (error) throw error;
  return data || [];
}

// ── Grouping ────────────────────────────────────────────────────────────────

export type AgentSubGroup = {
  subLabel: string;
  agents: AgentScheduleRow[];
};

export type AgentGroup = {
  label: string;
  subGroups: AgentSubGroup[];
};

const POSITION_ORDER = ['Hybrid Support', 'Phone Support', 'Chat Support', 'Email Support'];

function getPositionSortKey(position: string | null): number {
  const idx = POSITION_ORDER.indexOf(position || '');
  return idx === -1 ? POSITION_ORDER.length : idx;
}

export function groupAgents(agents: AgentScheduleRow[]): AgentGroup[] {
  const zd1Subs = new Map<string, AgentScheduleRow[]>();
  const zd2Subs = new Map<string, AgentScheduleRow[]>();
  const logistics: AgentScheduleRow[] = [];
  const teamLeads: AgentScheduleRow[] = [];
  const techSupport: AgentScheduleRow[] = [];
  const other: AgentScheduleRow[] = [];

  for (const agent of agents) {
    const pos = agent.position || 'Unknown';
    if (pos === 'Logistics') logistics.push(agent);
    else if (pos === 'Team Lead') teamLeads.push(agent);
    else if (pos === 'Technical Support') techSupport.push(agent);
    else if (agent.zendesk_instance === 'ZD1') {
      if (!zd1Subs.has(pos)) zd1Subs.set(pos, []);
      zd1Subs.get(pos)!.push(agent);
    } else if (agent.zendesk_instance === 'ZD2') {
      if (!zd2Subs.has(pos)) zd2Subs.set(pos, []);
      zd2Subs.get(pos)!.push(agent);
    } else {
      other.push(agent);
    }
  }

  const buildSubGroups = (map: Map<string, AgentScheduleRow[]>): AgentSubGroup[] =>
    Array.from(map.entries())
      .sort(([a], [b]) => getPositionSortKey(a) - getPositionSortKey(b))
      .map(([subLabel, agents]) => ({ subLabel, agents }));

  const groups: AgentGroup[] = [];

  const zd1SubGroups = buildSubGroups(zd1Subs);
  if (zd1SubGroups.length > 0) groups.push({ label: 'ZD1', subGroups: zd1SubGroups });

  const zd2SubGroups = buildSubGroups(zd2Subs);
  if (zd2SubGroups.length > 0) groups.push({ label: 'ZD2', subGroups: zd2SubGroups });

  if (logistics.length > 0) groups.push({ label: 'Logistics', subGroups: [{ subLabel: 'Logistics Team', agents: logistics }] });
  if (teamLeads.length > 0) groups.push({ label: 'Team Lead', subGroups: [{ subLabel: 'Team Leads', agents: teamLeads }] });
  if (techSupport.length > 0) groups.push({ label: 'Technical Support', subGroups: [{ subLabel: 'Technical Team', agents: techSupport }] });
  if (other.length > 0) groups.push({ label: 'Other', subGroups: [{ subLabel: 'Uncategorized', agents: other }] });

  return groups;
}
