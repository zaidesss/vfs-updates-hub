import { supabase } from '@/integrations/supabase/client';

export interface RateHistoryEntry {
  date: string;
  rate: number;
}

// Position dropdown options
export const POSITION_OPTIONS = [
  'Hybrid Support',
  'Team Lead',
  'Logistics',
  'Email Support',
  'Chat Support',
  'Phone Support',
  'Technical Support',
] as const;

export type PositionType = typeof POSITION_OPTIONS[number];

// Support type options
export const SUPPORT_TYPE_OPTIONS = ['Email', 'Chat', 'Phone'] as const;
export type SupportType = typeof SUPPORT_TYPE_OPTIONS[number];

// Get defaults based on position
export function getPositionDefaults(position: string | null): {
  supportType: string[];
  views: string[];
  ticketViewId: string | null;
  showQuotaEmail: boolean;
  showQuotaChat: boolean;
  showQuotaPhone: boolean;
  supportTypeEditable: boolean;
} {
  switch (position) {
    case 'Hybrid Support':
      return {
        supportType: ['Email', 'Chat', 'Phone'],
        views: ['All'],
        ticketViewId: '50553259977753',
        showQuotaEmail: true,
        showQuotaChat: true,
        showQuotaPhone: true,
        supportTypeEditable: true,
      };
    case 'Email Support':
      return {
        supportType: ['Email'],
        views: ['Open'],
        ticketViewId: '50553259977753',
        showQuotaEmail: true,
        showQuotaChat: false,
        showQuotaPhone: false,
        supportTypeEditable: false,
      };
    case 'Chat Support':
      return {
        supportType: ['Chat'],
        views: ['New'],
        ticketViewId: '48622289457049',
        showQuotaEmail: true,
        showQuotaChat: true,
        showQuotaPhone: false,
        supportTypeEditable: false,
      };
    case 'Phone Support':
      return {
        supportType: ['Phone'],
        views: ['New'],
        ticketViewId: '48622289457049',
        showQuotaEmail: true,
        showQuotaChat: false,
        showQuotaPhone: true,
        supportTypeEditable: false,
      };
    case 'Team Lead':
    case 'Logistics':
    case 'Technical Support':
      return {
        supportType: ['Email'],
        views: ['All'],
        ticketViewId: null,
        showQuotaEmail: false,
        showQuotaChat: false,
        showQuotaPhone: false,
        supportTypeEditable: false,
      };
    default:
      return {
        supportType: [],
        views: [],
        ticketViewId: null,
        showQuotaEmail: false,
        showQuotaChat: false,
        showQuotaPhone: false,
        supportTypeEditable: false,
      };
  }
}

export interface AgentProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  birthday: string | null;
  start_date: string | null;
  home_address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  position: string | null;
  team_lead: string | null;
  clients: string | null;
  hourly_rate: number | null;
  rate_history: RateHistoryEntry[] | null;
  // Connectivity fields
  primary_internet_provider: string | null;
  primary_internet_speed: string | null;
  backup_internet_provider: string | null;
  backup_internet_speed: string | null;
  backup_internet_type: string | null;
  // Banking fields
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  // Freelance fields
  upwork_profile_url: string | null;
  upwork_username: string | null;
  upwork_contract_id: string | null;
  // Equipment
  headset_model: string | null;
  // Work setup (Super Admin only)
  work_schedule: string | null;
  employment_status: string | null;
  payment_frequency: string | null;
  // NEW: Work configuration fields (from Master Directory)
  agent_name: string | null;
  agent_tag: string | null;
  zendesk_instance: string | null;
  support_account: string | null;
  support_type: string[] | null;
  views: string[] | null;
  ticket_assignment_enabled: boolean | null;
  ticket_assignment_view_id: string | null;
  quota_email: number | null;
  quota_chat: number | null;
  quota_phone: number | null;
  mon_schedule: string | null;
  tue_schedule: string | null;
  wed_schedule: string | null;
  thu_schedule: string | null;
  fri_schedule: string | null;
  sat_schedule: string | null;
  sun_schedule: string | null;
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
  day_off: string[] | null;
  ot_enabled: boolean | null;
  zendesk_user_id: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface AgentProfileInput {
  email: string;
  full_name?: string;
  phone_number?: string;
  birthday?: string;
  start_date?: string;
  home_address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  position?: string;
  team_lead?: string;
  clients?: string;
  hourly_rate?: number | null;
  rate_history?: RateHistoryEntry[];
  // Connectivity fields
  primary_internet_provider?: string;
  primary_internet_speed?: string;
  backup_internet_provider?: string;
  backup_internet_speed?: string;
  backup_internet_type?: string;
  // Banking fields
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  // Freelance fields
  upwork_profile_url?: string;
  upwork_username?: string;
  upwork_contract_id?: string;  // Added: Upwork Contract ID
  // Equipment
  headset_model?: string;
  // Work setup (Super Admin only)
  work_schedule?: string;
  employment_status?: string;
  payment_frequency?: string;
  // Work configuration fields (editable in Bios, synced to Master Directory)
  agent_name?: string;
  agent_tag?: string;
  zendesk_instance?: string;
  support_account?: string;
  support_type?: string[];
  views?: string[];
  ticket_assignment_enabled?: boolean;
  ticket_assignment_view_id?: string;
  quota_email?: number | null;
  quota_chat?: number | null;
  quota_phone?: number | null;
  mon_schedule?: string;
  tue_schedule?: string;
  wed_schedule?: string;
  thu_schedule?: string;
  fri_schedule?: string;
  sat_schedule?: string;
  sun_schedule?: string;
  break_schedule?: string;
  weekday_ot_schedule?: string;
  weekend_ot_schedule?: string;
  // Per-day OT schedules
  mon_ot_schedule?: string;
  tue_ot_schedule?: string;
  wed_ot_schedule?: string;
  thu_ot_schedule?: string;
  fri_ot_schedule?: string;
  sat_ot_schedule?: string;
  sun_ot_schedule?: string;
  day_off?: string[];
  ot_enabled?: boolean;
  zendesk_user_id?: string;
}

export interface ProfileChangeRequest {
  id: string;
  reference_number: string | null;
  requested_by_email: string;
  requested_by_name: string | null;
  target_email: string;
  field_name: string;
  current_value: string | null;
  requested_value: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

function transformProfile(data: any): AgentProfile | null {
  if (!data) return null;
  return {
    ...data,
    rate_history: Array.isArray(data.rate_history) ? data.rate_history : [],
    support_type: Array.isArray(data.support_type) ? data.support_type : [],
    views: Array.isArray(data.views) ? data.views : [],
    day_off: Array.isArray(data.day_off) ? data.day_off : [],
  };
}

export async function fetchMyProfile(): Promise<{ data: AgentProfile | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('agent_profiles')
    .select('*')
    .eq('email', user.email.toLowerCase())
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: transformProfile(data), error: null };
}

export async function fetchAllProfiles(): Promise<{ data: AgentProfile[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('agent_profiles')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data || []).map(d => transformProfile(d)!) , error: null };
}

export interface UserWithProfile {
  email: string;
  name: string | null;
  role: string;
  created_at: string;
  profile: AgentProfile | null;
}

export async function fetchAllUsersWithProfiles(): Promise<{ data: UserWithProfile[] | null; error: string | null }> {
  // Fetch all users from user_roles
  const { data: users, error: usersError } = await supabase
    .from('user_roles')
    .select('email, name, role, created_at')
    .order('name', { ascending: true, nullsFirst: false });

  if (usersError) {
    return { data: null, error: usersError.message };
  }

  // Fetch all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('agent_profiles')
    .select('*');

  if (profilesError) {
    return { data: null, error: profilesError.message };
  }

  // Create a map of profiles by email
  const profileMap = new Map<string, AgentProfile>();
  (profiles || []).forEach(p => {
    profileMap.set(p.email.toLowerCase(), transformProfile(p)!);
  });

  // Merge users with their profiles
  const usersWithProfiles: UserWithProfile[] = (users || []).map(user => ({
    email: user.email,
    name: user.name,
    role: user.role,
    created_at: user.created_at,
    profile: profileMap.get(user.email.toLowerCase()) || null
  }));

  return { data: usersWithProfiles, error: null };
}

// Sync profile data to agent_directory
async function syncProfileToDirectory(input: AgentProfileInput): Promise<void> {
  // Aggregate quota (sum of all quota types for backward compatibility)
  const quota = (input.quota_email || 0) + (input.quota_chat || 0) + (input.quota_phone || 0);
  
  const syncData = {
    email: input.email.toLowerCase(),
    agent_name: input.agent_name || null,
    agent_tag: input.agent_tag || null,
    zendesk_instance: input.zendesk_instance || null,
    support_account: input.support_account || null,
    support_type: Array.isArray(input.support_type) ? input.support_type.join(', ') : null,
    views: input.views || [],
    ticket_assignment_view_id: input.ticket_assignment_enabled ? input.ticket_assignment_view_id : null,
    quota: quota || null,
    mon_schedule: input.mon_schedule || null,
    tue_schedule: input.tue_schedule || null,
    wed_schedule: input.wed_schedule || null,
    thu_schedule: input.thu_schedule || null,
    fri_schedule: input.fri_schedule || null,
    sat_schedule: input.sat_schedule || null,
    sun_schedule: input.sun_schedule || null,
    break_schedule: input.break_schedule || null,
    // Derive weekday OT summary from first available Mon-Fri OT schedule
    weekday_ot_schedule: input.mon_ot_schedule || input.tue_ot_schedule || 
                         input.wed_ot_schedule || input.thu_ot_schedule || 
                         input.fri_ot_schedule || null,
    // Derive weekend OT summary from first available Sat-Sun OT schedule
    weekend_ot_schedule: input.sat_ot_schedule || input.sun_ot_schedule || null,
    // Per-day OT schedules
    mon_ot_schedule: input.mon_ot_schedule || null,
    tue_ot_schedule: input.tue_ot_schedule || null,
    wed_ot_schedule: input.wed_ot_schedule || null,
    thu_ot_schedule: input.thu_ot_schedule || null,
    fri_ot_schedule: input.fri_ot_schedule || null,
    sat_ot_schedule: input.sat_ot_schedule || null,
    sun_ot_schedule: input.sun_ot_schedule || null,
    day_off: input.day_off || [],
    upwork_contract_id: input.upwork_contract_id || null,  // Synced but removed from Master Directory display
    // Computed summary fields for Master Directory display
    weekday_schedule: input.mon_schedule || null,
    weekend_schedule: input.sat_schedule || null,
  };

  await supabase
    .from('agent_directory')
    .upsert(syncData, { onConflict: 'email' });
}

export async function upsertProfile(input: AgentProfileInput): Promise<{ data: AgentProfile | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return { data: null, error: 'Not authenticated' };
  }

  // Convert empty strings to null for date fields to avoid PostgreSQL date parsing errors
  const sanitizedInput = {
    ...input,
    birthday: input.birthday?.trim() || null,
    start_date: input.start_date?.trim() || null,
  };

  const dbInput = {
    ...sanitizedInput,
    email: input.email.toLowerCase(),
    rate_history: input.rate_history ? JSON.parse(JSON.stringify(input.rate_history)) : [],
    support_type: input.support_type || [],
    views: input.views || [],
    day_off: input.day_off || [],
  };

  // First check if profile exists
  const { data: existing } = await supabase
    .from('agent_profiles')
    .select('id')
    .eq('email', dbInput.email)
    .maybeSingle();

  let result;
  if (existing) {
    // Update existing profile
    result = await supabase
      .from('agent_profiles')
      .update({
        ...dbInput,
        updated_at: new Date().toISOString()
      })
      .eq('email', dbInput.email)
      .select()
      .single();
  } else {
    // Insert new profile
    result = await supabase
      .from('agent_profiles')
      .insert(dbInput)
      .select()
      .single();
  }

  if (result.error) {
    return { data: null, error: result.error.message };
  }

  // Sync to agent_directory for Master Directory visibility
  try {
    await syncProfileToDirectory(input);
  } catch (syncError) {
    console.error('Failed to sync profile to directory:', syncError);
    // Don't fail the save for sync errors
  }

  return { data: transformProfile(result.data), error: null };
}

// Profile Change Requests API

export async function createProfileChangeRequest(
  targetEmail: string,
  fieldName: string,
  currentValue: string | null,
  requestedValue: string,
  reason: string
): Promise<{ data: ProfileChangeRequest | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('profile_change_requests')
    .insert({
      requested_by_email: user.email.toLowerCase(),
      requested_by_name: user.user_metadata?.name || user.email,
      target_email: targetEmail.toLowerCase(),
      field_name: fieldName,
      current_value: currentValue,
      requested_value: requestedValue,
      reason: reason
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as ProfileChangeRequest, error: null };
}

export async function fetchMyChangeRequests(): Promise<{ data: ProfileChangeRequest[] | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('profile_change_requests')
    .select('*')
    .eq('requested_by_email', user.email.toLowerCase())
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as ProfileChangeRequest[], error: null };
}

export async function fetchAllChangeRequests(): Promise<{ data: ProfileChangeRequest[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profile_change_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as ProfileChangeRequest[], error: null };
}

export async function updateChangeRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected',
  reviewerEmail: string
): Promise<{ data: ProfileChangeRequest | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profile_change_requests')
    .update({
      status,
      reviewed_by: reviewerEmail,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as ProfileChangeRequest, error: null };
}

// Utility function to calculate days employed
export function calculateDaysEmployed(startDate: string | null): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Utility function to get agent's first name for default agent_name
export function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  return fullName.split(' ')[0] || '';
}