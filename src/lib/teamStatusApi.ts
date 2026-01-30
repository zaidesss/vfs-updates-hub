import { supabase } from '@/integrations/supabase/client';

export type ProfileStatus = 'LOGGED_IN' | 'ON_BREAK' | 'COACHING' | 'LOGGED_OUT';

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
  if (positionLower === 'hybrid support') return 'hybridSupport';
  if (positionLower === 'team lead') return 'teamLeads';
  if (positionLower === 'technical support') return 'techSupport';
  
  return 'other';
}

export async function fetchLoggedInTeamMembers(): Promise<{
  categories: CategorizedTeamMembers;
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
    // Fetch all profile_status records where user is NOT logged out
    const { data: statusData, error: statusError } = await supabase
      .from('profile_status')
      .select('profile_id, current_status, status_since')
      .neq('current_status', 'LOGGED_OUT');

    if (statusError) {
      console.error('Error fetching profile_status:', statusError);
      return { categories: emptyCategories, totalOnline: 0, error: statusError.message };
    }

    if (!statusData || statusData.length === 0) {
      return { categories: emptyCategories, totalOnline: 0, error: null };
    }

    const profileIds = statusData.map(s => s.profile_id);

    // Fetch from the restricted view (only non-sensitive fields)
    const { data: profilesData, error: profilesError } = await supabase
      .from('agent_profiles_team_status')
      .select('id, email, full_name, position')
      .in('id', profileIds);

    if (profilesError) {
      console.error('Error fetching agent_profiles_team_status:', profilesError);
      return { categories: emptyCategories, totalOnline: 0, error: profilesError.message };
    }

    if (!profilesData || profilesData.length === 0) {
      return { categories: emptyCategories, totalOnline: 0, error: null };
    }

    // Get emails to fetch from agent_directory
    const emails = profilesData.map(p => p.email).filter(Boolean);

    // Fetch agent_directory for schedule info
    const { data: directoryData, error: directoryError } = await supabase
      .from('agent_directory')
      .select('email, weekday_schedule, break_schedule')
      .in('email', emails);

    if (directoryError) {
      console.error('Error fetching agent_directory:', directoryError);
      // Continue without directory data - not a fatal error
    }

    // Create lookup maps
    const directoryMap = new Map<string, { weekday_schedule: string | null; break_schedule: string | null }>();
    if (directoryData) {
      directoryData.forEach(d => {
        directoryMap.set(d.email, {
          weekday_schedule: d.weekday_schedule,
          break_schedule: d.break_schedule,
        });
      });
    }

    const statusMap = new Map<string, { current_status: string; status_since: string }>();
    statusData.forEach(s => {
      statusMap.set(s.profile_id, {
        current_status: s.current_status,
        status_since: s.status_since,
      });
    });

    // Build team member status list
    const allMembers: TeamMemberStatus[] = profilesData
      .map(profile => {
        const status = statusMap.get(profile.id);
        const directory = profile.email ? directoryMap.get(profile.email) : undefined;

        if (!status) return null;

        return {
          profileId: profile.id,
          email: profile.email,
          fullName: profile.full_name || profile.email,
          position: profile.position,
          currentStatus: status.current_status as ProfileStatus,
          statusSince: status.status_since,
          shiftSchedule: directory?.weekday_schedule || null,
          breakSchedule: directory?.break_schedule || null,
        };
      })
      .filter((m): m is TeamMemberStatus => m !== null);

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

    return { categories, totalOnline: allMembers.length, error: null };
  } catch (err) {
    console.error('Unexpected error in fetchLoggedInTeamMembers:', err);
    return { categories: emptyCategories, totalOnline: 0, error: 'An unexpected error occurred' };
  }
}
