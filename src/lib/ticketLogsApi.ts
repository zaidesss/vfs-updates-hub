import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// Get current date in EST timezone
function getESTDate(): { year: number; month: number; day: number; dayOfWeek: number } {
  const now = new Date();
  const estFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  
  const parts = estFormatter.formatToParts(now);
  const dateParts: Record<string, string> = {};
  for (const part of parts) {
    dateParts[part.type] = part.value;
  }
  
  // Map weekday to day number (0=Sun, 1=Mon, etc.)
  const weekdayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  
  return {
    year: parseInt(dateParts.year),
    month: parseInt(dateParts.month),
    day: parseInt(dateParts.day),
    dayOfWeek: weekdayMap[dateParts.weekday] || 0
  };
}

// Calculate rolling 2-week window (previous week + current week, Monday-Sunday)
export function getRollingTwoWeekRange(): { startDate: string; endDate: string; displayLabel: string } {
  const estToday = getESTDate();
  // Create date object from EST values
  const today = new Date(estToday.year, estToday.month - 1, estToday.day);
  const dayOfWeek = estToday.dayOfWeek; // 0=Sun, 1=Mon, etc.
  
  // Calculate Monday of current week
  // If today is Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentWeekMonday = new Date(today);
  currentWeekMonday.setDate(today.getDate() - daysFromMonday);
  
  // Previous week's Monday (7 days before current Monday)
  const previousWeekMonday = new Date(currentWeekMonday);
  previousWeekMonday.setDate(currentWeekMonday.getDate() - 7);
  
  // Current week's Sunday (6 days after current Monday)
  const currentWeekSunday = new Date(currentWeekMonday);
  currentWeekSunday.setDate(currentWeekMonday.getDate() + 6);
  
  return {
    startDate: format(previousWeekMonday, 'yyyy-MM-dd'),
    endDate: format(currentWeekSunday, 'yyyy-MM-dd'),
    displayLabel: `${format(previousWeekMonday, 'M/d')} - ${format(currentWeekSunday, 'M/d')}`
  };
}

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

  // Default to rolling 2-week window if no date filter
  if (!filters?.startDate && !filters?.endDate) {
    const dateRange = getRollingTwoWeekRange();
    query = query.gte('timestamp', `${dateRange.startDate}T00:00:00.000Z`);
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

// Fetch gap data for the rolling 2-week window
export async function fetchTicketGaps(agentName?: string): Promise<TicketGapDaily[]> {
  const dateRange = getRollingTwoWeekRange();

  let query = supabase
    .from('ticket_gap_daily')
    .select('*')
    .gte('date', dateRange.startDate)
    .lte('date', dateRange.endDate)
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
export async function fetchDashboardData(zdInstance?: string): Promise<{ data: AgentDashboardData[]; dateRange: { startDate: string; endDate: string; displayLabel: string } }> {
  const dateRange = getRollingTwoWeekRange();

  // Fetch ticket logs within the rolling 2-week window
  let logsQuery = supabase
    .from('ticket_logs')
    .select('agent_name, agent_email, timestamp, ticket_type')
    .gte('timestamp', `${dateRange.startDate}T00:00:00.000Z`)
    .lte('timestamp', `${dateRange.endDate}T23:59:59.999Z`)
    .order('agent_name');

  if (zdInstance) {
    logsQuery = logsQuery.eq('zd_instance', zdInstance);
  }

  const { data: logs, error: logsError } = await logsQuery;

  if (logsError) {
    console.error('Error fetching logs for dashboard:', logsError);
    throw logsError;
  }

  // Fetch gap data within the rolling 2-week window
  const { data: gaps, error: gapsError } = await supabase
    .from('ticket_gap_daily')
    .select('*')
    .gte('date', dateRange.startDate)
    .lte('date', dateRange.endDate);

  if (gapsError) {
    console.error('Error fetching gaps for dashboard:', gapsError);
  }

  // Fetch agent_directory to map agent_tag → email
  const { data: agentDir } = await supabase
    .from('agent_directory')
    .select('agent_tag, email');

  const tagToEmail: Record<string, string> = {};
  for (const agent of agentDir || []) {
    if (agent.agent_tag && agent.email) {
      tagToEmail[agent.agent_tag.toLowerCase()] = agent.email.toLowerCase();
    }
  }

  // Fetch agent_profiles to get profile IDs
  const { data: profiles } = await supabase
    .from('agent_profiles')
    .select('id, email');

  const emailToProfileId: Record<string, string> = {};
  for (const p of profiles || []) {
    if (p.email) {
      emailToProfileId[p.email.toLowerCase()] = p.id;
    }
  }

  // Fetch profile_status to get current login status
  const { data: statusData } = await supabase
    .from('profile_status')
    .select('profile_id, current_status');

  const profileIdToStatus: Record<string, string> = {};
  for (const s of statusData || []) {
    profileIdToStatus[s.profile_id] = s.current_status;
  }

  // Generate date range from startDate to endDate
  // Parse dates correctly to avoid timezone issues
  const dates: string[] = [];
  const [startYear, startMonth, startDay] = dateRange.startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = dateRange.endDate.split('-').map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(format(new Date(d), 'yyyy-MM-dd'));
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
    // Use lookup chain: agent_name → agent_tag → email → profile_id → current_status
    const agentEmail = tagToEmail[agentName.toLowerCase()];
    const profileId = agentEmail ? emailToProfileId[agentEmail] : null;
    const currentStatus = profileId ? profileIdToStatus[profileId] : null;
    const isActive = currentStatus === 'LOGGED_IN';

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

  return {
    data: result.sort((a, b) => a.agent_name.localeCompare(b.agent_name)),
    dateRange
  };
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
