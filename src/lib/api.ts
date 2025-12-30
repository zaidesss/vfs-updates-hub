import { Agent, Update, Acknowledgement } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { mockAgents, mockUpdates, mockAcknowledgements } from '@/lib/mockData';

// Flag to control whether to use the real API or mock data
const USE_MOCK_DATA = false;

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

async function callEdgeFunction<T>(action: string, body?: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const { data, error } = await supabase.functions.invoke('google-sheets-api', {
      body: { action, ...body },
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
  
  const result = await callEdgeFunction<Acknowledgement[]>('acknowledgements');
  
  // Fallback to mock data if API fails  
  if (result.error || !result.data) {
    console.log('Falling back to mock acknowledgements data');
    return { data: mockAcknowledgements, error: null };
  }
  
  return result;
}

export async function acknowledgeUpdate(updateId: string, agentEmail: string): Promise<ApiResponse<{ ok: boolean; acknowledged_at: string }>> {
  if (USE_MOCK_DATA) {
    return { 
      data: { ok: true, acknowledged_at: new Date().toISOString() }, 
      error: null 
    };
  }
  
  return callEdgeFunction('ack', { update_id: updateId, agent_email: agentEmail });
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
