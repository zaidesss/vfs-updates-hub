import { supabase } from '@/integrations/supabase/client';

export type ProfileStatus = 'LOGGED_OUT' | 'LOGGED_IN' | 'ON_BREAK' | 'COACHING';
export type EventType = 'LOGIN' | 'LOGOUT' | 'BREAK_IN' | 'BREAK_OUT' | 'COACHING_START' | 'COACHING_END';

export interface DashboardProfile {
  id: string;                    // from agent_profiles
  email: string;                 // from agent_profiles
  full_name: string | null;      // from agent_profiles
  agent_name: string | null;     // from agent_directory (fallback to full_name)
  zendesk_instance: string | null;
  support_account: string | null;
  support_type: string | null;
  ticket_assignment_view_id: string | null;
  break_schedule: string | null;
  quota: number | null;
  weekday_schedule: string | null;
  weekend_schedule: string | null;
  day_off: string[];
  mon_schedule: string | null;
  tue_schedule: string | null;
  wed_schedule: string | null;
  thu_schedule: string | null;
  fri_schedule: string | null;
  sat_schedule: string | null;
  sun_schedule: string | null;
}

export interface ProfileStatusRecord {
  id: string;
  profile_id: string;
  current_status: ProfileStatus;
  status_since: string;
}

export interface ProfileEvent {
  id: string;
  profile_id: string;
  event_type: EventType;
  prev_status: ProfileStatus;
  new_status: ProfileStatus;
  triggered_by: string;
  created_at: string;
}

// Valid state transitions map
const VALID_TRANSITIONS: Record<ProfileStatus, Record<EventType, ProfileStatus | null>> = {
  LOGGED_OUT: {
    LOGIN: 'LOGGED_IN',
    LOGOUT: null,
    BREAK_IN: null,
    BREAK_OUT: null,
    COACHING_START: null,
    COACHING_END: null,
  },
  LOGGED_IN: {
    LOGIN: null,
    LOGOUT: 'LOGGED_OUT',
    BREAK_IN: 'ON_BREAK',
    BREAK_OUT: null,
    COACHING_START: 'COACHING',
    COACHING_END: null,
  },
  ON_BREAK: {
    LOGIN: null,
    LOGOUT: null,
    BREAK_IN: null,
    BREAK_OUT: 'LOGGED_IN',
    COACHING_START: null,
    COACHING_END: null,
  },
  COACHING: {
    LOGIN: null,
    LOGOUT: null,
    BREAK_IN: null,
    BREAK_OUT: null,
    COACHING_START: null,
    COACHING_END: 'LOGGED_IN',
  },
};

export function isValidTransition(currentStatus: ProfileStatus, eventType: EventType): ProfileStatus | null {
  return VALID_TRANSITIONS[currentStatus]?.[eventType] ?? null;
}

export async function fetchDashboardProfile(profileId: string): Promise<{ data: DashboardProfile | null; error: string | null }> {
  try {
    // 1. Fetch identity from agent_profiles (source of truth)
    const { data: profile, error: profileError } = await supabase
      .from('agent_profiles')
      .select('id, email, full_name')
      .eq('id', profileId)
      .single();

    if (profileError) {
      return { data: null, error: profileError.message };
    }

    if (!profile) {
      return { data: null, error: 'Profile not found' };
    }

    // 2. Fetch operational data from agent_directory using email
    const { data: directory } = await supabase
      .from('agent_directory')
      .select('agent_name, zendesk_instance, support_account, support_type, ticket_assignment_view_id, break_schedule, quota, weekday_schedule, weekend_schedule, day_off, mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule')
      .eq('email', profile.email)
      .maybeSingle();

    // 3. Merge and return - use directory data where available, fallback to defaults
    const dashboardProfile: DashboardProfile = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      agent_name: directory?.agent_name || profile.full_name,
      zendesk_instance: directory?.zendesk_instance || null,
      support_account: directory?.support_account || null,
      support_type: directory?.support_type || null,
      ticket_assignment_view_id: directory?.ticket_assignment_view_id || null,
      break_schedule: directory?.break_schedule || null,
      quota: directory?.quota || null,
      weekday_schedule: directory?.weekday_schedule || null,
      weekend_schedule: directory?.weekend_schedule || null,
      day_off: directory?.day_off || [],
      mon_schedule: directory?.mon_schedule || null,
      tue_schedule: directory?.tue_schedule || null,
      wed_schedule: directory?.wed_schedule || null,
      thu_schedule: directory?.thu_schedule || null,
      fri_schedule: directory?.fri_schedule || null,
      sat_schedule: directory?.sat_schedule || null,
      sun_schedule: directory?.sun_schedule || null,
    };

    return { data: dashboardProfile, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function getProfileStatus(profileId: string): Promise<{ data: ProfileStatusRecord | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('profile_status')
      .select('*')
      .eq('profile_id', profileId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return { data: null, error: error.message };
    }

    // If no status exists, return default LOGGED_OUT
    if (!data) {
      return { 
        data: {
          id: '',
          profile_id: profileId,
          current_status: 'LOGGED_OUT' as ProfileStatus,
          status_since: new Date().toISOString(),
        }, 
        error: null 
      };
    }

    return { data: data as ProfileStatusRecord, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function updateProfileStatus(
  profileId: string,
  eventType: EventType,
  triggeredBy: string
): Promise<{ success: boolean; newStatus: ProfileStatus | null; error: string | null }> {
  try {
    // First get current status
    const { data: currentStatusData, error: fetchError } = await getProfileStatus(profileId);
    
    if (fetchError) {
      return { success: false, newStatus: null, error: fetchError };
    }

    const currentStatus = currentStatusData?.current_status || 'LOGGED_OUT';
    
    // Validate transition
    const newStatus = isValidTransition(currentStatus, eventType);
    if (!newStatus) {
      return { 
        success: false, 
        newStatus: null, 
        error: `Invalid transition: Cannot perform ${eventType} from ${currentStatus}` 
      };
    }

    const now = new Date().toISOString();

    // Check if status record exists
    const { data: existingStatus } = await supabase
      .from('profile_status')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (existingStatus) {
      // Update existing status with optimistic locking
      const { error: updateError } = await supabase
        .from('profile_status')
        .update({
          current_status: newStatus,
          status_since: now,
        })
        .eq('profile_id', profileId)
        .eq('current_status', currentStatus); // Optimistic lock

      if (updateError) {
        return { success: false, newStatus: null, error: updateError.message };
      }
    } else {
      // Insert new status record
      const { error: insertError } = await supabase
        .from('profile_status')
        .insert({
          profile_id: profileId,
          current_status: newStatus,
          status_since: now,
        });

      if (insertError) {
        return { success: false, newStatus: null, error: insertError.message };
      }
    }

    // Record event in audit log
    const { error: eventError } = await supabase
      .from('profile_events')
      .insert({
        profile_id: profileId,
        event_type: eventType,
        prev_status: currentStatus,
        new_status: newStatus,
        triggered_by: triggeredBy,
        created_at: now,
      });

    if (eventError) {
      console.error('Failed to record event:', eventError.message);
      // Don't fail the operation for event logging errors
    }

    return { success: true, newStatus, error: null };
  } catch (err: any) {
    return { success: false, newStatus: null, error: err.message };
  }
}

export async function getProfileEvents(
  profileId: string,
  limit: number = 10
): Promise<{ data: ProfileEvent[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('profile_events')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ProfileEvent[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function getAllProfiles(): Promise<{ data: DashboardProfile[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('agent_directory')
      .select('id, email, agent_name, zendesk_instance, support_account, support_type, ticket_assignment_view_id, break_schedule, quota, weekday_schedule, weekend_schedule, day_off, mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule')
      .order('agent_name');

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as DashboardProfile[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}
