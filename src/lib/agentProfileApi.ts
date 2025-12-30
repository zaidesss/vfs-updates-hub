import { supabase } from '@/integrations/supabase/client';

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

  return { data: data as AgentProfile | null, error: null };
}

export async function fetchAllProfiles(): Promise<{ data: AgentProfile[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('agent_profiles')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as AgentProfile[], error: null };
}

export async function upsertProfile(input: AgentProfileInput): Promise<{ data: AgentProfile | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return { data: null, error: 'Not authenticated' };
  }

  // First check if profile exists
  const { data: existing } = await supabase
    .from('agent_profiles')
    .select('id')
    .eq('email', input.email.toLowerCase())
    .maybeSingle();

  let result;
  if (existing) {
    // Update existing profile
    result = await supabase
      .from('agent_profiles')
      .update({
        ...input,
        email: input.email.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('email', input.email.toLowerCase())
      .select()
      .single();
  } else {
    // Insert new profile
    result = await supabase
      .from('agent_profiles')
      .insert({
        ...input,
        email: input.email.toLowerCase()
      })
      .select()
      .single();
  }

  if (result.error) {
    return { data: null, error: result.error.message };
  }

  return { data: result.data as AgentProfile, error: null };
}
