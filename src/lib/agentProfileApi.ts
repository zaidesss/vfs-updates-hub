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

export async function upsertProfile(input: AgentProfileInput): Promise<{ data: AgentProfile | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return { data: null, error: 'Not authenticated' };
  }

  const dbInput = {
    ...input,
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
