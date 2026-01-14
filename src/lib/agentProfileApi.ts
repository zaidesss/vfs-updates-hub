import { supabase } from '@/integrations/supabase/client';

export interface RateHistoryEntry {
  date: string;
  rate: number;
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
  // New connectivity fields
  primary_internet_provider: string | null;
  primary_internet_speed: string | null;
  backup_internet_provider: string | null;
  backup_internet_speed: string | null;
  backup_internet_type: string | null;
  // New banking fields
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  // New freelance fields
  upwork_profile_url: string | null;
  upwork_username: string | null;
  // Equipment
  headset_model: string | null;
  // Work setup (Super Admin only)
  work_schedule: string | null;
  employment_status: string | null;
  payment_frequency: string | null;
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
  // New connectivity fields
  primary_internet_provider?: string;
  primary_internet_speed?: string;
  backup_internet_provider?: string;
  backup_internet_speed?: string;
  backup_internet_type?: string;
  // New banking fields
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  // New freelance fields
  upwork_profile_url?: string;
  upwork_username?: string;
  // Equipment
  headset_model?: string;
  // Work setup (Super Admin only)
  work_schedule?: string;
  employment_status?: string;
  payment_frequency?: string;
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
    rate_history: Array.isArray(data.rate_history) ? data.rate_history : []
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
    rate_history: input.rate_history ? JSON.parse(JSON.stringify(input.rate_history)) : []
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
