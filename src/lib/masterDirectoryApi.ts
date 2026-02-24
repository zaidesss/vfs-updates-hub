import { supabase } from '@/integrations/supabase/client';

export interface DirectoryEntry {
  id: string;           // agent_directory.id (for save operations)
  profile_id: string;   // agent_profiles.id (for dashboard link)
  email: string;
  full_name: string | null;
  position: string | null;
  team_lead: string | null;
  employment_status: string | null;  // For filtering terminated profiles
  zendesk_instance: string | null;
  support_account: string | null;
  support_type: string | null;
  agent_name: string | null;
  agent_tag: string | null;
  views: string[];
  ticket_assignment_enabled: boolean;  // Editable toggle in Master Directory
  ticket_assignment_view_id: string | null;  // Which view to pull tickets from
  weekday_schedule: string | null;
  weekday_total_hours: number;
  wd_ticket_assign: string | null;
  weekend_schedule: string | null;
  weekend_total_hours: number;
  we_ticket_assign: string | null;
  break_schedule: string | null;
  weekday_ot_schedule: string | null;
  weekend_ot_schedule: string | null;
  // Per-day OT schedules
  mon_ot_schedule: string | null;
  tue_ot_schedule: string | null;
  wed_ot_schedule: string | null;
  thu_ot_schedule: string | null;
  fri_ot_schedule: string | null;
  sat_ot_schedule: string | null;
  sun_ot_schedule: string | null;
  ot_total_hours: number;
  unpaid_break_hours: number;
  overall_total_hours: number;
  day_off: string[];
  quota: number | null;
  mon_schedule: string | null;
  tue_schedule: string | null;
  wed_schedule: string | null;
  thu_schedule: string | null;
  fri_schedule: string | null;
  sat_schedule: string | null;
  sun_schedule: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViewConfigOption {
  id: string;
  view_id: string;
  view_name: string;
  zendesk_instance: string;
  is_enabled: boolean;
}

export interface DirectoryHistoryEntry {
  id: string;
  directory_entry_id: string;
  changed_by: string;
  changes: Record<string, { old: string | null; new: string | null }>;
  changed_at: string;
}

// Default options (used as fallback if DB fetch fails)
export const DEFAULT_ZENDESK_INSTANCES = ['ZD1', 'ZD2'];
export const DEFAULT_SUPPORT_ACCOUNTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
export const DEFAULT_VIEW_OPTIONS = ['Open', 'New', 'ALL'];
export const DEFAULT_DAY_OFF_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Schedule format validation regex: "8:00 AM-5:00 PM" or "8:00AM-5:00PM"
const SCHEDULE_REGEX = /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

// Fetch dropdown options from database
export async function fetchDropdownOptions(category: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('directory_dropdown_options')
      .select('value')
      .eq('category', category)
      .eq('is_active', true)
      .order('display_order');
    
    if (error || !data || data.length === 0) {
      // Return defaults based on category
      switch (category) {
        case 'zendesk_instance':
          return DEFAULT_ZENDESK_INSTANCES;
        case 'support_account':
          return DEFAULT_SUPPORT_ACCOUNTS;
        case 'views':
          return DEFAULT_VIEW_OPTIONS;
        case 'day_off':
          return DEFAULT_DAY_OFF_OPTIONS;
        default:
          return [];
      }
    }
    
    return data.map((d: { value: string }) => d.value);
  } catch (err) {
    console.error('Error fetching dropdown options:', err);
    // Return defaults based on category
    switch (category) {
      case 'zendesk_instance':
        return DEFAULT_ZENDESK_INSTANCES;
      case 'support_account':
        return DEFAULT_SUPPORT_ACCOUNTS;
      case 'views':
        return DEFAULT_VIEW_OPTIONS;
      case 'day_off':
        return DEFAULT_DAY_OFF_OPTIONS;
      default:
        return [];
    }
  }
}

// Fetch all dropdown options at once for efficiency
export async function fetchAllDropdownOptions(): Promise<{
  zendesk_instances: string[];
  support_accounts: string[];
  view_options: string[];
  day_off_options: string[];
}> {
  const [zendesk, support, views, dayOff] = await Promise.all([
    fetchDropdownOptions('zendesk_instance'),
    fetchDropdownOptions('support_account'),
    fetchDropdownOptions('views'),
    fetchDropdownOptions('day_off'),
  ]);
  
  return {
    zendesk_instances: zendesk,
    support_accounts: support,
    view_options: views,
    day_off_options: dayOff,
  };
}

// Fetch ticket assignment view config options for dropdown
export async function fetchViewConfigOptions(): Promise<ViewConfigOption[]> {
  try {
    const { data, error } = await supabase
      .from('ticket_assignment_view_config')
      .select('id, view_id, view_name, zendesk_instance, is_enabled')
      .eq('is_enabled', true)
      .order('view_name');
    
    if (error || !data) {
      console.error('Error fetching view config options:', error);
      return [];
    }
    
    return data as ViewConfigOption[];
  } catch (err) {
    console.error('Error fetching view config options:', err);
    return [];
  }
}

export function validateScheduleFormat(schedule: string | null): boolean {
  if (!schedule || schedule.trim() === '') return true; // Empty is valid
  return SCHEDULE_REGEX.test(schedule.trim());
}

/**
 * Extract end time from a schedule string (e.g., "9:00 AM-5:30 PM" → 1050 minutes)
 */
function extractScheduleEndTimeMinutes(schedule: string | null): number | null {
  if (!schedule || schedule.trim() === '') return null;
  
  const match = schedule.trim().match(SCHEDULE_REGEX);
  if (!match) return null;
  
  const [, , , , endHour, endMin, endPeriod] = match;
  
  // Convert to 24-hour format
  let end24 = parseInt(endHour);
  if (endPeriod.toUpperCase() === 'PM' && end24 !== 12) end24 += 12;
  if (endPeriod.toUpperCase() === 'AM' && end24 === 12) end24 = 0;
  
  return end24 * 60 + parseInt(endMin);
}

/**
 * Extract start time from a schedule string (e.g., "5:30 PM-7:00 PM" → 1050 minutes)
 */
function extractScheduleStartTimeMinutes(schedule: string | null): number | null {
  if (!schedule || schedule.trim() === '') return null;
  
  const match = schedule.trim().match(SCHEDULE_REGEX);
  if (!match) return null;
  
  const [, startHour, startMin, startPeriod] = match;
  
  // Convert to 24-hour format
  let start24 = parseInt(startHour);
  if (startPeriod.toUpperCase() === 'PM' && start24 !== 12) start24 += 12;
  if (startPeriod.toUpperCase() === 'AM' && start24 === 12) start24 = 0;
  
  return start24 * 60 + parseInt(startMin);
}

/**
 * Format minutes to time string (e.g., 1050 → "5:30 PM")
 */
function formatMinutesToTime(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  return `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
}

/**
 * Validate that OT schedule does not conflict with regular schedule.
 * OT start time must be >= regular schedule end time.
 */
export function validateOTScheduleConflict(
  regularSchedule: string | null | undefined,
  otSchedule: string | null | undefined
): { isValid: boolean; error?: string; regularEndTime?: string } {
  // If either schedule is empty/invalid, skip conflict check
  if (!regularSchedule || regularSchedule.trim() === '') {
    return { isValid: true };
  }
  if (!otSchedule || otSchedule.trim() === '') {
    return { isValid: true };
  }
  
  // Skip if either has invalid format (handled by format validation)
  if (!validateScheduleFormat(regularSchedule) || !validateScheduleFormat(otSchedule)) {
    return { isValid: true };
  }
  
  const regularEndMinutes = extractScheduleEndTimeMinutes(regularSchedule);
  const otStartMinutes = extractScheduleStartTimeMinutes(otSchedule);
  
  if (regularEndMinutes === null || otStartMinutes === null) {
    return { isValid: true };
  }
  
  // OT start must be >= regular end
  if (otStartMinutes < regularEndMinutes) {
    const regularEndFormatted = formatMinutesToTime(regularEndMinutes);
    return {
      isValid: false,
      error: `OT must start at or after ${regularEndFormatted} (regular shift end)`,
      regularEndTime: regularEndFormatted
    };
  }
  
  return { isValid: true };
}

export function parseScheduleHours(schedule: string | null): number {
  if (!schedule || schedule.trim() === '') return 0;
  
  const match = schedule.trim().match(SCHEDULE_REGEX);
  if (!match) return 0;
  
  const [, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = match;
  
  // Convert to 24-hour format
  let start24 = parseInt(startHour);
  if (startPeriod.toUpperCase() === 'PM' && start24 !== 12) start24 += 12;
  if (startPeriod.toUpperCase() === 'AM' && start24 === 12) start24 = 0;
  
  let end24 = parseInt(endHour);
  if (endPeriod.toUpperCase() === 'PM' && end24 !== 12) end24 += 12;
  if (endPeriod.toUpperCase() === 'AM' && end24 === 12) end24 = 0;
  
  const startMinutes = start24 * 60 + parseInt(startMin);
  const endMinutes = end24 * 60 + parseInt(endMin);
  
  // Handle overnight shifts
  let diff = endMinutes - startMinutes;
  if (diff < 0) diff += 24 * 60;
  
  return diff / 60;
}

// Day constants for working day calculations
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKENDS = ['Sat', 'Sun'];

export function calculateTotalHours(entry: Partial<DirectoryEntry>): {
  weekday_total_hours: number;
  weekend_total_hours: number;
  ot_total_hours: number;
  unpaid_break_hours: number;
  overall_total_hours: number;
} {
  const dayOff = entry.day_off || [];
  
  // Count working days (exclude days off)
  const workingWeekdays = WEEKDAYS.filter(day => !dayOff.includes(day)).length;
  const workingWeekendDays = WEEKENDS.filter(day => !dayOff.includes(day)).length;
  
  // Parse daily hours from schedule strings
  const dailyWeekdayHours = parseScheduleHours(entry.weekday_schedule ?? null);
  const dailyWeekendHours = parseScheduleHours(entry.weekend_schedule ?? null);
  
  // Calculate OT hours from per-day OT schedules (OT can happen even on day off)
  const otSchedules = [
    { day: 'Mon', schedule: (entry as any).mon_ot_schedule },
    { day: 'Tue', schedule: (entry as any).tue_ot_schedule },
    { day: 'Wed', schedule: (entry as any).wed_ot_schedule },
    { day: 'Thu', schedule: (entry as any).thu_ot_schedule },
    { day: 'Fri', schedule: (entry as any).fri_ot_schedule },
    { day: 'Sat', schedule: (entry as any).sat_ot_schedule },
    { day: 'Sun', schedule: (entry as any).sun_ot_schedule },
  ];
  
  let otTotalHours = 0;
  otSchedules.forEach(({ schedule }) => {
    if (schedule) {
      otTotalHours += parseScheduleHours(schedule);
    }
  });
  
  // Fallback to legacy weekday_ot_schedule/weekend_ot_schedule if no per-day schedules
  if (otTotalHours === 0) {
    const weekdayOtHours = parseScheduleHours(entry.weekday_ot_schedule ?? null);
    const weekendOtHours = parseScheduleHours(entry.weekend_ot_schedule ?? null);
    otTotalHours = weekdayOtHours + weekendOtHours;
  }
  
  // Calculate weekly totals
  const weekdayTotalHours = workingWeekdays * dailyWeekdayHours;
  const weekendTotalHours = workingWeekendDays * dailyWeekendHours;
  
  // Check if break schedule has a value - only apply break deductions if it does
  const hasBreakSchedule = entry.break_schedule && entry.break_schedule.trim() !== '';
  
  let unpaidBreakHours = 0;
  if (hasBreakSchedule) {
    // Parse actual break duration from break schedule
    const breakDurationPerDay = parseScheduleHours(entry.break_schedule ?? null);
    
    // Deduct breaks for ALL scheduled working days (weekdays + weekends)
    const totalWorkingDays = workingWeekdays + workingWeekendDays;
    unpaidBreakHours = totalWorkingDays * breakDurationPerDay;
  }
  
  // Fixed weekly additions (paid activities)
  const revalidaHours = 0.5;  // 30 mins weekly - now ADDED
  const weeklyMeetingHours = 0.5;  // 30 mins weekly - NEW addition
  
  // NEW FORMULA:
  // Overall = (Weekday + Weekend + OT) - Unpaid Break + Revalida + Meeting
  const overallTotalHours = weekdayTotalHours + weekendTotalHours + otTotalHours - unpaidBreakHours + revalidaHours + weeklyMeetingHours;
  
  return {
    weekday_total_hours: weekdayTotalHours,
    weekend_total_hours: weekendTotalHours,
    ot_total_hours: otTotalHours,
    unpaid_break_hours: unpaidBreakHours,
    overall_total_hours: overallTotalHours,
  };
}

export async function fetchAllDirectoryEntries(): Promise<{ data: DirectoryEntry[] | null; error: string | null }> {
  try {
    // Fetch all agent profiles (including id for dashboard link and employment_status for filtering)
    const { data: profiles, error: profilesError } = await supabase
      .from('agent_profiles')
      .select('id, email, full_name, position, team_lead, employment_status, ticket_assignment_enabled');
    
    if (profilesError) {
      return { data: null, error: profilesError.message };
    }
    
    // Fetch all directory entries
    const { data: directoryEntries, error: directoryError } = await supabase
      .from('agent_directory')
      .select('*');
    
    if (directoryError) {
      return { data: null, error: directoryError.message };
    }
    
    // Create a map of directory entries by email
    const directoryMap = new Map<string, any>();
    (directoryEntries || []).forEach((entry: any) => {
      directoryMap.set(entry.email.toLowerCase(), entry);
    });
    
    // Merge profiles with directory data
    const mergedData: DirectoryEntry[] = (profiles || []).map((profile: any) => {
      const dirEntry = directoryMap.get(profile.email.toLowerCase());
      
      return {
        id: dirEntry?.id || '',
        profile_id: profile.id,  // agent_profiles.id for dashboard link
        email: profile.email,
        full_name: profile.full_name,
        position: profile.position,
        team_lead: profile.team_lead,
        employment_status: profile.employment_status,  // For filtering terminated profiles
        zendesk_instance: dirEntry?.zendesk_instance || null,
        support_account: dirEntry?.support_account || null,
        support_type: dirEntry?.support_type || null,
        agent_name: dirEntry?.agent_name || null,
        agent_tag: dirEntry?.agent_tag || null,
        views: dirEntry?.views || [],
        ticket_assignment_enabled: profile.ticket_assignment_enabled || false,
        ticket_assignment_view_id: dirEntry?.ticket_assignment_view_id || null,
        weekday_schedule: dirEntry?.weekday_schedule || null,
        weekday_total_hours: dirEntry?.weekday_total_hours || 0,
        wd_ticket_assign: dirEntry?.wd_ticket_assign || null,
        weekend_schedule: dirEntry?.weekend_schedule || null,
        weekend_total_hours: dirEntry?.weekend_total_hours || 0,
        we_ticket_assign: dirEntry?.we_ticket_assign || null,
        break_schedule: dirEntry?.break_schedule || null,
        weekday_ot_schedule: dirEntry?.weekday_ot_schedule || null,
        weekend_ot_schedule: dirEntry?.weekend_ot_schedule || null,
        // Per-day OT schedules
        mon_ot_schedule: dirEntry?.mon_ot_schedule || null,
        tue_ot_schedule: dirEntry?.tue_ot_schedule || null,
        wed_ot_schedule: dirEntry?.wed_ot_schedule || null,
        thu_ot_schedule: dirEntry?.thu_ot_schedule || null,
        fri_ot_schedule: dirEntry?.fri_ot_schedule || null,
        sat_ot_schedule: dirEntry?.sat_ot_schedule || null,
        sun_ot_schedule: dirEntry?.sun_ot_schedule || null,
        ot_total_hours: dirEntry?.ot_total_hours || 0,
        unpaid_break_hours: dirEntry?.unpaid_break_hours || 0,
        overall_total_hours: dirEntry?.overall_total_hours || 0,
        day_off: dirEntry?.day_off || [],
        quota: dirEntry?.quota || null,
        mon_schedule: dirEntry?.mon_schedule || null,
        tue_schedule: dirEntry?.tue_schedule || null,
        wed_schedule: dirEntry?.wed_schedule || null,
        thu_schedule: dirEntry?.thu_schedule || null,
        fri_schedule: dirEntry?.fri_schedule || null,
        sat_schedule: dirEntry?.sat_schedule || null,
        sun_schedule: dirEntry?.sun_schedule || null,
        created_at: dirEntry?.created_at || new Date().toISOString(),
        updated_at: dirEntry?.updated_at || new Date().toISOString(),
      };
    });
    
    return { data: mergedData, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function bulkSaveEntries(
  entries: DirectoryEntry[],
  originalEntries: DirectoryEntry[],
  changedBy: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const originalMap = new Map<string, DirectoryEntry>();
    originalEntries.forEach((e) => originalMap.set(e.email.toLowerCase(), e));
    
    for (const entry of entries) {
      const original = originalMap.get(entry.email.toLowerCase());
      if (!original) continue;
      
      // Check if there are actual changes
      const changes = getChanges(original, entry);
      if (Object.keys(changes).length === 0) continue;
      
      // Calculate hours
      const hours = calculateTotalHours(entry);
      
      // Prepare data for upsert (only editable fields in Master Directory)
      const upsertData = {
        email: entry.email.toLowerCase(),
        // Only WD/WE Ticket Assign and ticket_assignment_enabled are editable in Master Directory
        wd_ticket_assign: entry.wd_ticket_assign,
        we_ticket_assign: entry.we_ticket_assign,
        ticket_assignment_view_id: entry.ticket_assignment_view_id,
        // Synced from Bios (read-only in Master Directory, but need to be saved)
        zendesk_instance: entry.zendesk_instance,
        support_account: entry.support_account,
        support_type: entry.support_type,
        agent_name: entry.agent_name,
        agent_tag: entry.agent_tag,
        views: entry.views,
        weekday_schedule: entry.weekday_schedule,
        weekday_total_hours: hours.weekday_total_hours,
        weekend_schedule: entry.weekend_schedule,
        weekend_total_hours: hours.weekend_total_hours,
        break_schedule: entry.break_schedule,
        weekday_ot_schedule: entry.weekday_ot_schedule,
        weekend_ot_schedule: entry.weekend_ot_schedule,
        ot_total_hours: hours.ot_total_hours,
        unpaid_break_hours: hours.unpaid_break_hours,
        overall_total_hours: hours.overall_total_hours,
        day_off: entry.day_off,
        quota: entry.quota,
        mon_schedule: entry.mon_schedule,
        tue_schedule: entry.tue_schedule,
        wed_schedule: entry.wed_schedule,
        thu_schedule: entry.thu_schedule,
        fri_schedule: entry.fri_schedule,
        sat_schedule: entry.sat_schedule,
        sun_schedule: entry.sun_schedule,
      };
      
      // Upsert the directory entry
      const { data: upsertedEntry, error: upsertError } = await supabase
        .from('agent_directory')
        .upsert(upsertData, { onConflict: 'email' })
        .select()
        .single();
      
      if (upsertError) {
        return { success: false, error: upsertError.message };
      }
      
      // Record history
      if (upsertedEntry) {
        const { error: historyError } = await supabase
          .from('agent_directory_history')
          .insert({
            directory_entry_id: upsertedEntry.id,
            changed_by: changedBy,
            changes,
          });
        
        if (historyError) {
          console.error('Failed to record history:', historyError.message);
          // Don't fail the save for history error
        }
      }
    }
    
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function getChanges(
  original: DirectoryEntry,
  updated: DirectoryEntry
): Record<string, { old: any; new: any }> {
const fieldsToTrack = [
    'zendesk_instance',
    'support_account',
    'support_type',
    'agent_name',
    'agent_tag',
    'views',
    'weekday_schedule',
    'wd_ticket_assign',
    'weekend_schedule',
    'we_ticket_assign',
    'break_schedule',
    'weekday_ot_schedule',
    'weekend_ot_schedule',
    'day_off',
    'quota',
    'mon_schedule',
    'tue_schedule',
    'wed_schedule',
    'thu_schedule',
    'fri_schedule',
    'sat_schedule',
    'sun_schedule',
    'ticket_assignment_enabled',
    'ticket_assignment_view_id',
  ] as const;
  
  const changes: Record<string, { old: any; new: any }> = {};
  
  for (const field of fieldsToTrack) {
    const oldVal = original[field];
    const newVal = updated[field];
    
    // Handle array comparison
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[field] = { old: oldVal, new: newVal };
      }
    } else if (oldVal !== newVal) {
      changes[field] = { old: oldVal, new: newVal };
    }
  }
  
  return changes;
}

export async function fetchDirectoryHistory(
  entryId: string
): Promise<{ data: DirectoryHistoryEntry[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('agent_directory_history')
      .select('*')
      .eq('directory_entry_id', entryId)
      .order('changed_at', { ascending: false });
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    return { data: data as DirectoryHistoryEntry[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// Sync all profiles from agent_profiles to agent_directory
export async function syncAllProfilesToDirectory(): Promise<{ 
  success: boolean; 
  synced: number; 
  error: string | null 
}> {
  try {
    // Fetch all profiles with work configuration data
    const { data: profiles, error: profilesError } = await supabase
      .from('agent_profiles')
      .select('email, agent_name, agent_tag, zendesk_instance, support_account, support_type, views, quota_email, quota_chat, quota_phone, mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule, break_schedule, weekday_ot_schedule, weekend_ot_schedule, mon_ot_schedule, tue_ot_schedule, wed_ot_schedule, thu_ot_schedule, fri_ot_schedule, sat_ot_schedule, sun_ot_schedule, day_off, upwork_contract_id, ticket_assignment_view_id, ticket_assignment_enabled');
    
    if (profilesError) {
      return { success: false, synced: 0, error: profilesError.message };
    }
    
    let syncedCount = 0;
    
    for (const profile of profiles || []) {
      const email = profile.email.toLowerCase();
      
      // Calculate quota
      const quota = (profile.quota_email || 0) + (profile.quota_chat || 0) + (profile.quota_phone || 0);
      
      // Prepare sync data
      const syncData = {
        email,
        agent_name: profile.agent_name || null,
        agent_tag: profile.agent_tag || null,
        zendesk_instance: profile.zendesk_instance || null,
        support_account: profile.support_account || null,
        support_type: Array.isArray(profile.support_type) ? profile.support_type.join(', ') : null,
        views: profile.views || [],
        quota: quota || null,
        mon_schedule: profile.mon_schedule || null,
        tue_schedule: profile.tue_schedule || null,
        wed_schedule: profile.wed_schedule || null,
        thu_schedule: profile.thu_schedule || null,
        fri_schedule: profile.fri_schedule || null,
        sat_schedule: profile.sat_schedule || null,
        sun_schedule: profile.sun_schedule || null,
        break_schedule: profile.break_schedule || null,
        // Derive weekday OT summary from first available Mon-Fri OT schedule
        weekday_ot_schedule: profile.mon_ot_schedule || profile.tue_ot_schedule || 
                             profile.wed_ot_schedule || profile.thu_ot_schedule || 
                             profile.fri_ot_schedule || null,
        // Derive weekend OT summary from first available Sat-Sun OT schedule
        weekend_ot_schedule: profile.sat_ot_schedule || profile.sun_ot_schedule || null,
        // Per-day OT schedules
        mon_ot_schedule: profile.mon_ot_schedule || null,
        tue_ot_schedule: profile.tue_ot_schedule || null,
        wed_ot_schedule: profile.wed_ot_schedule || null,
        thu_ot_schedule: profile.thu_ot_schedule || null,
        fri_ot_schedule: profile.fri_ot_schedule || null,
        sat_ot_schedule: profile.sat_ot_schedule || null,
        sun_ot_schedule: profile.sun_ot_schedule || null,
        day_off: profile.day_off || [],
        upwork_contract_id: profile.upwork_contract_id || null,
        ticket_assignment_view_id: profile.ticket_assignment_enabled ? profile.ticket_assignment_view_id : null,
        // Find first available weekday schedule (not just Monday - handles day off)
        weekday_schedule: profile.mon_schedule || profile.tue_schedule || profile.wed_schedule || 
                          profile.thu_schedule || profile.fri_schedule || null,
        // Find first available weekend schedule (not just Saturday - handles day off)
        weekend_schedule: profile.sat_schedule || profile.sun_schedule || null,
      };
      
      // Calculate hours (pass per-day OT schedules for new calculation)
      const hours = calculateTotalHours({
        weekday_schedule: syncData.weekday_schedule,
        weekend_schedule: syncData.weekend_schedule,
        weekday_ot_schedule: syncData.weekday_ot_schedule,
        weekend_ot_schedule: syncData.weekend_ot_schedule,
        break_schedule: syncData.break_schedule,
        day_off: syncData.day_off,
        mon_ot_schedule: syncData.mon_ot_schedule,
        tue_ot_schedule: syncData.tue_ot_schedule,
        wed_ot_schedule: syncData.wed_ot_schedule,
        thu_ot_schedule: syncData.thu_ot_schedule,
        fri_ot_schedule: syncData.fri_ot_schedule,
        sat_ot_schedule: syncData.sat_ot_schedule,
        sun_ot_schedule: syncData.sun_ot_schedule,
      } as any);
      
      // Upsert to agent_directory
      const { error: upsertError } = await supabase
        .from('agent_directory')
        .upsert({
          ...syncData,
          weekday_total_hours: hours.weekday_total_hours,
          weekend_total_hours: hours.weekend_total_hours,
          ot_total_hours: hours.ot_total_hours,
          unpaid_break_hours: hours.unpaid_break_hours,
          overall_total_hours: hours.overall_total_hours,
        }, { onConflict: 'email' });
      
      if (!upsertError) {
        syncedCount++;
      } else {
        console.error(`Failed to sync ${email}:`, upsertError);
      }
    }
    
    return { success: true, synced: syncedCount, error: null };
  } catch (err: any) {
    console.error('Sync all profiles failed:', err);
    return { success: false, synced: 0, error: err.message };
  }
}
