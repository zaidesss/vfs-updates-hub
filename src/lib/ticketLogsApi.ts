import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

export interface TicketLog {
  id: string;
  zd_instance: string;
  ticket_id: string;
  status: string;
  timestamp: string;
  ticket_type: string;
  agent_name: string;
  agent_email: string | null;
  created_at: string;
}

export interface TicketGapDaily {
  id: string;
  date: string;
  agent_name: string;
  agent_email: string | null;
  ticket_count: number;
  total_gap_seconds: number;
  avg_gap_seconds: number;
  min_gap_seconds: number | null;
  max_gap_seconds: number | null;
  created_at: string;
}

export interface AgentDashboardData {
  agent_name: string;
  agent_email: string | null;
  dates: {
    date: string;
    email: number;
    chat: number;
    call: number;
    avgGapSeconds: number | null;
    isActive: boolean;
  }[];
}

// Fetch ticket logs for the last 14 days
export async function fetchTicketLogs(
  filters?: {
    agentName?: string;
    startDate?: string;
    endDate?: string;
    ticketType?: string;
    searchTerm?: string;
    zdInstance?: string;
  }
): Promise<TicketLog[]> {
  let query = supabase
    .from('ticket_logs')
    .select('*')
    .order('timestamp', { ascending: false });

  // Default to last 14 days if no date filter
  if (!filters?.startDate && !filters?.endDate) {
    const fourteenDaysAgo = subDays(new Date(), 14).toISOString();
    query = query.gte('timestamp', fourteenDaysAgo);
  }

  if (filters?.startDate) {
    query = query.gte('timestamp', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('timestamp', filters.endDate);
  }

  if (filters?.agentName) {
    query = query.eq('agent_name', filters.agentName);
  }

  if (filters?.ticketType && filters.ticketType !== 'all') {
    query = query.eq('ticket_type', filters.ticketType);
  }

  if (filters?.zdInstance && filters.zdInstance !== 'all') {
    query = query.eq('zd_instance', filters.zdInstance);
  }

  if (filters?.searchTerm) {
    query = query.or(`ticket_id.ilike.%${filters.searchTerm}%,agent_name.ilike.%${filters.searchTerm}%,status.ilike.%${filters.searchTerm}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching ticket logs:', error);
    throw error;
  }

  return data || [];
}

// Fetch gap data for the last 14 days
export async function fetchTicketGaps(agentName?: string): Promise<TicketGapDaily[]> {
  const fourteenDaysAgo = subDays(new Date(), 14).toISOString().split('T')[0];

  let query = supabase
    .from('ticket_gap_daily')
    .select('*')
    .gte('date', fourteenDaysAgo)
    .order('date', { ascending: false });

  if (agentName) {
    query = query.eq('agent_name', agentName);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching ticket gaps:', error);
    throw error;
  }

  return data || [];
}

// Get dashboard data grouped by agent and date
export async function fetchDashboardData(zdInstance?: string): Promise<AgentDashboardData[]> {
  const fourteenDaysAgo = subDays(new Date(), 14).toISOString();

  // Fetch ticket logs
  let logsQuery = supabase
    .from('ticket_logs')
    .select('agent_name, agent_email, timestamp, ticket_type')
    .gte('timestamp', fourteenDaysAgo)
    .order('agent_name');

  if (zdInstance) {
    logsQuery = logsQuery.eq('zd_instance', zdInstance);
  }

  const { data: logs, error: logsError } = await logsQuery;

  if (logsError) {
    console.error('Error fetching logs for dashboard:', logsError);
    throw logsError;
  }

  // Fetch gap data
  const { data: gaps, error: gapsError } = await supabase
    .from('ticket_gap_daily')
    .select('*')
    .gte('date', fourteenDaysAgo.split('T')[0]);

  if (gapsError) {
    console.error('Error fetching gaps for dashboard:', gapsError);
  }

  // Fetch active agent profiles
  const { data: profiles } = await supabase
    .from('agent_profiles')
    .select('email, employment_status');

  const activeEmails = new Set(
    (profiles || [])
      .filter(p => p.employment_status === 'Active')
      .map(p => p.email?.toLowerCase())
  );

  // Generate date range (last 14 days)
  const dates: string[] = [];
  for (let i = 13; i >= 0; i--) {
    dates.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
  }

  // Group by agent
  const agentMap: Record<string, { email: string | null; counts: Record<string, { email: number; chat: number; call: number }> }> = {};

  for (const log of logs || []) {
    if (!agentMap[log.agent_name]) {
      agentMap[log.agent_name] = { email: log.agent_email, counts: {} };
    }

    const logDate = format(new Date(log.timestamp), 'yyyy-MM-dd');
    if (!agentMap[log.agent_name].counts[logDate]) {
      agentMap[log.agent_name].counts[logDate] = { email: 0, chat: 0, call: 0 };
    }

    const type = log.ticket_type.toLowerCase();
    if (type === 'email') {
      agentMap[log.agent_name].counts[logDate].email++;
    } else if (type === 'chat') {
      agentMap[log.agent_name].counts[logDate].chat++;
    } else if (type === 'call') {
      agentMap[log.agent_name].counts[logDate].call++;
    }
  }

  // Create gap lookup
  const gapLookup: Record<string, number | null> = {};
  for (const gap of gaps || []) {
    gapLookup[`${gap.agent_name}-${gap.date}`] = gap.avg_gap_seconds;
  }

  // Build result
  const result: AgentDashboardData[] = Object.entries(agentMap).map(([agentName, data]) => {
    const isActive = data.email ? activeEmails.has(data.email.toLowerCase()) : false;

    return {
      agent_name: agentName,
      agent_email: data.email,
      dates: dates.map(date => ({
        date,
        email: data.counts[date]?.email || 0,
        chat: data.counts[date]?.chat || 0,
        call: data.counts[date]?.call || 0,
        avgGapSeconds: gapLookup[`${agentName}-${date}`] ?? null,
        isActive,
      })),
    };
  });

  return result.sort((a, b) => a.agent_name.localeCompare(b.agent_name));
}

// Format seconds to readable string
export function formatGapTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return 'N/A';
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

// Get unique agent names from ticket logs
export async function fetchUniqueAgents(): Promise<string[]> {
  const { data, error } = await supabase
    .from('ticket_logs')
    .select('agent_name')
    .order('agent_name');

  if (error) {
    console.error('Error fetching agents:', error);
    return [];
  }

  const unique = [...new Set((data || []).map(d => d.agent_name))];
  return unique;
}
