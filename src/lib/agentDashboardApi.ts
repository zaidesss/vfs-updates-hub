import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format, parseISO, isAfter, isBefore, isEqual, addMinutes } from 'date-fns';

export type ProfileStatus = 'LOGGED_OUT' | 'LOGGED_IN' | 'ON_BREAK' | 'COACHING' | 'RESTARTING';
export type EventType = 'LOGIN' | 'LOGOUT' | 'BREAK_IN' | 'BREAK_OUT' | 'COACHING_START' | 'COACHING_END' | 'DEVICE_RESTART_START' | 'DEVICE_RESTART_END';

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
  status_since: string | null;
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

    // If no status exists, return default LOGGED_OUT with null timestamp
    if (!data) {
      return { 
        data: {
          id: '',
          profile_id: profileId,
          current_status: 'LOGGED_OUT' as ProfileStatus,
          status_since: null,
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

    // Send device restart notifications if applicable
    if (eventType === 'DEVICE_RESTART_START' || eventType === 'DEVICE_RESTART_END') {
      // Fire and forget - don't block on notification errors
      sendDeviceRestartNotifications(profileId, eventType, triggeredBy, now).catch((err) => {
        console.error('Failed to send device restart notifications:', err);
      });
    }

    return { success: true, newStatus, error: null };
  } catch (err: any) {
    return { success: false, newStatus: null, error: err.message };
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
    const eventDate = format(parseISO(event.created_at), 'yyyy-MM-dd');
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
function parseScheduleRange(scheduleTime: string): { startTime: string; endTime: string; startMinutes: number; endMinutes: number } | null {
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

export function calculateAttendanceForWeek(
  profile: DashboardProfile,
  statusEvents: ProfileEvent[],
  approvedLeaves: ApprovedLeave[],
  weekStart: Date,
  allEvents?: ProfileEvent[]  // Optional: all events including breaks for break tracking
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse allowed break minutes from profile
  const allowedBreakMinutes = parseBreakScheduleMinutes(profile.break_schedule);
  // Grace period: allowed + 5 minutes (or proportional: allowed/6 rounded up)
  const breakGraceMinutes = Math.ceil(allowedBreakMinutes / 6); // 30min break = 5min grace
  const maxBreakMinutes = allowedBreakMinutes + breakGraceMinutes;

  return DAYS.map((day) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + day.offset);
    date.setHours(0, 0, 0, 0);

    const dateStr = format(date, 'yyyy-MM-dd');
    const isPast = isBefore(date, today);
    const isToday = isEqual(date, today);

    // 1. Check if it's a day off
    if (dayOffArray.includes(day.short)) {
      return { date, dayKey: day.key, status: 'day_off' as AttendanceStatus };
    }

    // 2. Check for approved leave on this date
    const leaveForDay = approvedLeaves.find((leave) => {
      const leaveStart = parseISO(leave.start_date);
      const leaveEnd = parseISO(leave.end_date);
      return (isAfter(date, leaveStart) || isEqual(date, leaveStart)) &&
             (isBefore(date, leaveEnd) || isEqual(date, leaveEnd));
    });

    if (leaveForDay) {
      return {
        date,
        dayKey: day.key,
        status: 'on_leave' as AttendanceStatus,
        leaveType: leaveForDay.outage_reason,
      };
    }

    // 3. Get schedule for this day
    const scheduleKey = `${day.key}_schedule` as keyof DashboardProfile;
    let scheduleTime = profile[scheduleKey] as string | null;
    
    // Fallback to weekday/weekend schedule
    if (!scheduleTime) {
      scheduleTime = ['sat', 'sun'].includes(day.key)
        ? profile.weekend_schedule
        : profile.weekday_schedule;
    }

    const scheduleParsed = scheduleTime ? parseScheduleRange(scheduleTime) : null;

    // 4. Find login event for this date
    const loginForDay = statusEvents.find((event) => {
      const eventDate = format(parseISO(event.created_at), 'yyyy-MM-dd');
      return eventDate === dateStr && event.event_type === 'LOGIN';
    });

    // 5. Find logout event for this date
    const logoutForDay = statusEvents.find((event) => {
      const eventDate = format(parseISO(event.created_at), 'yyyy-MM-dd');
      return eventDate === dateStr && event.event_type === 'LOGOUT';
    });

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
        // Early out if logged out before scheduled end time
        isEarlyOut = logoutTimeMinutes < scheduleParsed.endMinutes;
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
        dayKey: day.key,
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
      };
    }

    // 6. No login - check if past or pending
    if (isPast) {
      return { date, dayKey: day.key, status: 'absent' as AttendanceStatus };
    }

    return { date, dayKey: day.key, status: 'pending' as AttendanceStatus };
  });
}
