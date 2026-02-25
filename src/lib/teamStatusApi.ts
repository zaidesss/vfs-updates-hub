import { supabase } from '@/integrations/supabase/client';
import { 
  getCurrentESTDayKey, 
  getCurrentESTTimeMinutes, 
  getTodayEST,
  parseScheduleRange,
  isTimeInScheduleRange,
} from './timezoneUtils';
import { getEffectiveScheduleForDate } from './scheduleResolver';

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
  position: string[] | null;
  currentStatus: ProfileStatus;
  statusSince: string;
  shiftSchedule: string | null;
  breakSchedule: string | null;
  // Schedule-based visibility fields
  isScheduledNow: boolean;
  outageReason: string | null;
  hasApprovedOutage: boolean;
  otSchedule: string | null;
  outageStatus: 'approved' | 'pending' | 'for_review' | null;
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

import { resolvePositionCategory } from '@/lib/positionUtils';

// Map position values to categories using the shared resolver
function categorizeByPosition(position: string | string[] | null, fullName?: string): SupportCategory {
  const resolved = resolvePositionCategory(position);
  
  switch (resolved) {
    case 'Phone': return 'phoneSupport';
    case 'Chat': return 'chatSupport';
    case 'Email': return 'emailSupport';
    case 'Hybrid':
    case 'Email + Chat':
    case 'Email + Phone':
      return 'hybridSupport';
    case 'Team Lead': return 'teamLeads';
    case 'Technical': return 'techSupport';
    case 'Logistics': return 'other';
    default:
      console.warn(`[TeamStatus] Unknown resolved position "${resolved}" for ${fullName || 'unknown'} — defaulting to "other"`);
      return 'other';
  }
}


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

export async function fetchScheduledTeamMembers(now?: Date): Promise<{
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
    // Get current EST day and time using injected clock (or fallback)
    const currentDayKey = getCurrentESTDayKey(now);
    const currentTimeMinutes = getCurrentESTTimeMinutes(now);
    const todayStr = getTodayEST(now);

    // Fetch all active agent profiles (parallel queries)
    const [profilesResult, statusesResult, outagesResult] = await Promise.all([
      // Fetch all active profiles
      supabase
        .from('agent_profiles_team_status')
        .select(`
          id, 
          email, 
          full_name, 
          position,
          break_schedule
        `)
        .neq('employment_status', 'Terminated'),
      
      // Fetch all profile statuses
      supabase
        .from('profile_status')
        .select('profile_id, current_status, status_since'),
      
      // Fetch approved outages covering today
      supabase
        .from('leave_requests')
        .select('agent_email, outage_reason, start_date, end_date, start_time, end_time, status')
        .in('status', ['approved', 'pending', 'for_review'])
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

    const outageMap = new Map<string, { outage_reason: string; start_date: string; end_date: string; start_time?: string; end_time?: string; status: string }>();
    outages.forEach(o => {
      if (o.agent_email) {
        outageMap.set(o.agent_email.toLowerCase(), {
          outage_reason: o.outage_reason,
          start_date: o.start_date,
          end_date: o.end_date,
          start_time: o.start_time,
          end_time: o.end_time,
          status: o.status,
        });
      }
    });

    // Process each profile for schedule-based visibility
    const allMembers: TeamMemberStatus[] = [];
    let onlineCount = 0;

    for (const profile of profiles) {
      const email = (profile.email || '').toLowerCase();
      
      // Use schedule resolver to get effective schedule for today
      const effectiveSchedule = await getEffectiveScheduleForDate(profile.id, todayStr);
      
      // Check if scheduled within current time window
      const schedule = effectiveSchedule.schedule;
      const otSchedule = effectiveSchedule.otSchedule;
      
      // Skip if day off
      if (effectiveSchedule.isDayOff) {
        continue;
      }
      
      // Check if within schedule window
      const isWithinWindow = isWithinScheduleWindow(schedule, otSchedule, currentTimeMinutes);
      if (!isWithinWindow) {
        continue;
      }
      
      // Get status info
      const statusInfo = statusMap.get(profile.id);
      const currentStatus = (statusInfo?.current_status || 'LOGGED_OUT') as ProfileStatus;
      const statusSince = statusInfo?.status_since || new Date().toISOString();
      
      // Check for approved outage
      const outageInfo = outageMap.get(email);
      let hasApprovedOutage = false;
      let outageReason: string | null = null;
      let outageStatus: 'approved' | 'pending' | 'for_review' | null = null;
      
      if (outageInfo) {
        const isFirstDay = todayStr === outageInfo.start_date;
        const isLastDay = todayStr === outageInfo.end_date;
        const isSingleDay = outageInfo.start_date === outageInfo.end_date;

        // Helper to parse "HH:MM" or "HH:MM:SS" into total minutes
        const parseTimeToMinutes = (t?: string): number | null => {
          if (!t) return null;
          const parts = t.split(':');
          return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
        };

        const startMinutes = parseTimeToMinutes(outageInfo.start_time);
        const endMinutes = parseTimeToMinutes(outageInfo.end_time);

        if (isSingleDay) {
          // Single day: check both boundaries
          if (startMinutes != null && endMinutes != null) {
            hasApprovedOutage = currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes;
          } else {
            hasApprovedOutage = true; // no times = full day
          }
        } else if (isFirstDay) {
          // First day of multi-day: from start_time onward
          hasApprovedOutage = startMinutes != null ? currentTimeMinutes >= startMinutes : true;
        } else if (isLastDay) {
          // Last day of multi-day: until end_time
          hasApprovedOutage = endMinutes != null ? currentTimeMinutes <= endMinutes : true;
        } else {
          // Middle day: all day
          hasApprovedOutage = true;
        }

        if (hasApprovedOutage) {
          outageReason = outageInfo.outage_reason;
          outageStatus = outageInfo.status as 'approved' | 'pending' | 'for_review';
        }
      }
      
      // Count as online if logged in and not on outage
      if (currentStatus !== 'LOGGED_OUT' && !(hasApprovedOutage && outageStatus === 'approved')) {
        onlineCount++;
      }
      
      allMembers.push({
        profileId: profile.id,
        email: profile.email || '',
        fullName: profile.full_name || profile.email || 'Unknown',
        position: profile.position,
        currentStatus,
        statusSince,
        shiftSchedule: schedule,
        breakSchedule: profile.break_schedule,
        isScheduledNow: true,
        outageReason,
        hasApprovedOutage,
        otSchedule: otSchedule,
        outageStatus,
      });
    }

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
      const category = categorizeByPosition(member.position, member.fullName);
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
