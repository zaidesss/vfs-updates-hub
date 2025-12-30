import { Agent, Update, Acknowledgement } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { mockAgents, mockUpdates, mockAcknowledgements } from '@/lib/mockData';

// Flag to control whether to use the real API or mock data
const USE_MOCK_DATA = false;

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface AdminRole {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

// Fetch admin emails from the database
export async function fetchAdminEmails(): Promise<ApiResponse<string[]>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('email')
      .eq('role', 'admin');

    if (error) {
      console.error('Error fetching admin emails:', error);
      return { data: null, error: error.message };
    }

    const emails = data?.map(row => row.email.toLowerCase()) || [];
    return { data: emails, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to fetch admin emails:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Check if an email is an admin
export async function checkIsAdmin(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('email', email.toLowerCase())
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Failed to check admin status:', err);
    return false;
  }
}

// Add a new admin
export async function addAdmin(email: string): Promise<ApiResponse<AdminRole>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({ email: email.toLowerCase(), role: 'admin' })
      .select()
      .single();

    if (error) {
      console.error('Error adding admin:', error);
      return { data: null, error: error.message };
    }

    return { data: data as AdminRole, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to add admin:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Remove an admin
export async function removeAdmin(email: string): Promise<ApiResponse<{ ok: boolean }>> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('email', email.toLowerCase());

    if (error) {
      console.error('Error removing admin:', error);
      return { data: null, error: error.message };
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to remove admin:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Fetch all admins
export async function fetchAdmins(): Promise<ApiResponse<AdminRole[]>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching admins:', error);
      return { data: null, error: error.message };
    }

    return { data: data as AdminRole[], error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to fetch admins:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Fetch all users (non-admin)
export async function fetchUsers(): Promise<ApiResponse<AdminRole[]>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('role', 'user')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return { data: null, error: error.message };
    }

    return { data: data as AdminRole[], error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to fetch users:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Add a new user
export async function addUser(email: string): Promise<ApiResponse<AdminRole>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({ email: email.toLowerCase(), role: 'user' })
      .select()
      .single();

    if (error) {
      console.error('Error adding user:', error);
      return { data: null, error: error.message };
    }

    return { data: data as AdminRole, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to add user:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

// Remove a user
export async function removeUser(email: string): Promise<ApiResponse<{ ok: boolean }>> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('email', email.toLowerCase())
      .eq('role', 'user');

    if (error) {
      console.error('Error removing user:', error);
      return { data: null, error: error.message };
    }

    return { data: { ok: true }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to remove user:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

async function callEdgeFunction<T>(action: string, body?: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    // Get current session for authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('No active session for edge function call');
      return { data: null, error: 'Authentication required. Please log in.' };
    }

    // Call edge function with JWT token
    const { data, error } = await supabase.functions.invoke('google-sheets-api', {
      body: { action, ...body },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      console.error(`API error for ${action}:`, error);
      return { data: null, error: error.message };
    }

    return { data: data as T, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Failed to call ${action}:`, errorMessage);
    return { data: null, error: errorMessage };
  }
}

export async function fetchAgents(): Promise<ApiResponse<Agent[]>> {
  if (USE_MOCK_DATA) {
    return { data: mockAgents, error: null };
  }
  
  const result = await callEdgeFunction<Agent[]>('agents');
  
  // Fallback to mock data if API fails
  if (result.error || !result.data) {
    console.log('Falling back to mock agents data');
    return { data: mockAgents, error: null };
  }
  
  return result;
}

export async function fetchUpdates(): Promise<ApiResponse<Update[]>> {
  if (USE_MOCK_DATA) {
    return { data: mockUpdates, error: null };
  }
  
  const result = await callEdgeFunction<Update[]>('updates');
  
  // Fallback to mock data if API fails
  if (result.error || !result.data) {
    console.log('Falling back to mock updates data');
    return { data: mockUpdates, error: null };
  }
  
  return result;
}

export async function fetchAcknowledgements(): Promise<ApiResponse<Acknowledgement[]>> {
  if (USE_MOCK_DATA) {
    return { data: mockAcknowledgements, error: null };
  }
  
  try {
    const { data, error } = await supabase
      .from('acknowledgements')
      .select('update_id, agent_email, acknowledged_at');

    if (error) {
      console.error('Error fetching acknowledgements:', error);
      return { data: mockAcknowledgements, error: null };
    }

    return { data: data as Acknowledgement[], error: null };
  } catch (err) {
    console.log('Falling back to mock acknowledgements data');
    return { data: mockAcknowledgements, error: null };
  }
}

export async function acknowledgeUpdate(updateId: string, agentEmail: string): Promise<ApiResponse<{ ok: boolean; acknowledged_at: string }>> {
  if (USE_MOCK_DATA) {
    return { 
      data: { ok: true, acknowledged_at: new Date().toISOString() }, 
      error: null 
    };
  }
  
  try {
    const acknowledged_at = new Date().toISOString();
    
    const { error } = await supabase
      .from('acknowledgements')
      .insert({
        update_id: updateId,
        agent_email: agentEmail.toLowerCase(),
        acknowledged_at
      });

    if (error) {
      console.error('Error acknowledging update:', error);
      return { data: null, error: error.message };
    }

    return { data: { ok: true, acknowledged_at }, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to acknowledge update:', errorMessage);
    return { data: null, error: errorMessage };
  }
}

export async function createUpdate(update: Omit<Update, 'id' | 'posted_at'>): Promise<ApiResponse<{ ok: boolean; update: Update }>> {
  if (USE_MOCK_DATA) {
    const newUpdate: Update = {
      ...update,
      id: String(Date.now()),
      posted_at: new Date().toISOString(),
    };
    return { data: { ok: true, update: newUpdate }, error: null };
  }
  
  return callEdgeFunction('create_update', { update });
}
