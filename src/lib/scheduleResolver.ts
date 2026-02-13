/**
 * Unified Schedule Resolver
 * 
 * ALL modules must use this to look up schedules instead of reading
 * agent_profiles or agent_directory directly.
 * 
 * Precedence:
 *   1. coverage_overrides (date-specific)
 *   2. agent_schedule_assignments (effective-dated base)
 *   3. agent_profiles (fallback for pre-migration dates)
 */

import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek } from 'date-fns';

export interface EffectiveSchedule {
  schedule: string | null;
  otSchedule: string | null;
  isDayOff: boolean;
  isOverride: boolean;
  overrideReason: string | null;
  breakSchedule: string | null;
  quotaEmail: number | null;
  quotaChat: number | null;
  quotaPhone: number | null;
  quotaOtEmail: number | null;
}

export interface EffectiveDaySchedule extends EffectiveSchedule {
  dayDate: string;
  dayName: string;
}

// In-memory cache keyed by "agentId:date"
const scheduleCache = new Map<string, EffectiveSchedule>();
const weekCache = new Map<string, EffectiveDaySchedule[]>();

/** Clear all cached schedule data (call on navigation or data mutation) */
export function clearScheduleCache(): void {
  scheduleCache.clear();
  weekCache.clear();
}

/**
 * Get the effective schedule for a single agent on a single date.
 * Uses the get_effective_schedule RPC which resolves:
 *   coverage_overrides > agent_schedule_assignments > agent_profiles
 */
export async function getEffectiveScheduleForDate(
  agentId: string,
  date: Date | string
): Promise<EffectiveSchedule> {
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
  const cacheKey = `${agentId}:${dateStr}`;

  const cached = scheduleCache.get(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.rpc('get_effective_schedule', {
    p_agent_id: agentId,
    p_target_date: dateStr,
  });

  if (error || !data || data.length === 0) {
    console.error('Failed to get effective schedule:', error?.message);
    return {
      schedule: null,
      otSchedule: null,
      isDayOff: true,
      isOverride: false,
      overrideReason: null,
      breakSchedule: null,
      quotaEmail: null,
      quotaChat: null,
      quotaPhone: null,
      quotaOtEmail: null,
    };
  }

  const row = data[0];
  const result: EffectiveSchedule = {
    schedule: row.effective_schedule,
    otSchedule: row.effective_ot_schedule,
    isDayOff: row.is_day_off,
    isOverride: row.is_override,
    overrideReason: row.override_reason,
    breakSchedule: row.effective_break_schedule,
    quotaEmail: row.effective_quota_email,
    quotaChat: row.effective_quota_chat,
    quotaPhone: row.effective_quota_phone,
    quotaOtEmail: row.effective_quota_ot_email,
  };

  scheduleCache.set(cacheKey, result);
  return result;
}

/**
 * Get the effective schedule for an entire week (Mon-Sun).
 * Uses the get_effective_schedules_for_week RPC for efficiency.
 */
export async function getEffectiveSchedulesForWeek(
  agentId: string,
  weekStart: Date | string
): Promise<EffectiveDaySchedule[]> {
  const weekStartStr = typeof weekStart === 'string'
    ? weekStart
    : format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const weekCacheKey = `${agentId}:week:${weekStartStr}`;
  const cached = weekCache.get(weekCacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.rpc('get_effective_schedules_for_week', {
    p_agent_id: agentId,
    p_week_start: weekStartStr,
  });

  if (error || !data) {
    console.error('Failed to get effective schedules for week:', error?.message);
    return [];
  }

  const results: EffectiveDaySchedule[] = data.map((row: any) => {
    const dayResult: EffectiveDaySchedule = {
      dayDate: row.day_date,
      dayName: row.day_name,
      schedule: row.effective_schedule,
      otSchedule: row.effective_ot_schedule,
      isDayOff: row.is_day_off,
      isOverride: row.is_override,
      overrideReason: row.override_reason,
      breakSchedule: row.effective_break_schedule,
      quotaEmail: row.effective_quota_email,
      quotaChat: row.effective_quota_chat,
      quotaPhone: row.effective_quota_phone,
      quotaOtEmail: row.effective_quota_ot_email,
    };

    // Also populate the per-date cache
    const dateCacheKey = `${agentId}:${row.day_date}`;
    scheduleCache.set(dateCacheKey, dayResult);

    return dayResult;
  });

  weekCache.set(weekCacheKey, results);
  return results;
}

/**
 * Helper: Get scheduled days count for a week (non-day-off days with a schedule).
 * Used by Scorecard and other modules.
 */
export async function getScheduledDaysForWeek(
  agentId: string,
  weekStart: Date | string
): Promise<number> {
  const days = await getEffectiveSchedulesForWeek(agentId, weekStart);
  return days.filter(d => !d.isDayOff && d.schedule && d.schedule !== 'Day Off').length;
}

/**
 * Helper: Get the next Monday from today in EST.
 * Used when creating schedule assignments from profile edits.
 */
export function getNextMondayEST(): string {
  const now = new Date();
  // Convert to EST
  const estStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const estDate = new Date(estStr);
  const currentMonday = startOfWeek(estDate, { weekStartsOn: 1 });
  const nextMonday = new Date(currentMonday);
  nextMonday.setDate(nextMonday.getDate() + 7);
  return format(nextMonday, 'yyyy-MM-dd');
}

/**
 * Helper: Get current Monday in EST.
 */
export function getCurrentMondayEST(): string {
  const now = new Date();
  const estStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const estDate = new Date(estStr);
  const currentMonday = startOfWeek(estDate, { weekStartsOn: 1 });
  return format(currentMonday, 'yyyy-MM-dd');
}

/**
 * Create or update a schedule assignment for a specific week.
 * Used when saving profile schedule changes (targets next week).
 */
export async function upsertScheduleAssignment(params: {
  agentId: string;
  effectiveWeekStart: string;
  monSchedule?: string | null;
  tueSchedule?: string | null;
  wedSchedule?: string | null;
  thuSchedule?: string | null;
  friSchedule?: string | null;
  satSchedule?: string | null;
  sunSchedule?: string | null;
  monOtSchedule?: string | null;
  tueOtSchedule?: string | null;
  wedOtSchedule?: string | null;
  thuOtSchedule?: string | null;
  friOtSchedule?: string | null;
  satOtSchedule?: string | null;
  sunOtSchedule?: string | null;
  dayOff?: string[] | null;
  breakSchedule?: string | null;
  otEnabled?: boolean;
  quotaEmail?: number | null;
  quotaChat?: number | null;
  quotaPhone?: number | null;
  quotaOtEmail?: number | null;
  source?: string;
  createdBy?: string;
  notes?: string;
}): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('agent_schedule_assignments')
    .upsert({
      agent_id: params.agentId,
      effective_week_start: params.effectiveWeekStart,
      mon_schedule: params.monSchedule ?? null,
      tue_schedule: params.tueSchedule ?? null,
      wed_schedule: params.wedSchedule ?? null,
      thu_schedule: params.thuSchedule ?? null,
      fri_schedule: params.friSchedule ?? null,
      sat_schedule: params.satSchedule ?? null,
      sun_schedule: params.sunSchedule ?? null,
      mon_ot_schedule: params.monOtSchedule ?? null,
      tue_ot_schedule: params.tueOtSchedule ?? null,
      wed_ot_schedule: params.wedOtSchedule ?? null,
      thu_ot_schedule: params.thuOtSchedule ?? null,
      fri_ot_schedule: params.friOtSchedule ?? null,
      sat_ot_schedule: params.satOtSchedule ?? null,
      sun_ot_schedule: params.sunOtSchedule ?? null,
      day_off: params.dayOff ?? [],
      break_schedule: params.breakSchedule ?? null,
      ot_enabled: params.otEnabled ?? false,
      quota_email: params.quotaEmail ?? null,
      quota_chat: params.quotaChat ?? null,
      quota_phone: params.quotaPhone ?? null,
      quota_ot_email: params.quotaOtEmail ?? null,
      source: params.source ?? 'agent_profile',
      created_by: params.createdBy ?? user?.email ?? 'unknown',
      notes: params.notes ?? null,
    }, { onConflict: 'agent_id,effective_week_start' });

  if (error) {
    return { error: error.message };
  }

  // Invalidate cache for this agent
  clearScheduleCache();
  return { error: null };
}
