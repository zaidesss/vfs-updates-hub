import { supabase } from '@/integrations/supabase/client';
import { 
  getCurrentESTDayKey, 
  getCurrentESTTimeMinutes, 
  getTodayEST,
  parseScheduleRange,
  isTimeInScheduleRange,
} from './timezoneUtils';

export type ProfileStatus = 
  | 'LOGGED_IN' 
  | 'ON_BREAK' 
  | 'COACHING' 
  | 'LOGGED_OUT'
  | 'ON_OT'
  | 'RESTARTING'
  | 'ON_BIO';

export type SupportCategory = 
  | 'phoneSupport' 
  | 'chatSupport' 
  | 'emailSupport' 
  | 'hybridSupport' 
  | 'teamLeads' 
  | 'techSupport' 
  | 'other';

export interface TeamMemberStatus {
  profileId: string;
  email: string;
  fullName: string;
  position: string | null;
  currentStatus: ProfileStatus;
  statusSince: string;
  shiftSchedule: string | null;
  breakSchedule: string | null;
  // Schedule-based visibility fields
  isScheduledNow: boolean;
  outageReason: string | null;
  hasApprovedOutage: boolean;
  otSchedule: string | null;
}

export interface CategorizedTeamMembers {
  phoneSupport: TeamMemberStatus[];
  chatSupport: TeamMemberStatus[];
  emailSupport: TeamMemberStatus[];
  hybridSupport: TeamMemberStatus[];
  teamLeads: TeamMemberStatus[];
  techSupport: TeamMemberStatus[];
  other: TeamMemberStatus[];
}

// Map position values to categories
function categorizeByPosition(position: string | null): SupportCategory {
  if (!position) return 'other';
  
  const positionLower = position.toLowerCase().trim();
  
  if (positionLower === 'phone support') return 'phoneSupport';
  if (positionLower === 'chat support') return 'chatSupport';
  if (positionLower === 'email support') return 'emailSupport';
  if (positionLower === 'logistics') return 'emailSupport';
  if (positionLower === 'hybrid support') return 'hybridSupport';
  if (positionLower === 'team lead') return 'teamLeads';
  if (positionLower === 'technical support') return 'techSupport';
  
  return 'other';
}

// Day key to database column mapping
const DAY_SCHEDULE_MAP: Record<string, string> = {
  mon: 'mon_schedule',
  tue: 'tue_schedule',
  wed: 'wed_schedule',
  thu: 'thu_schedule',
  fri: 'fri_schedule',
  sat: 'sat_schedule',
  sun: 'sun_schedule',
};

const DAY_OT_SCHEDULE_MAP: Record<string, string> = {
  mon: 'mon_ot_schedule',
  tue: 'tue_ot_schedule',
  wed: 'wed_ot_schedule',
  thu: 'thu_ot_schedule',
  fri: 'fri_ot_schedule',
  sat: 'sat_ot_schedule',
  sun: 'sun_ot_schedule',
};

// Convert day key to display format for day_off array matching
const DAY_OFF_MAP: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

/**
 * Check if an agent is within their scheduled visibility window.
 * This includes regular shift + OT schedule.
 */
function isWithinScheduleWindow(
  regularSchedule: string | null,
  otSchedule: string | null,
  currentTimeMinutes: number
): boolean {
  // Check regular schedule
  const regularRange = parseScheduleRange(regularSchedule);
  if (regularRange && isTimeInScheduleRange(currentTimeMinutes, regularRange.start, regularRange.end)) {
    return true;
  }
  
  // Check OT schedule
  const otRange = parseScheduleRange(otSchedule);
  if (otRange && isTimeInScheduleRange(currentTimeMinutes, otRange.start, otRange.end)) {
    return true;
  }
  
  return false;
}

export async function fetchScheduledTeamMembers(): Promise<{
  categories: CategorizedTeamMembers;
  totalScheduled: number;
  totalOnline: number;
  error: string | null;
}> {
  const emptyCategories: CategorizedTeamMembers = {
    phoneSupport: [],
    chatSupport: [],
    emailSupport: [],
    hybridSupport: [],
    teamLeads: [],
    techSupport: [],
    other: [],
  };

  try {
    // Get current EST day and time
    const currentDayKey = getCurrentESTDayKey();
    const currentTimeMinutes = getCurrentESTTimeMinutes();
    const todayStr = getTodayEST();
    
    const scheduleColumn = DAY_SCHEDULE_MAP[currentDayKey];
    const otScheduleColumn = DAY_OT_SCHEDULE_MAP[currentDayKey];
    const dayOffDisplay = DAY_OFF_MAP[currentDayKey];

    // Fetch all active agent profiles with schedules (parallel queries)
    const [profilesResult, statusesResult, outagesResult] = await Promise.all([
      // Fetch all active profiles with per-day schedules
      supabase
        .from('agent_profiles_team_status')
        .select(`
          id, 
          email, 
          full_name, 
          position,
          day_off,
          break_schedule,
          mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule,
          mon_ot_schedule, tue_ot_schedule, wed_ot_schedule, thu_ot_schedule, fri_ot_schedule, sat_ot_schedule, sun_ot_schedule
        `)
        .neq('employment_status', 'Terminated'),
      
      // Fetch all profile statuses (including LOGGED_OUT for reference)
      supabase
        .from('profile_status')
        .select('profile_id, current_status, status_since'),
      
      // Fetch approved outages covering today
      supabase
        .from('leave_requests')
        .select('agent_email, outage_reason, start_date, end_date, start_time, end_time')
        .eq('status', 'approved')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr),
    ]);

    if (profilesResult.error) {
      console.error('Error fetching agent_profiles:', profilesResult.error);
      return { categories: emptyCategories, totalScheduled: 0, totalOnline: 0, error: profilesResult.error.message };
    }

    const profiles = profilesResult.data || [];
    const statuses = statusesResult.data || [];
    const outages = outagesResult.data || [];

    // Create lookup maps
    const statusMap = new Map<string, { current_status: string; status_since: string }>();
    statuses.forEach(s => {
      statusMap.set(s.profile_id, {
        current_status: s.current_status,
        status_since: s.status_since,
      });
    });

    const outageMap = new Map<string, { outage_reason: string; start_time?: string; end_time?: string }>();
    outages.forEach(o => {
      if (o.agent_email) {
        outageMap.set(o.agent_email.toLowerCase(), {
          outage_reason: o.outage_reason,
          start_time: o.start_time,
          end_time: o.end_time,
        });
      }
    });

    // Process each profile for schedule-based visibility
    const allMembers: TeamMemberStatus[] = [];
    let onlineCount = 0;

    profiles.forEach(profile => {
      const email = (profile.email || '').toLowerCase();
      
      // Check if today is their day off
      const dayOffArray = profile.day_off || [];
      if (dayOffArray.includes(dayOffDisplay)) {
        return; // Skip - it's their day off
      }
      
      // Get today's schedules using dynamic property access
      const todaySchedule = (profile as any)[scheduleColumn] as string | null;
      const todayOtSchedule = (profile as any)[otScheduleColumn] as string | null;
      
      // Skip if no schedule for today (Day Off in schedule field)
      if (!todaySchedule || todaySchedule.toLowerCase() === 'day off' || todaySchedule.toLowerCase() === 'off') {
        return;
      }
      
      // Check if within visibility window
      const isScheduled = isWithinScheduleWindow(todaySchedule, todayOtSchedule, currentTimeMinutes);
      
      if (!isScheduled) {
        return; // Skip - not within their schedule window
      }
      
      // Get status info
      const statusInfo = statusMap.get(profile.id);
      const currentStatus = (statusInfo?.current_status || 'LOGGED_OUT') as ProfileStatus;
      const statusSince = statusInfo?.status_since || new Date().toISOString();
      
      // Check for approved outage
      const outageInfo = outageMap.get(email);
      let hasApprovedOutage = false;
      let outageReason: string | null = null;
      
      if (outageInfo) {
        // Check if outage covers current time
        if (outageInfo.start_time && outageInfo.end_time) {
          const outageStart = parseInt(outageInfo.start_time.replace(':', ''), 10) || 0;
          const outageEnd = parseInt(outageInfo.end_time.replace(':', ''), 10) || 2400;
          const currentHHMM = Math.floor(currentTimeMinutes / 60) * 100 + (currentTimeMinutes % 60);
          
          if (currentHHMM >= outageStart && currentHHMM <= outageEnd) {
            hasApprovedOutage = true;
            outageReason = outageInfo.outage_reason;
          }
        } else {
          // Full day outage
          hasApprovedOutage = true;
          outageReason = outageInfo.outage_reason;
        }
      }
      
      // Count as online if logged in and not on outage
      if (currentStatus !== 'LOGGED_OUT' && !hasApprovedOutage) {
        onlineCount++;
      }
      
      allMembers.push({
        profileId: profile.id,
        email: profile.email || '',
        fullName: profile.full_name || profile.email || 'Unknown',
        position: profile.position,
        currentStatus,
        statusSince,
        shiftSchedule: todaySchedule,
        breakSchedule: profile.break_schedule,
        isScheduledNow: true,
        outageReason,
        hasApprovedOutage,
        otSchedule: todayOtSchedule,
      });
    });

    // Sort by status_since (most recent first)
    allMembers.sort((a, b) => new Date(b.statusSince).getTime() - new Date(a.statusSince).getTime());

    // Categorize members into 7 groups
    const categories: CategorizedTeamMembers = {
      phoneSupport: [],
      chatSupport: [],
      emailSupport: [],
      hybridSupport: [],
      teamLeads: [],
      techSupport: [],
      other: [],
    };

    allMembers.forEach(member => {
      const category = categorizeByPosition(member.position);
      categories[category].push(member);
    });

    return { 
      categories, 
      totalScheduled: allMembers.length, 
      totalOnline: onlineCount, 
      error: null 
    };
  } catch (err) {
    console.error('Unexpected error in fetchScheduledTeamMembers:', err);
    return { categories: emptyCategories, totalScheduled: 0, totalOnline: 0, error: 'An unexpected error occurred' };
  }
}

// Legacy function - keeping for backward compatibility if needed elsewhere
export async function fetchLoggedInTeamMembers(): Promise<{
  categories: CategorizedTeamMembers;
  totalOnline: number;
  error: string | null;
}> {
  const result = await fetchScheduledTeamMembers();
  return {
    categories: result.categories,
    totalOnline: result.totalOnline,
    error: result.error,
  };
}
