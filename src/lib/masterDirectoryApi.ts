import { supabase } from '@/integrations/supabase/client';

export interface DirectoryEntry {
  id: string;           // agent_directory.id (for save operations)
  profile_id: string;   // agent_profiles.id (for dashboard link)
  email: string;
  full_name: string | null;
  position: string | null;
  team_lead: string | null;
  zendesk_instance: string | null;
  support_account: string | null;
  support_type: string | null;
  agent_name: string | null;
  agent_tag: string | null;
  views: string[];
  ticket_assignment_view_id: string | null;
  weekday_schedule: string | null;
  weekday_total_hours: number;
  wd_ticket_assign: string | null;
  weekend_schedule: string | null;
  weekend_total_hours: number;
  we_ticket_assign: string | null;
  break_schedule: string | null;
  weekday_ot_schedule: string | null;
  weekend_ot_schedule: string | null;
  ot_total_hours: number;
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

export function validateScheduleFormat(schedule: string | null): boolean {
  if (!schedule || schedule.trim() === '') return true; // Empty is valid
  return SCHEDULE_REGEX.test(schedule.trim());
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

export function calculateTotalHours(entry: Partial<DirectoryEntry>): {
  weekday_total_hours: number;
  weekend_total_hours: number;
  ot_total_hours: number;
  overall_total_hours: number;
} {
  const weekdayHours = parseScheduleHours(entry.weekday_schedule ?? null);
  const weekendHours = parseScheduleHours(entry.weekend_schedule ?? null);
  const weekdayOtHours = parseScheduleHours(entry.weekday_ot_schedule ?? null);
  const weekendOtHours = parseScheduleHours(entry.weekend_ot_schedule ?? null);
  
  return {
    weekday_total_hours: weekdayHours,
    weekend_total_hours: weekendHours,
    ot_total_hours: weekdayOtHours + weekendOtHours,
    overall_total_hours: weekdayHours + weekendHours + weekdayOtHours + weekendOtHours,
  };
}

export async function fetchAllDirectoryEntries(): Promise<{ data: DirectoryEntry[] | null; error: string | null }> {
  try {
    // Fetch all agent profiles (including id for dashboard link)
    const { data: profiles, error: profilesError } = await supabase
      .from('agent_profiles')
      .select('id, email, full_name, position, team_lead');
    
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
        zendesk_instance: dirEntry?.zendesk_instance || null,
        support_account: dirEntry?.support_account || null,
        support_type: dirEntry?.support_type || null,
        agent_name: dirEntry?.agent_name || null,
        agent_tag: dirEntry?.agent_tag || null,
        views: dirEntry?.views || [],
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
        ot_total_hours: dirEntry?.ot_total_hours || 0,
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
      
      // Prepare data for upsert
      const upsertData = {
        email: entry.email.toLowerCase(),
        zendesk_instance: entry.zendesk_instance,
        support_account: entry.support_account,
        support_type: entry.support_type,
        agent_name: entry.agent_name,
        agent_tag: entry.agent_tag,
        views: entry.views,
        ticket_assignment_view_id: entry.ticket_assignment_view_id,
        weekday_schedule: entry.weekday_schedule,
        weekday_total_hours: hours.weekday_total_hours,
        wd_ticket_assign: entry.wd_ticket_assign,
        weekend_schedule: entry.weekend_schedule,
        weekend_total_hours: hours.weekend_total_hours,
        we_ticket_assign: entry.we_ticket_assign,
        break_schedule: entry.break_schedule,
        weekday_ot_schedule: entry.weekday_ot_schedule,
        weekend_ot_schedule: entry.weekend_ot_schedule,
        ot_total_hours: hours.ot_total_hours,
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
    'ticket_assignment_view_id',
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
