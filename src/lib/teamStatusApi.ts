import { supabase } from '@/integrations/supabase/client';
import { 
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

export async function fetchScheduledTeamMembers(todayEST: string, currentTimeMinutes: number): Promise<{
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
    const todayStr = todayEST;

    // Single bulk query for all schedules + parallel status/outage queries
    const [schedulesResult, statusesResult, outagesResult] = await Promise.all([
      supabase.rpc('get_team_status_data', { p_date: todayStr }) as any,
      supabase.from('profile_status').select('profile_id, current_status, status_since'),
      supabase.rpc('get_team_outages_today', { p_date: todayStr }) as any,
    ]);

    if (schedulesResult.error) {
      console.error('Error fetching team status data:', schedulesResult.error);
      return { categories: emptyCategories, totalScheduled: 0, totalOnline: 0, error: schedulesResult.error.message };
    }

    const profiles = schedulesResult.data || [];
    const statuses = statusesResult.data || [];
    const outages = outagesResult.data || [];

    // Create lookup maps
    const statusMap = new Map<string, { current_status: string; status_since: string }>();
    statuses.forEach((s: any) => {
      statusMap.set(s.profile_id, {
        current_status: s.current_status,
        status_since: s.status_since,
      });
    });

    const outageMap = new Map<string, { outage_reason: string; start_date: string; end_date: string; start_time?: string; end_time?: string; status: string }>();
    outages.forEach((o: any) => {
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

    // Process each profile - schedules already resolved by the RPC
    const allMembers: TeamMemberStatus[] = [];
    let onlineCount = 0;

    for (const profile of profiles) {
      const email = (profile.email || '').toLowerCase();
      
      const schedule = profile.effective_schedule;
      const otSchedule = profile.effective_ot_schedule;
      
      // Skip if day off
      if (profile.is_day_off) {
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
  // Compute EST values inline for legacy callers
  const estNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = estNow.getFullYear();
  const month = String(estNow.getMonth() + 1).padStart(2, '0');
  const day = String(estNow.getDate()).padStart(2, '0');
  const todayEST = `${year}-${month}-${day}`;
  const currentTimeMinutes = estNow.getHours() * 60 + estNow.getMinutes();
  
  const result = await fetchScheduledTeamMembers(todayEST, currentTimeMinutes);
  return {
    categories: result.categories,
    totalOnline: result.totalOnline,
    error: result.error,
  };
}
