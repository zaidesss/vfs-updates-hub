import { supabase } from '@/integrations/supabase/client';
import { resolvePositionCategory } from '@/lib/positionUtils';
import { startOfWeek, endOfWeek, format, parseISO, isAfter, isBefore, isEqual, addMinutes } from 'date-fns';
import { parseScheduleRange as parseScheduleRangeMinutes, getESTDateFromTimestamp, getCurrentESTTimeMinutes, getTodayEST, parseDateStringLocal } from '@/lib/timezoneUtils';

/**
 * Determine if a week should be read from snapshots (older than 2 weeks) or live tables
 */
export function getDataSourceForWeek(weekStart: Date): 'snapshot' | 'live' {
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  return weekStart < twoWeeksAgo ? 'snapshot' : 'live';
}

export type ProfileStatus = 'LOGGED_OUT' | 'LOGGED_IN' | 'ON_BREAK' | 'COACHING' | 'RESTARTING' | 'ON_BIO' | 'ON_OT';
export type EventType = 'LOGIN' | 'LOGOUT' | 'BREAK_IN' | 'BREAK_OUT' | 'COACHING_START' | 'COACHING_END' | 'DEVICE_RESTART_START' | 'DEVICE_RESTART_END' | 'BIO_START' | 'BIO_END' | 'OT_LOGIN' | 'OT_LOGOUT';

export type AttendanceStatus = 
  | 'present'     // Green - logged in on time
  | 'late'        // Yellow - logged in > 10 min after schedule
  | 'absent'      // Red - working day, no login, no leave
  | 'pending'     // Grey - today/future, no login yet
  | 'day_off'     // Grey - scheduled day off
  | 'on_leave'    // Blue - approved leave (with leave type)
  | 'early_out';  // Red - logged out before shift ends

export interface DayAttendance {
  date: Date;
  dayKey: string;
  status: AttendanceStatus;
  leaveType?: string;
  loginTime?: string;
  logoutTime?: string;
  scheduleStart?: string;
  scheduleEnd?: string;      // Parsed end time for early out detection
  isEarlyOut?: boolean;      // true if logged out before shift end
  noLogout?: boolean;        // true if past day with login but no logout
  hoursWorked?: string;      // Formatted duration "Xh Ym"
  hoursWorkedMinutes?: number; // Raw minutes for calculations
  // Break tracking
  breakDurationMinutes?: number;  // Total break time taken
  breakDuration?: string;         // Formatted break time "Xm"
  allowedBreakMinutes?: number;   // Allowed break from schedule
  allowedBreak?: string;          // Formatted allowed break "Xm"
  isOverbreak?: boolean;          // true if break > allowed + grace
  breakOverageMinutes?: number;   // How many minutes over (if overbreak)
  // OT tracking
  otSchedule?: string;            // Expected OT schedule for this day
  otLoginTime?: string;           // Actual OT login time
  otLogoutTime?: string;          // Actual OT logout time
  otStatus?: 'present_ot' | 'late_ot' | 'absent_ot' | 'pending_ot';
  otHoursWorkedMinutes?: number;  // OT hours worked in minutes
  otTicketCount?: number;         // OT tickets handled on this day (from snapshots)
  effectiveQuotaOtEmail?: number | null; // Effective-dated OT quota from snapshot
  isNcns?: boolean;               // true if NCNS report exists for this absent day
}

/**
 * Format a date to 12-hour EST/EDT time format (e.g., "3:15 PM")
 */
export function formatTimeInEST(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export interface ApprovedLeave {
  id: string;
  start_date: string;
  end_date: string;
  outage_reason: string;
  status: string;
}

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
  upwork_contract_id: string | null;
  upwork_contract_type: string[] | null;
  ot_enabled: boolean;
  mon_schedule: string | null;
  tue_schedule: string | null;
  wed_schedule: string | null;
  thu_schedule: string | null;
  fri_schedule: string | null;
  sat_schedule: string | null;
  sun_schedule: string | null;
  // Per-day OT schedules
  mon_ot_schedule: string | null;
  tue_ot_schedule: string | null;
  wed_ot_schedule: string | null;
  thu_ot_schedule: string | null;
  fri_ot_schedule: string | null;
  sat_ot_schedule: string | null;
  sun_ot_schedule: string | null;
  // Position-specific quotas from agent_profiles
  position: string[] | null;
  quota_email: number | null;
  quota_chat: number | null;
  quota_phone: number | null;
  quota_ot_email: number | null;
}

export interface ProfileStatusRecord {
  id: string;
  profile_id: string;
  current_status: ProfileStatus;
  status_since: string | null;
  bio_time_remaining_seconds: number | null;
  bio_allowance_seconds: number | null;
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
    DEVICE_RESTART_START: null,
    DEVICE_RESTART_END: null,
    BIO_START: null,
    BIO_END: null,
    OT_LOGIN: null,
    OT_LOGOUT: null,
  },
  LOGGED_IN: {
    LOGIN: null,
    LOGOUT: 'LOGGED_OUT',
    BREAK_IN: 'ON_BREAK',
    BREAK_OUT: null,
    COACHING_START: 'COACHING',
    COACHING_END: null,
    DEVICE_RESTART_START: 'RESTARTING',
    DEVICE_RESTART_END: null,
    BIO_START: 'ON_BIO',
    BIO_END: null,
    OT_LOGIN: 'ON_OT',
    OT_LOGOUT: null,
  },
  ON_BREAK: {
    LOGIN: null,
    LOGOUT: null,
    BREAK_IN: null,
    BREAK_OUT: 'LOGGED_IN',
    COACHING_START: null,
    COACHING_END: null,
    DEVICE_RESTART_START: null,
    DEVICE_RESTART_END: null,
    BIO_START: null,
    BIO_END: null,
    OT_LOGIN: null,
    OT_LOGOUT: null,
  },
  COACHING: {
    LOGIN: null,
    LOGOUT: null,
    BREAK_IN: null,
    BREAK_OUT: null,
    COACHING_START: null,
    COACHING_END: 'LOGGED_IN',
    DEVICE_RESTART_START: null,
    DEVICE_RESTART_END: null,
    BIO_START: null,
    BIO_END: null,
    OT_LOGIN: null,
    OT_LOGOUT: null,
  },
  RESTARTING: {
    LOGIN: null,
    LOGOUT: null,
    BREAK_IN: null,
    BREAK_OUT: null,
    COACHING_START: null,
    COACHING_END: null,
    DEVICE_RESTART_START: null,
    DEVICE_RESTART_END: 'LOGGED_IN',
    BIO_START: null,
    BIO_END: null,
    OT_LOGIN: null,
    OT_LOGOUT: null,
  },
  ON_BIO: {
    LOGIN: null,
    LOGOUT: null,
    BREAK_IN: null,
    BREAK_OUT: null,
    COACHING_START: null,
    COACHING_END: null,
    DEVICE_RESTART_START: null,
    DEVICE_RESTART_END: null,
    BIO_START: null,
    BIO_END: 'LOGGED_IN',
    OT_LOGIN: null,
    OT_LOGOUT: null,
  },
  ON_OT: {
    LOGIN: null,
    LOGOUT: null,
    BREAK_IN: null,
    BREAK_OUT: null,
    COACHING_START: null,
    COACHING_END: null,
    DEVICE_RESTART_START: null,
    DEVICE_RESTART_END: null,
    BIO_START: null,
    BIO_END: null,
    OT_LOGIN: null,
    OT_LOGOUT: 'LOGGED_IN',
  },
};

export function isValidTransition(currentStatus: ProfileStatus, eventType: EventType): ProfileStatus | null {
  return VALID_TRANSITIONS[currentStatus]?.[eventType] ?? null;
}

/**
 * Fetch consolidated dashboard data via RPC
 * Returns status, login time, and ticket metrics in a single call
 * @param profileId - The agent's profile ID
 * @param referenceDate - Optional date to calculate week boundaries (defaults to current date)
 */
export async function fetchAgentDashboardRPC(profileId: string, referenceDate?: Date): Promise<{
  data: {
    current_status: ProfileStatus;
    status_since: string | null;
    current_status_counter: number;
    latest_login_time: string | null;
    total_tickets_week: number;
    total_tickets_today: number;
    avg_response_gap_seconds: number;
    week_start_date: string;
    week_end_date: string;
  } | null;
  error: string | null;
}> {
  try {
    const rpcParams: { p_profile_id: string; p_reference_date?: string } = {
      p_profile_id: profileId,
    };
    
    // Add reference date if provided
    if (referenceDate) {
      rpcParams.p_reference_date = format(referenceDate, 'yyyy-MM-dd');
    }
    
    const { data, error } = await supabase.rpc('get_agent_dashboard_data', rpcParams);
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    // RPC returns an array, get first (and only) row
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return { data: null, error: 'No data returned from RPC' };
    }
    
    return {
      data: {
        current_status: row.current_status as ProfileStatus,
        status_since: row.status_since,
        current_status_counter: row.current_status_counter ?? 0,
        latest_login_time: row.latest_login_time,
        total_tickets_week: row.total_tickets_week ?? 0,
        total_tickets_today: row.total_tickets_today ?? 0,
        avg_response_gap_seconds: row.avg_response_gap_seconds ?? 0,
        week_start_date: row.week_start_date,
        week_end_date: row.week_end_date,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function fetchDashboardProfile(profileId: string, weekStart?: Date | string): Promise<{ data: DashboardProfile | null; error: string | null }> {
  try {
    // 1. Fetch identity AND upwork_contract_id, ot_enabled, position, quotas from agent_profiles (source of truth)
    const { data: profile, error: profileError } = await supabase
      .from('agent_profiles')
      .select('id, email, full_name, upwork_contract_id, upwork_contract_type, ot_enabled, position, quota_email, quota_chat, quota_phone, quota_ot_email')
      .eq('id', profileId)
      .single();

    if (profileError) {
      return { data: null, error: profileError.message };
    }

    if (!profile) {
      return { data: null, error: 'Profile not found' };
    }

    // 2. Fetch operational data from agent_directory using email (for non-schedule fields)
    const { data: directory } = await supabase
      .from('agent_directory')
      .select('agent_name, zendesk_instance, support_account, support_type, ticket_assignment_view_id, quota, weekday_schedule, weekend_schedule, mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule, mon_ot_schedule, tue_ot_schedule, wed_ot_schedule, thu_ot_schedule, fri_ot_schedule, sat_ot_schedule, sun_ot_schedule')
      .eq('email', profile.email)
      .maybeSingle();

    // 3. Use week-based scheduleResolver to build proper day_off array
    const { getEffectiveSchedulesForWeek, getEffectiveScheduleForDate } = await import('@/lib/scheduleResolver');
    
    // Build day_off array from effective week schedules
    let dayOffArray: string[] = [];
    let effectiveBreakSchedule: string | null = null;
    
    if (weekStart) {
      const weekStartStr = typeof weekStart === 'string' 
        ? weekStart 
        : format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekSchedules = await getEffectiveSchedulesForWeek(profileId, weekStartStr);
      dayOffArray = weekSchedules
        .filter(d => d.isDayOff)
        .map(d => d.dayName.substring(0, 3)); // e.g., ['Sat', 'Sun']
      
      // Get break schedule from today's effective schedule
      const todayStr = getTodayEST();
      const todaySchedule = weekSchedules.find(d => d.dayDate === todayStr);
      effectiveBreakSchedule = todaySchedule?.breakSchedule || null;
    } else {
      // Fallback: resolve for today only
      const effectiveSchedule = await getEffectiveScheduleForDate(profileId, new Date());
      dayOffArray = effectiveSchedule.isDayOff ? ['all'] : [];
      effectiveBreakSchedule = effectiveSchedule.breakSchedule || null;
    }

    // 4. Merge and return - use agent_profiles fields as source of truth, effective schedules for day-specific data
    const dashboardProfile: DashboardProfile = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      agent_name: directory?.agent_name || profile.full_name,
      zendesk_instance: directory?.zendesk_instance || null,
      support_account: directory?.support_account || null,
      support_type: resolvePositionCategory(profile.position),
      ticket_assignment_view_id: directory?.ticket_assignment_view_id || null,
      break_schedule: effectiveBreakSchedule,
      quota: directory?.quota || null,
      weekday_schedule: directory?.weekday_schedule || null,
      weekend_schedule: directory?.weekend_schedule || null,
      day_off: dayOffArray,
      upwork_contract_id: profile.upwork_contract_id || null,
      upwork_contract_type: (profile as any).upwork_contract_type || null,  // now text[]
      ot_enabled: profile.ot_enabled || false,
      // For week-view display, still pull from directory (these are fallbacks for UI display)
      mon_schedule: directory?.mon_schedule || null,
      tue_schedule: directory?.tue_schedule || null,
      wed_schedule: directory?.wed_schedule || null,
      thu_schedule: directory?.thu_schedule || null,
      fri_schedule: directory?.fri_schedule || null,
      sat_schedule: directory?.sat_schedule || null,
      sun_schedule: directory?.sun_schedule || null,
      // Per-day OT schedules
      mon_ot_schedule: directory?.mon_ot_schedule || null,
      tue_ot_schedule: directory?.tue_ot_schedule || null,
      wed_ot_schedule: directory?.wed_ot_schedule || null,
      thu_ot_schedule: directory?.thu_ot_schedule || null,
      fri_ot_schedule: directory?.fri_ot_schedule || null,
      sat_ot_schedule: directory?.sat_ot_schedule || null,
      sun_ot_schedule: directory?.sun_ot_schedule || null,
      // Position-specific quotas from agent_profiles
      position: profile.position || null,  // now text[]
      quota_email: profile.quota_email || null,
      quota_chat: profile.quota_chat || null,
      quota_phone: profile.quota_phone || null,
      quota_ot_email: profile.quota_ot_email || null,
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

    // If no status exists, return default LOGGED_OUT with null timestamp
    if (!data) {
      return { 
        data: {
          id: '',
          profile_id: profileId,
          current_status: 'LOGGED_OUT' as ProfileStatus,
          status_since: null,
          bio_time_remaining_seconds: null,
          bio_allowance_seconds: null,
        }, 
        error: null 
      };
    }

    return { data: data as ProfileStatusRecord, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * Proactive stale session cleanup using 5-hour-past-shift-end rule.
 * Called on dashboard mount and during LOGIN/LOGOUT attempts.
 * 
 * Logic:
 *   1. Read profile_status
 *   2. Resolve effective schedule for the status_since date
 *   3. Calculate shift_end + 5 hours deadline
 *   4. If now > deadline → insert SYSTEM_AUTO_LOGOUT, create NO_LOGOUT report, update status
 *   5. Handle overnight shifts correctly
 */
export async function checkAndCleanupStaleSession(
  profileId: string,
  now?: Date
): Promise<{ wasStale: boolean; error: string | null }> {
  try {
    const currentTime = now || new Date();
    
    // 1. Get current status
    const { data: statusData, error: statusError } = await getProfileStatus(profileId);
    if (statusError || !statusData) {
      return { wasStale: false, error: statusError || 'No status data' };
    }
    
    if (statusData.current_status === 'LOGGED_OUT' || !statusData.status_since) {
      return { wasStale: false, error: null };
    }
    
    const statusDateStr = getESTDateFromTimestamp(statusData.status_since);
    
    // 2. Resolve effective schedule for the status_since date
    const { getEffectiveScheduleForDate } = await import('@/lib/scheduleResolver');
    const effectiveSchedule = await getEffectiveScheduleForDate(profileId, statusDateStr);
    
    if (!effectiveSchedule.schedule || effectiveSchedule.isDayOff) {
      // No schedule / day off - not stale (edge case)
      return { wasStale: false, error: null };
    }
    
    const parsed = parseScheduleRangeMinutes(effectiveSchedule.schedule);
    if (!parsed) {
      return { wasStale: false, error: null };
    }
    
    // 3. Calculate the auto-logout deadline: shift_end + 5 hours in UTC
    const [year, month, day] = statusDateStr.split('-').map(Number);
    const isOvernight = parsed.start > parsed.end;
    
    const shiftEndHour = Math.floor(parsed.end / 60);
    const shiftEndMin = parsed.end % 60;
    
    // Build shift end in UTC (EST + 5 hours)
    const shiftEndDate = new Date(Date.UTC(year, month - 1, day));
    if (isOvernight) {
      shiftEndDate.setUTCDate(shiftEndDate.getUTCDate() + 1);
    }
    shiftEndDate.setUTCHours(shiftEndHour + 5, shiftEndMin, 0, 0);
    
    // Deadline = shift_end + 5 hours
    const deadline = new Date(shiftEndDate.getTime() + 5 * 60 * 60 * 1000);
    
    // 4. Check if we've passed the deadline
    if (currentTime.getTime() < deadline.getTime()) {
      return { wasStale: false, error: null };
    }
    
    // 5. Session is stale - auto-logout
    console.log(`Stale session cleanup for ${profileId}. Status since ${statusData.status_since}, deadline was ${deadline.toISOString()}`);
    
    const autoLogoutTimestamp = deadline.toISOString();
    
    // Insert SYSTEM_AUTO_LOGOUT event
    await supabase.from('profile_events').insert({
      profile_id: profileId,
      event_type: 'LOGOUT',
      prev_status: statusData.current_status,
      new_status: 'LOGGED_OUT',
      triggered_by: 'SYSTEM_AUTO_LOGOUT',
      created_at: autoLogoutTimestamp,
    });
    
    // Get agent info
    const { data: agentProfile } = await supabase
      .from('agent_profiles')
      .select('email, full_name')
      .eq('id', profileId)
      .single();
    
    if (agentProfile) {
      // Check for duplicate NO_LOGOUT report
      const { data: existingReport } = await supabase
        .from('agent_reports')
        .select('id')
        .eq('agent_email', agentProfile.email.toLowerCase())
        .eq('incident_date', statusDateStr)
        .eq('incident_type', 'NO_LOGOUT')
        .limit(1);
      
      if (!existingReport || existingReport.length === 0) {
        await supabase.from('agent_reports').insert({
          agent_email: agentProfile.email.toLowerCase(),
          agent_name: agentProfile.full_name || agentProfile.email,
          profile_id: profileId,
          incident_date: statusDateStr,
          incident_type: 'NO_LOGOUT',
          severity: 'high',
          details: {
            lastStatus: statusData.current_status,
            lastStatusSince: statusData.status_since,
            autoLogoutTime: autoLogoutTimestamp,
            source: 'dashboard_cleanup',
          },
          status: 'open',
        });
      }
      
      // Send Slack notification
      sendStatusAlertNotification(
        agentProfile.email,
        agentProfile.full_name || agentProfile.email,
        'NO_LOGOUT',
        { lastStatusDate: statusDateStr, severity: 'high' }
      ).catch((err) => console.error('Failed to send NO_LOGOUT alert:', err));
    }
    
    // Update profile_status to LOGGED_OUT
    await supabase
      .from('profile_status')
      .update({
        current_status: 'LOGGED_OUT',
        status_since: autoLogoutTimestamp,
      })
      .eq('profile_id', profileId);
    
    return { wasStale: true, error: null };
  } catch (err: any) {
    console.error('checkAndCleanupStaleSession error:', err);
    return { wasStale: false, error: err.message };
  }
}

export async function updateProfileStatus(
  profileId: string,
  eventType: EventType,
  triggeredBy: string
): Promise<{ success: boolean; newStatus: ProfileStatus | null; error: string | null; bioTimeRemaining?: number | null }> {
  try {
    // First get current status
    const { data: currentStatusData, error: fetchError } = await getProfileStatus(profileId);
    
    if (fetchError) {
      return { success: false, newStatus: null, error: fetchError };
    }

    let currentStatus = currentStatusData?.current_status || 'LOGGED_OUT';
    const now = new Date();
    const nowISO = now.toISOString();
    
    // Handle stale login detection on LOGIN attempt
    // If agent is not LOGGED_OUT, check if 5+ hours past shift end → auto-logout first
    if (eventType === 'LOGIN' && currentStatus !== 'LOGGED_OUT' && currentStatusData?.status_since) {
      const staleResult = await checkAndCleanupStaleSession(profileId, now);
      if (staleResult.wasStale) {
        currentStatus = 'LOGGED_OUT';
      }
    }

    // Handle stale session detection on LOGOUT attempt
    // If agent clicks Logout but session is 5+ hours past shift end, this is a forgotten logout
    if (eventType === 'LOGOUT' && currentStatus !== 'LOGGED_OUT' && currentStatusData?.status_since) {
      const staleResult = await checkAndCleanupStaleSession(profileId, now);
      if (staleResult.wasStale) {
        // Already auto-logged out - return immediately
        return { success: true, newStatus: 'LOGGED_OUT' as ProfileStatus, error: null };
      }
    }
    
    // Validate transition
    const newStatus = isValidTransition(currentStatus, eventType);
    if (!newStatus) {
      return { 
        success: false, 
        newStatus: null, 
        error: `Invalid transition: Cannot perform ${eventType} from ${currentStatus}` 
      };
    }

    let bioTimeRemaining = currentStatusData?.bio_time_remaining_seconds ?? null;
    let bioAllowance = currentStatusData?.bio_allowance_seconds ?? null;

    // Handle bio-specific logic
    if (eventType === 'BIO_END' && currentStatusData?.status_since) {
      // Calculate how much bio time was consumed
      const bioStartTime = new Date(currentStatusData.status_since).getTime();
      const bioEndTime = now.getTime();
      const consumedSeconds = Math.floor((bioEndTime - bioStartTime) / 1000);
      
      const currentRemaining = currentStatusData.bio_time_remaining_seconds ?? 0;
      bioTimeRemaining = Math.max(0, currentRemaining - consumedSeconds);
    }

    // Handle LOGIN - initialize bio allowance based on schedule
    if (eventType === 'LOGIN') {
      const calculatedAllowance = await calculateBioAllowanceForProfile(profileId);
      bioAllowance = calculatedAllowance;
      bioTimeRemaining = calculatedAllowance;
    }

    // Check if status record exists
    const { data: existingStatus } = await supabase
      .from('profile_status')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    // Build update/insert payload
    const statusPayload: Record<string, unknown> = {
      current_status: newStatus,
      status_since: nowISO,
    };

    // Include bio fields when relevant
    if (eventType === 'LOGIN') {
      statusPayload.bio_allowance_seconds = bioAllowance;
      statusPayload.bio_time_remaining_seconds = bioTimeRemaining;
    } else if (eventType === 'BIO_END') {
      statusPayload.bio_time_remaining_seconds = bioTimeRemaining;
    }

    if (existingStatus) {
      // Update existing status with optimistic locking
      const { error: updateError } = await supabase
        .from('profile_status')
        .update(statusPayload)
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
          ...statusPayload,
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
        created_at: nowISO,
      });

    if (eventError) {
      console.error('Failed to record event:', eventError.message);
      // Don't fail the operation for event logging errors
    }

    // Get agent info for Slack notification
    const { data: agentProfile } = await supabase
      .from('agent_profiles')
      .select('email, full_name')
      .eq('id', profileId)
      .single();

    // Send Slack notification for ALL events (fire and forget)
    if (agentProfile) {
      sendProfileStatusNotification(
        agentProfile.full_name || agentProfile.email,
        agentProfile.email,
        eventType,
        nowISO
      ).catch((err) => {
        console.error('Failed to send profile status notification:', err);
      });
      
      // Check for real-time violations on LOGIN, LOGOUT, and BREAK_OUT
      if (eventType === 'LOGIN') {
        checkAndAlertLateLogin(profileId, agentProfile.email, agentProfile.full_name || agentProfile.email, now)
          .catch((err) => console.error('Failed to check late login:', err));
        
        // Trigger automatic ticket assignment on login
        triggerTicketAssignment(profileId, agentProfile.email)
          .catch((err) => console.error('Failed to trigger ticket assignment:', err));
      } else if (eventType === 'LOGOUT') {
        checkAndAlertEarlyOut(profileId, agentProfile.email, agentProfile.full_name || agentProfile.email, now)
          .catch((err) => console.error('Failed to check early out:', err));
        
        // Await Upwork sync so dashboard refresh sees updated data
        try {
          await fetchAndCacheUpworkTime(profileId, agentProfile.email);
        } catch (err) {
          console.error('Failed to fetch Upwork time on logout:', err);
        }
      } else if (eventType === 'BREAK_OUT') {
        checkAndAlertOverbreak(profileId, agentProfile.email, agentProfile.full_name || agentProfile.email)
          .catch((err) => console.error('Failed to check overbreak:', err));
      }
    }

    // Send device restart notifications if applicable
    if (eventType === 'DEVICE_RESTART_START' || eventType === 'DEVICE_RESTART_END') {
      // Fire and forget - don't block on notification errors
      sendDeviceRestartNotifications(profileId, eventType, triggeredBy, nowISO).catch((err) => {
        console.error('Failed to send device restart notifications:', err);
      });
    }

    return { success: true, newStatus, error: null, bioTimeRemaining };
  } catch (err: any) {
    return { success: false, newStatus: null, error: err.message };
  }
}

/**
 * Calculate bio allowance for a profile based on their schedule
 * 8+ hours shift = 4 minutes, otherwise 2 minutes
 */
async function calculateBioAllowanceForProfile(profileId: string, targetDate?: Date | string): Promise<number> {
  try {
    // Use scheduleResolver to get today's effective schedule
    const { getEffectiveScheduleForDate } = await import('@/lib/scheduleResolver');
    const dateToResolve = targetDate ? (typeof targetDate === 'string' ? new Date(targetDate) : targetDate) : new Date();
    const effectiveSchedule = await getEffectiveScheduleForDate(profileId, dateToResolve);

    if (!effectiveSchedule.schedule) return 150; // Default 2 mins 30 secs

    const parsed = parseScheduleRange(effectiveSchedule.schedule);
    if (!parsed) return 150;

    let durationMinutes = parsed.endMinutes - parsed.startMinutes;
    if (durationMinutes < 0) durationMinutes += 24 * 60;

    // 5+ hours (300 mins) = 5 mins (300 secs), otherwise 2.5 mins (150 secs)
    return durationMinutes >= 300 ? 5 * 60 : 150;
  } catch (err) {
    console.error('Error calculating bio allowance:', err);
    return 150; // Default 2 mins 30 secs on error
  }
}

/**
 * Send profile status notification to Slack
 * Routes LOGIN/LOGOUT to a_cyrus_li-lo, other events to a_cyrus_cs-all
 */
async function sendProfileStatusNotification(
  agentName: string,
  agentEmail: string,
  eventType: EventType,
  timestamp: string
): Promise<void> {
  try {
    const response = await supabase.functions.invoke('send-profile-status-notification', {
      body: {
        agentName,
        agentEmail,
        eventType,
        timestamp,
      },
    });

    if (response.error) {
      console.error('Failed to send profile status notification:', response.error);
    }
  } catch (err: any) {
    console.error('Error calling send-profile-status-notification:', err.message);
  }
}

/**
 * Send notifications to team leads, admins, and active users about device restart events
 */
async function sendDeviceRestartNotifications(
  profileId: string,
  eventType: 'DEVICE_RESTART_START' | 'DEVICE_RESTART_END',
  agentEmail: string,
  timestamp: string
): Promise<void> {
  try {
    // Get agent's profile for their name
    const { data: agentProfile } = await supabase
      .from('agent_profiles')
      .select('full_name, email')
      .eq('id', profileId)
      .single();

    const agentName = agentProfile?.full_name || agentEmail;
    const formattedTime = formatTimeInEST(new Date(timestamp));

    const isStart = eventType === 'DEVICE_RESTART_START';
    const title = isStart ? `Device Issue: ${agentName}` : `Device Resolved: ${agentName}`;
    const message = isStart
      ? `${agentName} has started a device restart at ${formattedTime} EST`
      : `${agentName} has resolved their device issue at ${formattedTime} EST`;

    // Get all admins, HR, and super_admins
    const { data: admins } = await supabase
      .from('user_roles')
      .select('email')
      .in('role', ['admin', 'hr', 'super_admin']);

    // Get all currently active users (logged in, on break, or coaching)
    const { data: activeStatuses } = await supabase
      .from('profile_status')
      .select('profile_id')
      .in('current_status', ['LOGGED_IN', 'ON_BREAK', 'COACHING', 'RESTARTING']);

    // Get emails for active profiles
    const activeProfileIds = activeStatuses?.map((s) => s.profile_id) || [];
    const { data: activeProfiles } = await supabase
      .from('agent_profiles')
      .select('email')
      .in('id', activeProfileIds);

    // Combine and deduplicate recipients (exclude the agent themselves)
    const allRecipients = new Set<string>();
    admins?.forEach((a) => allRecipients.add(a.email.toLowerCase()));
    activeProfiles?.forEach((p) => allRecipients.add(p.email.toLowerCase()));
    allRecipients.delete(agentEmail.toLowerCase());

    if (allRecipients.size === 0) return;

    // Create notification records for each recipient
    const notifications = Array.from(allRecipients).map((email) => ({
      user_email: email,
      title,
      message,
      type: 'device_restart',
      reference_type: 'profile_event',
      reference_id: profileId,
    }));

    // Insert all notifications
    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) {
      console.error('Failed to insert device restart notifications:', error.message);
    }
  } catch (err: any) {
    console.error('Error sending device restart notifications:', err.message);
  }
}

/**
 * Calculate dynamic severity for time-based violations
 * 1-5 mins = low, 6-15 mins = medium, 16+ mins = high
 */
function calculateTimeSeverity(minutes: number): 'low' | 'medium' | 'high' {
  if (minutes <= 5) return 'low';
  if (minutes <= 15) return 'medium';
  return 'high';
}

/**
 * Send status alert notification to Slack (a_pb_mgt channel) for violations
 */
async function sendStatusAlertNotification(
  agentEmail: string,
  agentName: string,
  alertType: 'EXCESSIVE_RESTART' | 'BIO_OVERUSE' | 'LATE_LOGIN' | 'EARLY_OUT' | 'NO_LOGOUT' | 'OVERBREAK' | 'TIME_NOT_MET' | 'QUOTA_NOT_MET' | 'HIGH_GAP',
  details: Record<string, any>
): Promise<void> {
  try {
    const response = await supabase.functions.invoke('send-status-alert-notification', {
      body: { agentEmail, agentName, alertType, details },
    });

    if (response.error) {
      console.error('Failed to send status alert notification:', response.error);
    }
  } catch (err: any) {
    console.error('Error calling send-status-alert-notification:', err.message);
  }
}

/**
 * Check if agent logged in late and send alert if so
 */
async function checkAndAlertLateLogin(
  profileId: string,
  agentEmail: string,
  agentName: string,
  loginTime: Date
): Promise<void> {
  try {
    // Use scheduleResolver to get today's effective schedule
    const { getEffectiveScheduleForDate } = await import('@/lib/scheduleResolver');
    const effectiveSchedule = await getEffectiveScheduleForDate(profileId, loginTime);

    // If day off or no schedule, skip alert
    if (effectiveSchedule.isDayOff || !effectiveSchedule.schedule) return;

    const parsed = parseScheduleRange(effectiveSchedule.schedule);
    if (!parsed) return;

    // Get login time in EST minutes
    const loginMinutes = getTimeInESTMinutesInternal(loginTime);
    const lateThreshold = parsed.startMinutes + 10;

    if (loginMinutes > lateThreshold) {
      const lateByMinutes = loginMinutes - parsed.startMinutes;
      const todayStr = getESTDateFromTimestamp(loginTime.toISOString());

      // Check if we already have a LATE_LOGIN report for today
      const { data: existingReport } = await supabase
        .from('agent_reports')
        .select('id')
        .eq('agent_email', agentEmail.toLowerCase())
        .eq('incident_date', todayStr)
        .eq('incident_type', 'LATE_LOGIN')
        .maybeSingle();

      if (!existingReport) {
        const severity = calculateTimeSeverity(lateByMinutes);
        
        // Create agent_reports record — only notify if insert succeeds
        const { error: insertError } = await supabase.from('agent_reports').insert({
          agent_email: agentEmail.toLowerCase(),
          agent_name: agentName,
          profile_id: profileId,
          incident_date: todayStr,
          incident_type: 'LATE_LOGIN',
          severity,
          details: {
            scheduledStart: parsed.startMinutes,
            actualLogin: loginMinutes,
            lateByMinutes,
          },
          status: 'open',
        });

        if (insertError) {
          console.error(`[COMPLIANCE] Failed to insert LATE_LOGIN report for ${agentEmail}:`, insertError.message);
          return;
        }

        // Send Slack alert only after successful insert
        await sendStatusAlertNotification(agentEmail, agentName, 'LATE_LOGIN', {
          lateByMinutes,
          severity,
        });
      }
    }
  } catch (err: any) {
    console.error('Error checking late login:', err.message);
  }
}

/**
 * Check if agent logged out early and send alert if so
 */
async function checkAndAlertEarlyOut(
  profileId: string,
  agentEmail: string,
  agentName: string,
  logoutTime: Date
): Promise<void> {
  try {
    // Use scheduleResolver to get today's effective schedule
    const { getEffectiveScheduleForDate } = await import('@/lib/scheduleResolver');
    const effectiveSchedule = await getEffectiveScheduleForDate(profileId, logoutTime);

    // If day off or no schedule, skip alert
    if (effectiveSchedule.isDayOff || !effectiveSchedule.schedule) return;

    const parsed = parseScheduleRange(effectiveSchedule.schedule);
    if (!parsed) return;

    // Get logout time in EST minutes
    const logoutMinutes = getTimeInESTMinutesInternal(logoutTime);

    // Early out if logged out before scheduled end time
    if (logoutMinutes < parsed.endMinutes) {
      const earlyByMinutes = parsed.endMinutes - logoutMinutes;
      const todayStr = getESTDateFromTimestamp(logoutTime.toISOString());

      // Check if we already have an EARLY_OUT report for today
      const { data: existingReport } = await supabase
        .from('agent_reports')
        .select('id')
        .eq('agent_email', agentEmail.toLowerCase())
        .eq('incident_date', todayStr)
        .eq('incident_type', 'EARLY_OUT')
        .maybeSingle();

      if (!existingReport) {
        const severity = calculateTimeSeverity(earlyByMinutes);
        
        // Create agent_reports record — only notify if insert succeeds
        const { error: insertError } = await supabase.from('agent_reports').insert({
          agent_email: agentEmail.toLowerCase(),
          agent_name: agentName,
          profile_id: profileId,
          incident_date: todayStr,
          incident_type: 'EARLY_OUT',
          severity,
          details: {
            scheduledEnd: parsed.endMinutes,
            actualLogout: logoutMinutes,
            earlyByMinutes,
          },
          status: 'open',
        });

        if (insertError) {
          console.error(`[COMPLIANCE] Failed to insert EARLY_OUT report for ${agentEmail}:`, insertError.message);
          return;
        }

        // Send Slack alert only after successful insert
        await sendStatusAlertNotification(agentEmail, agentName, 'EARLY_OUT', {
          earlyByMinutes,
          severity,
        });
      }
    }
  } catch (err: any) {
    console.error('Error checking early out:', err.message);
  }
}

/**
 * Check if agent exceeded break allowance and send alert if so
 */
async function checkAndAlertOverbreak(
  profileId: string,
  agentEmail: string,
  agentName: string
): Promise<void> {
  try {
    const now = new Date();
    const todayStr = getESTDateFromTimestamp(now.toISOString());

    // Get break schedule from agent_directory
    const { data: directory } = await supabase
      .from('agent_directory')
      .select('break_schedule')
      .eq('email', agentEmail.toLowerCase())
      .maybeSingle();

    if (!directory?.break_schedule) return;

    // Parse allowed break minutes
    const parsed = parseScheduleRange(directory.break_schedule);
    if (!parsed) return;

    let allowedMinutes = parsed.endMinutes - parsed.startMinutes;
    if (allowedMinutes < 0) allowedMinutes += 24 * 60;

    // Grace period: 5 minutes or 1/6 of allowed
    const graceMinutes = Math.ceil(allowedMinutes / 6);
    const maxAllowedMinutes = allowedMinutes + graceMinutes;

    // Get all break events for today
    const startOfDay = `${todayStr}T00:00:00.000Z`;
    const endOfDay = `${todayStr}T23:59:59.999Z`;

    const { data: breakEvents } = await supabase
      .from('profile_events')
      .select('*')
      .eq('profile_id', profileId)
      .in('event_type', ['BREAK_IN', 'BREAK_OUT'])
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: true });

    if (!breakEvents || breakEvents.length === 0) return;

    // Calculate total break time
    let totalBreakMinutes = 0;
    let breakStartTime: Date | null = null;

    for (const event of breakEvents) {
      if (event.event_type === 'BREAK_IN') {
        breakStartTime = new Date(event.created_at);
      } else if (event.event_type === 'BREAK_OUT' && breakStartTime) {
        const breakEndTime = new Date(event.created_at);
        const durationMs = breakEndTime.getTime() - breakStartTime.getTime();
        totalBreakMinutes += Math.floor(durationMs / (1000 * 60));
        breakStartTime = null;
      }
    }

    // Check if overbreak
    if (totalBreakMinutes > maxAllowedMinutes) {
      const overageMinutes = totalBreakMinutes - allowedMinutes;

      // Check if we already have an OVERBREAK report for today
      const { data: existingReport } = await supabase
        .from('agent_reports')
        .select('id')
        .eq('agent_email', agentEmail.toLowerCase())
        .eq('incident_date', todayStr)
        .eq('incident_type', 'OVERBREAK')
        .maybeSingle();

      if (!existingReport) {
        const severity = calculateTimeSeverity(overageMinutes);
        
        // Create agent_reports record — only notify if insert succeeds
        const { error: insertError } = await supabase.from('agent_reports').insert({
          agent_email: agentEmail.toLowerCase(),
          agent_name: agentName,
          profile_id: profileId,
          incident_date: todayStr,
          incident_type: 'OVERBREAK',
          severity,
          details: {
            allowedMinutes,
            graceMinutes,
            totalBreakMinutes,
            overageMinutes,
          },
          status: 'open',
        });

        if (insertError) {
          console.error(`[COMPLIANCE] Failed to insert OVERBREAK report for ${agentEmail}:`, insertError.message);
          return;
        }

        // Send Slack alert only after successful insert
        await sendStatusAlertNotification(agentEmail, agentName, 'OVERBREAK', {
          overageMinutes,
          severity,
        });
      }
    }
  } catch (err: any) {
    console.error('Error checking overbreak:', err.message);
  }
}

/**
 * Internal helper to get time in EST as minutes from midnight
 */
function getTimeInESTMinutesInternal(date: Date): number {
  const estParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  
  const hour = parseInt(estParts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(estParts.find(p => p.type === 'minute')?.value || '0', 10);
  
  return hour * 60 + minute;
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

export async function getApprovedLeavesForWeek(
  agentEmail: string,
  weekStart: Date,
  weekEnd: Date
): Promise<{ data: ApprovedLeave[] | null; error: string | null }> {
  try {
    const startStr = format(weekStart, 'yyyy-MM-dd');
    const endStr = format(weekEnd, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('leave_requests')
      .select('id, start_date, end_date, outage_reason, status')
      .eq('agent_email', agentEmail.toLowerCase())
      .eq('status', 'approved')
      .lte('start_date', endStr)
      .gte('end_date', startStr);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ApprovedLeave[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function getWeekStatusEvents(
  profileId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<{ data: ProfileEvent[] | null; error: string | null }> {
  try {
    const startStr = weekStart.toISOString();
    const endStr = weekEnd.toISOString();

    const { data, error } = await supabase
      .from('profile_events')
      .select('*')
      .eq('profile_id', profileId)
      .in('event_type', ['LOGIN', 'LOGOUT'])
      .gte('created_at', startStr)
      .lte('created_at', endStr)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ProfileEvent[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

// Backward compatibility alias
export const getWeekLoginEvents = getWeekStatusEvents;

/**
 * Fetch all profile events for the week (including breaks, coaching, etc.)
 */
export async function getWeekAllEvents(
  profileId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<{ data: ProfileEvent[] | null; error: string | null }> {
  try {
    const startStr = weekStart.toISOString();
    const endStr = weekEnd.toISOString();

    const { data, error } = await supabase
      .from('profile_events')
      .select('*')
      .eq('profile_id', profileId)
      .gte('created_at', startStr)
      .lte('created_at', endStr)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ProfileEvent[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * Calculate break duration for a specific day from break events
 * Returns total break time in minutes
 */
function calculateBreakDurationForDay(
  breakEvents: ProfileEvent[],
  dateStr: string
): number {
  // Filter events for this specific day
  const dayBreakEvents = breakEvents.filter((event) => {
    const eventDate = getESTDateFromTimestamp(event.created_at);
    return eventDate === dateStr && (event.event_type === 'BREAK_IN' || event.event_type === 'BREAK_OUT');
  });

  // Sort by time
  dayBreakEvents.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Pair up BREAK_IN with following BREAK_OUT and sum durations
  let totalBreakMinutes = 0;
  let currentBreakStart: Date | null = null;

  for (const event of dayBreakEvents) {
    if (event.event_type === 'BREAK_IN') {
      currentBreakStart = parseISO(event.created_at);
    } else if (event.event_type === 'BREAK_OUT' && currentBreakStart) {
      const breakEnd = parseISO(event.created_at);
      const durationMs = breakEnd.getTime() - currentBreakStart.getTime();
      totalBreakMinutes += Math.floor(durationMs / (1000 * 60));
      currentBreakStart = null;
    }
  }

  return totalBreakMinutes;
}

/**
 * Parse break schedule string and return allowed break minutes
 * Format: "12:00 PM-12:30 PM" -> 30 minutes
 */
function parseBreakScheduleMinutes(breakSchedule: string | null): number {
  if (!breakSchedule) return 0;
  
  const parsed = parseScheduleRange(breakSchedule);
  if (!parsed) return 0;
  
  // Calculate duration in minutes
  let durationMinutes = parsed.endMinutes - parsed.startMinutes;
  if (durationMinutes < 0) durationMinutes += 24 * 60; // Handle crossing midnight
  
  return durationMinutes;
}

/**
 * Parse a 12-hour time string (e.g., "5:00 PM") and return total minutes from midnight
 */
function parseTimeToMinutes(timeStr: string): number | null {
  const timeMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeMatch) return null;
  
  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + minutes;
}

/**
 * Parse schedule string "9:00 AM-5:00 PM" and return start and end times
 */
export function parseScheduleRange(scheduleTime: string): { startTime: string; endTime: string; startMinutes: number; endMinutes: number } | null {
  const parts = scheduleTime.split('-');
  if (parts.length !== 2) return null;
  
  const startTime = parts[0].trim();
  const endTime = parts[1].trim();
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  
  if (startMinutes === null || endMinutes === null) return null;
  
  return { startTime, endTime, startMinutes, endMinutes };
}

/**
 * Format minutes to "Xh Ym" format
 */
export function formatDurationFromMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return '-';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Get time in EST from a Date as total minutes from midnight
 */
function getTimeInESTMinutes(date: Date): number {
  const estParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  
  const hour = parseInt(estParts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(estParts.find(p => p.type === 'minute')?.value || '0', 10);
  
  return hour * 60 + minute;
}

export interface CoverageOverrideForWeek {
  agent_id: string;
  date: string;
  override_start: string;
  override_end: string;
}

export async function fetchCoverageOverridesForAgent(
  profileId: string,
  weekStartStr: string,
  weekEndStr: string
): Promise<{ data: CoverageOverrideForWeek[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('coverage_overrides')
      .select('agent_id, date, override_start, override_end')
      .eq('agent_id', profileId)
      .gte('date', weekStartStr)
      .lte('date', weekEndStr);

    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export function calculateAttendanceForWeek(
  profile: DashboardProfile,
  statusEvents: ProfileEvent[],
  approvedLeaves: ApprovedLeave[],
  weekStart: Date,
  allEvents?: ProfileEvent[],
  coverageOverrides?: CoverageOverrideForWeek[],
  effectiveWeekSchedules?: import('@/lib/scheduleResolver').EffectiveDaySchedule[]
): DayAttendance[] {
  const DAYS = [
    { key: 'mon', short: 'Mon', offset: 0 },
    { key: 'tue', short: 'Tue', offset: 1 },
    { key: 'wed', short: 'Wed', offset: 2 },
    { key: 'thu', short: 'Thu', offset: 3 },
    { key: 'fri', short: 'Fri', offset: 4 },
    { key: 'sat', short: 'Sat', offset: 5 },
    { key: 'sun', short: 'Sun', offset: 6 },
  ];

  const dayOffArray = profile.day_off || [];
  const todayEST = getTodayEST();
  const today = parseDateStringLocal(todayEST);
  today.setHours(0, 0, 0, 0);

  // Build override lookup: date -> override
  const overrideMap = new Map<string, CoverageOverrideForWeek>();
  coverageOverrides?.forEach(o => overrideMap.set(o.date, o));

  // Parse allowed break minutes from profile
  const allowedBreakMinutes = parseBreakScheduleMinutes(profile.break_schedule);
  // Grace period: allowed + 5 minutes (or proportional: allowed/6 rounded up)
  const breakGraceMinutes = Math.ceil(allowedBreakMinutes / 6); // 30min break = 5min grace
  const maxBreakMinutes = allowedBreakMinutes + breakGraceMinutes;

  return DAYS.map((day) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + day.offset);
    date.setHours(0, 0, 0, 0);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    let isPast = isBefore(date, today);
    let isToday = isEqual(date, today);

    // Check for coverage override for this day
    const override = overrideMap.get(dateStr);

    // Helper to calculate OT attendance for this day
    const calculateOTForDay = () => {
      // If OT is disabled for this agent, skip all OT logic
      if (!profile.ot_enabled) {
        return { otSchedule: undefined };
      }
      
      // If there's a coverage override, OT schedule from override is not applicable
      // Use effective schedule resolver for OT (same pattern as regular schedule)
      const otScheduleKey = `${day.key}_ot_schedule` as keyof DashboardProfile;
      const effectiveDayForOT = effectiveWeekSchedules?.find(d => d.dayName.substring(0, 3) === day.short);
      const otSchedule = override ? undefined : (effectiveDayForOT?.otSchedule || (profile[otScheduleKey] as string | null));
      
      if (!allEvents) return { otSchedule: otSchedule || undefined };
      
      // Find OT events for this date
      const otLoginEvent = allEvents.find(e => 
        e.event_type === 'OT_LOGIN' && 
        getESTDateFromTimestamp(e.created_at) === dateStr
      );
      const otLogoutEvent = allEvents.find(e => 
        e.event_type === 'OT_LOGOUT' && 
        getESTDateFromTimestamp(e.created_at) === dateStr
      );
      
      const otLoginTime = otLoginEvent ? formatTimeInEST(parseISO(otLoginEvent.created_at)) : undefined;
      const otLogoutTime = otLogoutEvent ? formatTimeInEST(parseISO(otLogoutEvent.created_at)) : undefined;
      
      // Calculate OT hours worked
      let otHoursWorkedMinutes: number | undefined;
      if (otLoginEvent && otLogoutEvent) {
        const otLoginMs = parseISO(otLoginEvent.created_at).getTime();
        const otLogoutMs = parseISO(otLogoutEvent.created_at).getTime();
        otHoursWorkedMinutes = Math.floor((otLogoutMs - otLoginMs) / (1000 * 60));
      }
      
      // Determine OT status
      let otStatus: 'present_ot' | 'late_ot' | 'absent_ot' | 'pending_ot' | undefined;
      
      if (!otSchedule) {
        // No OT scheduled - if they logged in for OT, it's voluntary OT
        if (otLoginEvent) {
          otStatus = 'present_ot';
        }
        return { otSchedule: undefined, otLoginTime, otLogoutTime, otStatus, otHoursWorkedMinutes };
      }
      
      // OT is scheduled for this day
      if (!otLoginEvent) {
        // OT scheduled but no login
        if (isPast) {
          otStatus = 'absent_ot';
        } else if (!isToday) {
          otStatus = 'pending_ot';
        }
        return { otSchedule, otLoginTime, otLogoutTime, otStatus, otHoursWorkedMinutes };
      }
      
      // OT login exists - check if late (> 10 min after OT schedule start)
      const otParsed = parseScheduleRange(otSchedule);
      if (otParsed) {
        const otLoginMinutes = getTimeInESTMinutes(parseISO(otLoginEvent.created_at));
        const isLateOT = otLoginMinutes > otParsed.startMinutes + 10;
        otStatus = isLateOT ? 'late_ot' : 'present_ot';
      } else {
        otStatus = 'present_ot';
      }
      
      return { otSchedule, otLoginTime, otLogoutTime, otStatus, otHoursWorkedMinutes };
    };

    // If there's a coverage override, skip the day_off check — agent is scheduled to work
    // 1. Check if it's a day off (only when no override)
    // Use effective schedule if available, otherwise fall back to profile day_off array
    const effectiveDay = effectiveWeekSchedules?.find(d => d.dayName.substring(0, 3) === day.short);
    const isDayOff = effectiveDay ? effectiveDay.isDayOff : dayOffArray.includes(day.short);
    
    if (!override && isDayOff) {
      const otData = calculateOTForDay();
      return { 
        date, 
        dayKey: dateStr, 
        status: 'day_off' as AttendanceStatus,
        ...otData,
      };
    }

    // 2. Check for approved leave on this date
    const leaveForDay = approvedLeaves.find((leave) => {
      const leaveStart = parseISO(leave.start_date);
      const leaveEnd = parseISO(leave.end_date);
      return (isAfter(date, leaveStart) || isEqual(date, leaveStart)) &&
             (isBefore(date, leaveEnd) || isEqual(date, leaveEnd));
    });

    if (leaveForDay) {
      const otData = calculateOTForDay();
      return {
        date,
        dayKey: dateStr,
        status: 'on_leave' as AttendanceStatus,
        leaveType: leaveForDay.outage_reason,
        ...otData,
      };
    }

    // 3. Get schedule for this day (override > effective schedule > profile fallback)
    let scheduleTime: string | null = null;
    if (override) {
      scheduleTime = `${override.override_start} - ${override.override_end}`;
    } else if (effectiveDay?.schedule) {
      scheduleTime = effectiveDay.schedule;
    } else {
      const scheduleKey = `${day.key}_schedule` as keyof DashboardProfile;
      scheduleTime = profile[scheduleKey] as string | null;
      
      // Fallback to weekday/weekend schedule
      if (!scheduleTime) {
        scheduleTime = ['sat', 'sun'].includes(day.key)
          ? profile.weekend_schedule
          : profile.weekday_schedule;
      }
    }

    const scheduleParsed = scheduleTime ? parseScheduleRange(scheduleTime) : null;

    // 4. Find login event for this date
    const loginForDay = statusEvents.find((event) => {
      const eventDate = getESTDateFromTimestamp(event.created_at);
      return eventDate === dateStr && event.event_type === 'LOGIN';
    });

    // 5. Find logout event for this date (with overnight shift awareness)
    const isOvernightShift = scheduleParsed && scheduleParsed.endMinutes < scheduleParsed.startMinutes;

    // FIX: For overnight shifts (e.g. 10 PM - 4:30 AM), if the current EST time
    // is between midnight and the shift end, the previous day's shift is still active.
    // Treat it as "today" instead of "past" to avoid false No Logout / Absent OT.
    if (isOvernightShift && isPast && !isToday) {
      // Only apply to "yesterday" — the day immediately before today
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      const isYesterday = isEqual(nextDay, today);
      if (isYesterday) {
        const currentESTMinutes = getCurrentESTTimeMinutes();
        // If current time is before the shift's end time, the overnight shift is still running
        if (currentESTMinutes < scheduleParsed.endMinutes) {
          isPast = false;
          isToday = true;
        }
      }
    }
    // Find candidate logout on same day, then verify session pairing
    let candidateLogout = statusEvents.find((event) => {
      const eventDate = getESTDateFromTimestamp(event.created_at);
      return eventDate === dateStr && event.event_type === 'LOGOUT' && event.triggered_by !== 'SYSTEM_AUTO_LOGOUT';
    });
    // Discard if logout belongs to previous day's session (bleed)
    if (candidateLogout && loginForDay) {
      if (new Date(candidateLogout.created_at) < new Date(loginForDay.created_at)) {
        candidateLogout = undefined; // Previous session bleed
      }
    }
    // If no login for today, a same-day logout is from a previous session
    if (candidateLogout && !loginForDay) {
      candidateLogout = undefined;
    }
    let logoutForDay = candidateLogout;

    // For overnight shifts, also search for LOGOUT on the next calendar day
    if (!logoutForDay && isOvernightShift && loginForDay) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const nextDate = new Date(y, m - 1, d);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      const nextDayCandidate = statusEvents.find((event) => {
        const eventDate = getESTDateFromTimestamp(event.created_at);
        return eventDate === nextDateStr && event.event_type === 'LOGOUT' && event.triggered_by !== 'SYSTEM_AUTO_LOGOUT';
      });
      // Verify next-day logout is after the login (same session)
      if (nextDayCandidate && new Date(nextDayCandidate.created_at) > new Date(loginForDay.created_at)) {
        logoutForDay = nextDayCandidate;
      }
    }

    // Calculate OT for this day
    const otData = calculateOTForDay();

    if (loginForDay) {
      const loginTime = parseISO(loginForDay.created_at);
      const formattedLoginTime = formatTimeInEST(loginTime);
      const formattedLogoutTime = logoutForDay 
        ? formatTimeInEST(parseISO(logoutForDay.created_at))
        : undefined;

      // Calculate hours worked
      let hoursWorked: string | undefined;
      let hoursWorkedMinutes: number | undefined;
      if (logoutForDay) {
        const logoutTime = parseISO(logoutForDay.created_at);
        const durationMs = logoutTime.getTime() - loginTime.getTime();
        hoursWorkedMinutes = Math.floor(durationMs / (1000 * 60));
        hoursWorked = formatDurationFromMinutes(hoursWorkedMinutes);
      }

      // Check for early out (logout before scheduled end)
      let isEarlyOut = false;
      if (logoutForDay && scheduleParsed) {
        const logoutTimeMinutes = getTimeInESTMinutes(parseISO(logoutForDay.created_at));
        if (isOvernightShift) {
          // For overnight shifts (e.g. 10 PM - 4:30 AM, end = 270):
          // Logout is early if it's before end AND it's in the post-midnight window (< endMinutes)
          // OR if it's before midnight but too early (logged out during the first part of shift)
          const loginTimeMinutes = getTimeInESTMinutes(loginTime);
          // If logout is in the post-midnight portion, check against endMinutes
          if (logoutTimeMinutes < scheduleParsed.endMinutes) {
            // Logout before shift end in the AM portion — early out
            isEarlyOut = true;
          } else if (logoutTimeMinutes >= scheduleParsed.startMinutes) {
            // Logout is in the PM portion (same night as login) — early out if they barely worked
            // e.g. login 10 PM, logout 11 PM — that's early
            isEarlyOut = true;
          }
          // If logoutTimeMinutes is between endMinutes and startMinutes, it's a normal logout
          // (e.g. logout at 5 AM for a shift ending at 4:30 AM — not early)
          if (logoutTimeMinutes >= scheduleParsed.endMinutes && logoutTimeMinutes < scheduleParsed.startMinutes) {
            isEarlyOut = false;
          }
        } else {
          // Normal shift: early out if logged out before scheduled end time
          isEarlyOut = logoutTimeMinutes < scheduleParsed.endMinutes;
        }
      }

      // Check for no logout (past day with login but no logout)
      const noLogout = isPast && !logoutForDay;

      // Check if late (login > 10 min after schedule start)
      let isLate = false;
      if (scheduleParsed) {
        const loginTimeMinutes = getTimeInESTMinutes(loginTime);
        const lateThreshold = scheduleParsed.startMinutes + 10;
        isLate = loginTimeMinutes > lateThreshold;
      }

      // Calculate break duration for this day (if allEvents provided)
      let breakDurationMinutes: number | undefined;
      let breakDuration: string | undefined;
      let isOverbreak = false;
      let breakOverageMinutes: number | undefined;

      if (allEvents && allEvents.length > 0) {
        breakDurationMinutes = calculateBreakDurationForDay(allEvents, dateStr);
        if (breakDurationMinutes > 0) {
          breakDuration = `${breakDurationMinutes}m`;
          
          // Check for overbreak
          if (allowedBreakMinutes > 0 && breakDurationMinutes > maxBreakMinutes) {
            isOverbreak = true;
            breakOverageMinutes = breakDurationMinutes - allowedBreakMinutes;
          }
        }
      }

      return {
        date,
        dayKey: dateStr,
        status: isLate ? 'late' as AttendanceStatus : 'present' as AttendanceStatus,
        loginTime: formattedLoginTime,
        logoutTime: formattedLogoutTime,
        scheduleStart: scheduleParsed?.startTime,
        scheduleEnd: scheduleParsed?.endTime,
        isEarlyOut,
        noLogout,
        hoursWorked,
        hoursWorkedMinutes,
        // Break tracking
        breakDurationMinutes,
        breakDuration,
        allowedBreakMinutes: allowedBreakMinutes > 0 ? allowedBreakMinutes : undefined,
        allowedBreak: allowedBreakMinutes > 0 ? `${allowedBreakMinutes}m` : undefined,
        isOverbreak,
        breakOverageMinutes: isOverbreak ? breakOverageMinutes : undefined,
        // OT tracking
        ...otData,
      };
    }

    // 6. No login - check if past or pending
    if (isPast) {
      return { date, dayKey: dateStr, status: 'absent' as AttendanceStatus, ...otData };
    }

    return { date, dayKey: dateStr, status: 'pending' as AttendanceStatus, ...otData };
  });
}

// ========================================
// Daily Work Tracker Functions
// ========================================

/**
 * Get the agent_tag from agent_directory for a given profile email
 */
export async function getAgentTagByEmail(email: string): Promise<{ data: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('agent_directory')
      .select('agent_tag')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data?.agent_tag || null, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * Fetch today's ticket count for an agent from ticket_logs
 */
export async function getTodayTicketCount(agentTag: string): Promise<{ data: number; error: string | null }> {
  try {
    // Get today's date range in UTC
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const { count, error } = await supabase
      .from('ticket_logs')
      .select('*', { count: 'exact', head: true })
      .ilike('agent_name', agentTag)
      .gte('timestamp', startOfDay.toISOString())
      .lte('timestamp', endOfDay.toISOString());

    if (error) {
      return { data: 0, error: error.message };
    }

    return { data: count || 0, error: null };
  } catch (err: any) {
    return { data: 0, error: err.message };
  }
}

export interface TicketCountByType {
  email: number;
  chat: number;
  call: number;
  total: number;
  otEmail: number;
}

/**
 * Fetch today's ticket count broken down by type (Email, Chat, Call)
 * Also separates OT emails from regular emails using the is_ot flag
 */
export async function getTodayTicketCountByType(agentTag: string): Promise<{ data: TicketCountByType; error: string | null }> {
  try {
    // Import timezone utility for EST boundaries
    const { getESTDayBoundaries, getTodayEST } = await import('@/lib/timezoneUtils');
    const { start, end } = getESTDayBoundaries(getTodayEST());

    // Fetch all tickets for today to count by type (includes is_ot flag)
    const { data, error } = await supabase
      .from('ticket_logs')
      .select('ticket_type, is_ot')
      .ilike('agent_name', agentTag)
      .gte('timestamp', start)
      .lte('timestamp', end);

    if (error) {
      return { data: { email: 0, chat: 0, call: 0, total: 0, otEmail: 0 }, error: error.message };
    }

    // Count by type (case-insensitive), separate OT emails
    let emailCount = 0;
    let chatCount = 0;
    let callCount = 0;
    let otEmailCount = 0;

    (data || []).forEach((row) => {
      const type = (row.ticket_type || '').toLowerCase();
      const isOt = row.is_ot === true;
      
      if (type === 'email') {
        if (isOt) {
          otEmailCount++;
        } else {
          emailCount++;
        }
      } else if (type === 'chat') {
        chatCount++;
      } else if (type === 'call') {
        callCount++;
      }
    });

    return {
      data: {
        email: emailCount,
        chat: chatCount,
        call: callCount,
        total: emailCount + chatCount + callCount + otEmailCount,
        otEmail: otEmailCount,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: { email: 0, chat: 0, call: 0, total: 0, otEmail: 0 }, error: err.message };
  }
}

/**
 * Fetch ticket count broken down by type for a week date range
 * Aggregates tickets from startDate to endDate (inclusive)
 */
export async function getWeekTicketCountByType(
  agentTag: string,
  startDate: Date,
  endDate: Date
): Promise<{ data: TicketCountByType; error: string | null }> {
  try {
    // Format dates to ISO strings for timezone-aware query
    const startStr = format(startDate, 'yyyy-MM-dd') + 'T00:00:00.000Z';
    const endStr = format(endDate, 'yyyy-MM-dd') + 'T23:59:59.999Z';

    // Fetch all tickets for the date range (includes is_ot flag)
    const { data, error } = await supabase
      .from('ticket_logs')
      .select('ticket_type, is_ot')
      .ilike('agent_name', agentTag)
      .gte('timestamp', startStr)
      .lte('timestamp', endStr);

    if (error) {
      return { data: { email: 0, chat: 0, call: 0, total: 0, otEmail: 0 }, error: error.message };
    }

    // Count by type (case-insensitive), separate OT emails
    let emailCount = 0;
    let chatCount = 0;
    let callCount = 0;
    let otEmailCount = 0;

    (data || []).forEach((row) => {
      const type = (row.ticket_type || '').toLowerCase();
      const isOt = row.is_ot === true;
      
      if (type === 'email') {
        if (isOt) {
          otEmailCount++;
        } else {
          emailCount++;
        }
      } else if (type === 'chat') {
        chatCount++;
      } else if (type === 'call') {
        callCount++;
      }
    });

    return {
      data: {
        email: emailCount,
        chat: chatCount,
        call: callCount,
        total: emailCount + chatCount + callCount + otEmailCount,
        otEmail: otEmailCount,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: { email: 0, chat: 0, call: 0, total: 0, otEmail: 0 }, error: err.message };
  }
}

/**
 * Fetch average gap data for a week date range
 * Returns the average of all daily gaps in the range
 */
export async function getWeekAvgGapData(
  agentTag: string,
  startDate: Date,
  endDate: Date
): Promise<{ data: { avgGapSeconds: number | null }; error: string | null }> {
  try {
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('ticket_gap_daily')
      .select('avg_gap_seconds, ticket_count')
      .ilike('agent_name', agentTag)
      .gte('date', startStr)
      .lte('date', endStr);

    if (error) {
      return { data: { avgGapSeconds: null }, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: { avgGapSeconds: null }, error: null };
    }

    // Calculate weighted average gap based on ticket counts
    let totalWeightedGap = 0;
    let totalTickets = 0;

    data.forEach((row) => {
      if (row.avg_gap_seconds !== null && row.ticket_count > 0) {
        totalWeightedGap += row.avg_gap_seconds * row.ticket_count;
        totalTickets += row.ticket_count;
      }
    });

    const avgGap = totalTickets > 0 ? Math.round(totalWeightedGap / totalTickets) : null;

    return { data: { avgGapSeconds: avgGap }, error: null };
  } catch (err: any) {
    return { data: { avgGapSeconds: null }, error: err.message };
  }
}

/**
 * Fetch ticket count broken down by type for a single day
 * Uses EST day boundaries for accurate timezone handling
 */
export async function getDayTicketCountByType(
  agentTag: string,
  date: Date
): Promise<{ data: TicketCountByType; error: string | null }> {
  try {
    // Format date to string for EST boundary calculation
    const dateStr = format(date, 'yyyy-MM-dd');
    const { getESTDayBoundaries } = await import('@/lib/timezoneUtils');
    const { start, end } = getESTDayBoundaries(dateStr);

    // Fetch all tickets for the day (includes is_ot flag)
    const { data, error } = await supabase
      .from('ticket_logs')
      .select('ticket_type, is_ot')
      .ilike('agent_name', agentTag)
      .gte('timestamp', start)
      .lte('timestamp', end);

    if (error) {
      return { data: { email: 0, chat: 0, call: 0, total: 0, otEmail: 0 }, error: error.message };
    }

    // Count by type (case-insensitive), separate OT emails
    let emailCount = 0;
    let chatCount = 0;
    let callCount = 0;
    let otEmailCount = 0;

    (data || []).forEach((row) => {
      const type = (row.ticket_type || '').toLowerCase();
      const isOt = row.is_ot === true;
      
      if (type === 'email') {
        if (isOt) {
          otEmailCount++;
        } else {
          emailCount++;
        }
      } else if (type === 'chat') {
        chatCount++;
      } else if (type === 'call') {
        callCount++;
      }
    });

    return {
      data: {
        email: emailCount,
        chat: chatCount,
        call: callCount,
        total: emailCount + chatCount + callCount + otEmailCount,
        otEmail: otEmailCount,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: { email: 0, chat: 0, call: 0, total: 0, otEmail: 0 }, error: err.message };
  }
}

/**
 * Fetch average gap data for a single day
 */
export async function getDayAvgGapData(
  agentTag: string,
  date: Date
): Promise<{ data: { avgGapSeconds: number | null }; error: string | null }> {
  try {
    const dateStr = format(date, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('ticket_gap_daily')
      .select('avg_gap_seconds')
      .ilike('agent_name', agentTag)
      .eq('date', dateStr)
      .maybeSingle();

    if (error) {
      return { data: { avgGapSeconds: null }, error: error.message };
    }

    return { data: { avgGapSeconds: data?.avg_gap_seconds ?? null }, error: null };
  } catch (err: any) {
    return { data: { avgGapSeconds: null }, error: err.message };
  }
}

/**
 * Fetch portal hours for a single day from attendance data
 * Returns hours worked in decimal format
 */
export async function getDayPortalHours(
  profileId: string,
  date: Date
): Promise<{ data: { hours: number | null; loginTime: string | null }; error: string | null }> {
  try {
    const dateStr = format(date, 'yyyy-MM-dd');
    const startOfDay = dateStr + 'T00:00:00.000Z';
    const endOfDay = dateStr + 'T23:59:59.999Z';

    // Fetch login/logout events for this specific day
    const { data, error } = await supabase
      .from('profile_events')
      .select('event_type, created_at')
      .eq('profile_id', profileId)
      .in('event_type', ['LOGIN', 'LOGOUT', 'OT_LOGIN', 'OT_LOGOUT'])
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: { hours: null, loginTime: null }, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: { hours: null, loginTime: null }, error: null };
    }

    // Find first login and last logout
    let firstLogin: Date | null = null;
    let lastLogout: Date | null = null;
    let firstLoginTime: string | null = null;

    data.forEach((event) => {
      const eventTime = new Date(event.created_at);
      if (event.event_type === 'LOGIN' || event.event_type === 'OT_LOGIN') {
        if (!firstLogin) {
          firstLogin = eventTime;
          firstLoginTime = formatTimeInEST(eventTime);
        }
      } else if (event.event_type === 'LOGOUT' || event.event_type === 'OT_LOGOUT') {
        lastLogout = eventTime;
      }
    });

    if (!firstLogin) {
      return { data: { hours: null, loginTime: null }, error: null };
    }

    // If no logout yet, use current time for calculation
    const endTime = lastLogout || new Date();
    const hoursWorked = (endTime.getTime() - firstLogin.getTime()) / (1000 * 60 * 60);

    return { 
      data: { 
        hours: Math.round(hoursWorked * 100) / 100, 
        loginTime: firstLoginTime 
      }, 
      error: null 
    };
  } catch (err: any) {
    return { data: { hours: null, loginTime: null }, error: err.message };
  }
}


export async function getTodayGapData(agentTag: string): Promise<{ 
  data: { avgGapSeconds: number | null; ticketCount: number } | null; 
  error: string | null 
}> {
  try {
    const today = getTodayEST();

    const { data, error } = await supabase
      .from('ticket_gap_daily')
      .select('avg_gap_seconds, ticket_count')
      .eq('date', today)
      .ilike('agent_name', agentTag)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: { avgGapSeconds: null, ticketCount: 0 }, error: null };
    }

    return { 
      data: { 
        avgGapSeconds: data.avg_gap_seconds, 
        ticketCount: data.ticket_count 
      }, 
      error: null 
    };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * Format seconds into a readable time string (e.g., "5m 30s")
 */
export function formatGapTime(seconds: number | null): string {
  if (seconds === null || seconds === 0) return '--';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

/**
 * Fetch Upwork time logged for a specific date
 */
export async function fetchUpworkTime(
  contractId: string,
  date: string,
  agentEmail?: string
): Promise<{ 
  hours: number | null; 
  firstCellTime: string | null;
  lastCellTime: string | null;
  error: string | null 
}> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-upwork-time', {
      body: { contractId, date, agentEmail },
    });

    if (error) {
      console.error('Error fetching Upwork time:', error);
      return { hours: null, firstCellTime: null, lastCellTime: null, error: error.message };
    }

    if (data?.error) {
      console.error('Upwork API error:', data.error);
      return { hours: null, firstCellTime: null, lastCellTime: null, error: data.error };
    }

    return { 
      hours: data?.hours ?? null, 
      firstCellTime: data?.firstCellTime ?? null,
      lastCellTime: data?.lastCellTime ?? null,
      error: null 
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Exception fetching Upwork time:', errorMessage);
    return { hours: null, firstCellTime: null, lastCellTime: null, error: errorMessage };
  }
}

/**
 * Fetch Upwork time from cache (upwork_daily_logs table)
 * This reads previously synced data instead of calling the live API
 */
export async function fetchUpworkTimeFromCache(
  contractId: string,
  date: string
): Promise<{ 
  hours: number | null; 
  syncedAt: string | null;
  error: string | null 
}> {
  try {
    const { data, error } = await supabase
      .from('upwork_daily_logs')
      .select('total_hours, fetched_at')
      .eq('contract_id', contractId)
      .eq('date', date)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Upwork cache:', error);
      return { hours: null, syncedAt: null, error: error.message };
    }

    if (!data) {
      // No cached data yet - not an error, just no data
      return { hours: null, syncedAt: null, error: null };
    }

    return { 
      hours: data.total_hours ?? null, 
      syncedAt: data.fetched_at ?? null,
      error: null 
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Exception fetching Upwork cache:', errorMessage);
    return { hours: null, syncedAt: null, error: errorMessage };
  }
}

/**
 * Fetch Upwork time from cache for a week date range
 * Sums total_hours from upwork_daily_logs for all days in the range
 */
/**
 * Fetch Upwork time from local cache for a single day
 * Queries upwork_daily_logs for that specific date
 */
export async function fetchUpworkTimeForDay(
  contractId: string,
  date: Date
): Promise<{ 
  hours: number | null; 
  syncedAt: string | null;
  error: string | null 
}> {
  try {
    const dateStr = format(date, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('upwork_daily_logs')
      .select('total_hours, fetched_at')
      .eq('contract_id', contractId)
      .eq('date', dateStr)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Upwork cache for day:', error);
      return { hours: null, syncedAt: null, error: error.message };
    }

    if (!data) {
      // No cached data for this day - not an error, just no data
      return { hours: null, syncedAt: null, error: null };
    }

    return { 
      hours: data.total_hours, 
      syncedAt: data.fetched_at,
      error: null 
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Upwork day cache error:', errorMsg);
    return { hours: null, syncedAt: null, error: errorMsg };
  }
}

/**
 * Fetch Upwork time from local cache for a week range
 * Sums total_hours from upwork_daily_logs for all days in the range
 */
export async function fetchUpworkTimeForWeek(
  contractId: string,
  startDate: Date,
  endDate: Date
): Promise<{ 
  hours: number | null; 
  syncedAt: string | null;
  error: string | null 
}> {
  try {
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('upwork_daily_logs')
      .select('total_hours, fetched_at')
      .eq('contract_id', contractId)
      .gte('date', startStr)
      .lte('date', endStr);

    if (error) {
      console.error('Error fetching Upwork cache for week:', error);
      return { hours: null, syncedAt: null, error: error.message };
    }

    if (!data || data.length === 0) {
      // No cached data yet - not an error, just no data
      return { hours: null, syncedAt: null, error: null };
    }

    // Sum all hours in the range
    let totalHours = 0;
    let latestSync: string | null = null;

    data.forEach((row) => {
      if (row.total_hours !== null) {
        totalHours += row.total_hours;
      }
      // Track the most recent sync time
      if (row.fetched_at && (!latestSync || row.fetched_at > latestSync)) {
        latestSync = row.fetched_at;
      }
    });

    return { 
      hours: totalHours, 
      syncedAt: latestSync,
      error: null 
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Exception fetching Upwork cache for week:', errorMessage);
    return { hours: null, syncedAt: null, error: errorMessage };
  }
}

/**
 * Fetch and cache Upwork time on logout - called as fire-and-forget
 * This triggers the edge function to fetch from Upwork and store in upwork_daily_logs
 */
async function fetchAndCacheUpworkTime(profileId: string, agentEmail: string): Promise<void> {
  try {
    // Get agent's upwork contract ID
    const { data: profile } = await supabase
      .from('agent_profiles')
      .select('upwork_contract_id')
      .eq('id', profileId)
      .single();

    if (!profile?.upwork_contract_id) {
      // No Upwork contract - silently skip
      return;
    }

    const today = getTodayEST();
    
    // Call the edge function to fetch and cache
    const { error } = await supabase.functions.invoke('fetch-upwork-time', {
      body: { 
        contractId: profile.upwork_contract_id, 
        date: today, 
        agentEmail 
      },
    });

    if (error) {
      console.error('Error fetching Upwork time on logout:', error);
    }
  } catch (err) {
    console.error('Exception in fetchAndCacheUpworkTime:', err);
  }
}

// ========================================
// Auto-Generate Late Login Outage Request
// ========================================

import { checkExistingLateLoginRequest, createAutoGeneratedLateRequest } from './leaveRequestApi';

interface AgentProfileData {
  email: string;
  full_name: string | null;
  position: string[] | null;
  team_lead: string | null;
  clients: string | null;
}

/**
 * Convert 24-hour time in minutes to HH:mm format
 */
function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Auto-generate Late Login outage request when agent logs in late.
 * This function should be called from AgentDashboard when a late status is detected for today.
 * 
 * @param agentEmail - The agent's email
 * @param scheduleStartMinutes - Scheduled start time in minutes from midnight (EST)
 * @param loginTimeMinutes - Actual login time in minutes from midnight (EST)
 * @param date - The date string (YYYY-MM-DD)
 */
export async function autoGenerateLateLoginRequest(
  agentEmail: string,
  scheduleStartMinutes: number,
  loginTimeMinutes: number,
  date: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // 1. Check if a Late Login request already exists for this date
    const existingResult = await checkExistingLateLoginRequest(agentEmail, date);
    if (existingResult.error) {
      return { success: false, error: existingResult.error };
    }
    if (existingResult.data) {
      // Request already exists, skip creation
      return { success: true, error: null };
    }

    // 2. Fetch agent profile data for auto-filling
    const { data: profileData, error: profileError } = await supabase
      .from('agent_profiles')
      .select('email, full_name, position, team_lead, clients')
      .eq('email', agentEmail.toLowerCase())
      .single();

    if (profileError || !profileData) {
      console.error('Failed to fetch agent profile for auto-generation:', profileError);
      return { success: false, error: 'Could not fetch agent profile' };
    }

    const profile = profileData as AgentProfileData;

    // 3. Parse client from clients field (take first client if multiple)
    const clientName = profile.clients?.split(',')[0]?.trim() || 'Unknown';

    // 4. Calculate start and end times
    // Start: schedule start + 5 minutes (grace period)
    const outageStartMinutes = scheduleStartMinutes + 5;
    // End: login time - 1 minute
    const outageEndMinutes = loginTimeMinutes - 1;

    // Only create if there's at least 1 minute of outage
    if (outageEndMinutes <= outageStartMinutes) {
      return { success: true, error: null }; // No meaningful outage to record
    }

    // 5. Create the auto-generated request
    const result = await createAutoGeneratedLateRequest({
      agent_email: profile.email,
      agent_name: profile.full_name || profile.email,
      client_name: clientName,
      team_lead_name: profile.team_lead || 'Unknown',
      role: Array.isArray(profile.position) ? profile.position[0] || 'Unknown' : profile.position || 'Unknown',
      start_date: date,
      start_time: formatMinutesToTime(outageStartMinutes),
      end_time: formatMinutesToTime(outageEndMinutes)
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    console.log('Auto-generated Late Login request created:', result.data?.reference_number);
    return { success: true, error: null };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error auto-generating late login request:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Trigger automatic ticket assignment when agent logs in.
 * Calls the assign-tickets-on-login edge function.
 * This is fire-and-forget - errors are logged but don't block login.
 */
async function triggerTicketAssignment(profileId: string, agentEmail: string): Promise<void> {
  try {
    console.log('Triggering ticket assignment for:', agentEmail);
    
    const { data, error } = await supabase.functions.invoke('assign-tickets-on-login', {
      body: {
        agentEmail,
        profileId,
      },
    });

    if (error) {
      console.error('Ticket assignment edge function error:', error);
      return;
    }

    if (data?.skipped) {
      console.log('Ticket assignment skipped:', data.reason);
      return;
    }

    if (data?.success && data.ticketsAssigned > 0) {
      console.log(`Ticket assignment successful: ${data.ticketsAssigned} tickets from ${data.viewName}`);
      // Note: Toast notification is handled by the caller if needed
    } else if (!data?.success) {
      console.error('Ticket assignment failed:', data?.error);
    }
   } catch (err) {
     console.error('Failed to trigger ticket assignment:', err);
   }
 }

/**
 * Fetch attendance snapshots for a given week (used for historical data)
 */
async function fetchAttendanceSnapshots(
  profileId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<{
  data: DayAttendance[] | null;
  error: string | null;
}> {
  try {
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('attendance_snapshots' as any)
      .select('*')
      .eq('profile_id', profileId)
      .gte('date', weekStartStr)
      .lte('date', weekEndStr)
      .order('date', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: null, error: 'No snapshots available for this week' };
    }

    // Convert snapshot records to DayAttendance format
    const attendance: DayAttendance[] = data.map((snap: any) => ({
      date: parseISO(snap.date),
      dayKey: snap.date,
      status: snap.status as AttendanceStatus,
      leaveType: snap.leave_type,
      loginTime: snap.login_time,
      logoutTime: snap.logout_time,
      scheduleStart: snap.schedule_start,
      scheduleEnd: snap.schedule_end,
      isEarlyOut: snap.is_early_out,
      noLogout: snap.no_logout,
      hoursWorked: snap.hours_worked_formatted,
      hoursWorkedMinutes: snap.hours_worked_minutes,
      breakDurationMinutes: snap.break_duration_minutes,
      breakDuration: snap.break_duration_formatted,
      allowedBreakMinutes: snap.allowed_break_minutes,
      allowedBreak: snap.allowed_break_formatted,
      isOverbreak: snap.is_overbreak,
      breakOverageMinutes: snap.break_overage_minutes,
      otSchedule: snap.ot_schedule,
      otLoginTime: snap.ot_login_time,
      otLogoutTime: snap.ot_logout_time,
      otStatus: snap.ot_status,
      otHoursWorkedMinutes: snap.ot_hours_worked_minutes,
      otTicketCount: snap.ot_ticket_count,
      effectiveQuotaOtEmail: snap.quota_ot_email ?? null,
    }));

    return { data: attendance, error: null };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { data: null, error: errorMessage };
  }
}

/**
 * Dual-read wrapper: fetches attendance from snapshots for old weeks, live data for recent weeks
 */
export async function fetchAttendanceDualRead(
  profile: DashboardProfile,
  weekStart: Date,
  weekEnd: Date,
  profileId: string
): Promise<{
  data: DayAttendance[] | null;
  error: string | null;
  dataSource: 'snapshot' | 'live';
}> {
  const dataSource = getDataSourceForWeek(weekStart);

  if (dataSource === 'snapshot') {
    const snapshotResult = await fetchAttendanceSnapshots(profileId, weekStart, weekEnd);
    if (snapshotResult.data) {
      // Also check for NCNS reports on snapshot data
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      const { data: ncnsData } = await supabase
        .from('agent_reports')
        .select('incident_date')
        .eq('agent_email', profile.email.toLowerCase())
        .eq('incident_type', 'NCNS')
        .gte('incident_date', weekStartStr)
        .lte('incident_date', weekEndStr);
      const ncnsDates = new Set<string>((ncnsData || []).map((r: any) => r.incident_date));
      for (const day of snapshotResult.data) {
        if (day.status === 'absent') {
          const dateStr = format(day.date, 'yyyy-MM-dd');
          if (ncnsDates.has(dateStr)) {
            day.isNcns = true;
          }
        }
      }
      return { ...snapshotResult, dataSource: 'snapshot' };
    }
    // Fall back to live data if no snapshot exists
  }

  // Live data path
  const { getEffectiveSchedulesForWeek } = await import('@/lib/scheduleResolver');
  
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  const [loginEventsResult, allEventsResult, leavesResult, overridesResult, weekSchedules, ncnsResult] = await Promise.all([
    getWeekLoginEvents(profileId, weekStart, weekEnd),
    getWeekAllEvents(profileId, weekStart, weekEnd),
    getApprovedLeavesForWeek(profile.email, weekStart, weekEnd),
    fetchCoverageOverridesForAgent(
      profileId,
      weekStartStr,
      weekEndStr
    ),
    getEffectiveSchedulesForWeek(profileId, weekStart),
    supabase
      .from('agent_reports')
      .select('incident_date')
      .eq('agent_email', profile.email.toLowerCase())
      .eq('incident_type', 'NCNS')
      .gte('incident_date', weekStartStr)
      .lte('incident_date', weekEndStr),
  ]);

  const loginEvents: ProfileEvent[] = loginEventsResult.data || [];
  const allEvents: ProfileEvent[] = allEventsResult.data || [];
  const approvedLeaves: ApprovedLeave[] = leavesResult.data || [];
  const coverageOverrides: CoverageOverrideForWeek[] = overridesResult.data || [];

  // Build a set of dates with NCNS reports
  const ncnsDates = new Set<string>(
    (ncnsResult.data || []).map((r: any) => r.incident_date)
  );

  const attendance = calculateAttendanceForWeek(
    profile,
    loginEvents,
    approvedLeaves,
    weekStart,
    allEvents,
    coverageOverrides,
    weekSchedules
  );

  // Tag absent days with NCNS flag
  for (const day of attendance) {
    if (day.status === 'absent') {
      const dateStr = format(day.date, 'yyyy-MM-dd');
      if (ncnsDates.has(dateStr)) {
        day.isNcns = true;
      }
    }
  }

  return { data: attendance, error: null, dataSource: 'live' };
}
