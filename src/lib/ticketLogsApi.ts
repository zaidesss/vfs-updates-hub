import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// Parse a YYYY-MM-DD string without timezone shift
// This prevents the browser from interpreting the date as UTC and shifting it
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Format a UTC timestamp in EST timezone as YYYY-MM-DD
function formatTimestampAsESTDate(timestamp: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));
}

// Convert a date string to EST day boundaries in UTC
// Handles DST automatically by using explicit timezone offsets
export function getESTDayBoundariesUTC(dateStr: string): { start: string; end: string } {
  // Parse date string and create boundaries at EST midnight and 11:59:59 PM
  // Using explicit EST offset parsing handles DST correctly
  const startEST = new Date(`${dateStr}T00:00:00-05:00`);
  const endEST = new Date(`${dateStr}T23:59:59.999-05:00`);
  return {
    start: startEST.toISOString(),
    end: endEST.toISOString()
  };
}

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
    autosolvedChat: number;
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

// Get dashboard data using optimized database function
export async function fetchDashboardData(zdInstance?: string): Promise<{ data: AgentDashboardData[]; dateRange: { startDate: string; endDate: string; displayLabel: string } }> {
  const dateRange = getRollingTwoWeekRange();

  if (!zdInstance) {
    return { data: [], dateRange };
  }

  // Call the optimized database function
  const { data, error } = await supabase.rpc('get_ticket_dashboard_data', {
    p_zd_instance: zdInstance,
    p_start_date: dateRange.startDate,
    p_end_date: dateRange.endDate,
  });

  if (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }

  // Generate date range for the grid
  const dates: string[] = [];
  const [startYear, startMonth, startDay] = dateRange.startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = dateRange.endDate.split('-').map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(format(new Date(d), 'yyyy-MM-dd'));
  }

  // Group the flat data by agent
  const agentMap: Record<string, { 
    email: string | null; 
    isActive: boolean;
    counts: Record<string, { email: number; chat: number; call: number; autosolvedChat: number; avgGapSeconds: number | null }> 
  }> = {};

  for (const row of data || []) {
    const agentName = row.agent_name;
    const logDate = row.log_date; // Already a date string from the DB

    if (!agentMap[agentName]) {
      agentMap[agentName] = { 
        email: row.agent_email, 
        isActive: row.is_logged_in,
        counts: {} 
      };
    }

    if (!agentMap[agentName].counts[logDate]) {
      agentMap[agentName].counts[logDate] = { 
        email: 0, 
        chat: 0, 
        call: 0, 
        autosolvedChat: 0,
        avgGapSeconds: null 
      };
    }

    agentMap[agentName].counts[logDate] = {
      email: Number(row.email_count),
      chat: Number(row.chat_count),
      call: Number(row.call_count),
      autosolvedChat: Number(row.autosolved_chat_count || 0),
      avgGapSeconds: row.avg_gap_seconds ? Number(row.avg_gap_seconds) : null,
    };
  }

  // Build result
  const result: AgentDashboardData[] = Object.entries(agentMap).map(([agentName, agentData]) => ({
    agent_name: agentName,
    agent_email: agentData.email,
    dates: dates.map(date => ({
      date,
      email: agentData.counts[date]?.email || 0,
      chat: agentData.counts[date]?.chat || 0,
      call: agentData.counts[date]?.call || 0,
      autosolvedChat: agentData.counts[date]?.autosolvedChat || 0,
      avgGapSeconds: agentData.counts[date]?.avgGapSeconds ?? null,
      isActive: agentData.isActive,
    })),
  }));

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

// Get unique agent names from agent_profiles (agent_tag is what maps to ticket_logs.agent_name)
export async function fetchUniqueAgents(): Promise<string[]> {
  const { data, error } = await supabase
    .from('agent_profiles')
    .select('agent_tag')
    .not('agent_tag', 'is', null)
    .order('agent_tag');

  if (error) {
    console.error('Error fetching agents:', error);
    return [];
  }

  const unique = [...new Set((data || []).map(d => d.agent_tag).filter(Boolean))] as string[];
  return unique;
}
