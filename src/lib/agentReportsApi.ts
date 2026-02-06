import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export type IncidentType = 
  | 'QUOTA_NOT_MET' 
  | 'NO_LOGOUT' 
  | 'HIGH_GAP' 
  | 'EXCESSIVE_RESTARTS' 
  | 'TIME_NOT_MET' 
  | 'LATE_LOGIN' 
  | 'EARLY_OUT' 
  | 'BIO_OVERUSE'
  | 'OVERBREAK';

export type ReportSeverity = 'low' | 'medium' | 'high';
export type ReportStatus = 'open' | 'reviewed' | 'validated' | 'dismissed';

export interface AgentReport {
  id: string;
  agent_email: string;
  agent_name: string;
  profile_id: string | null;
  incident_type: IncidentType;
  incident_date: string;
  severity: ReportSeverity;
  status: ReportStatus;
  details: Record<string, any>;
  frequency_count: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportFilters {
  year?: number;
  month?: number;
  weekStart?: string;
  agentEmail?: string;
  incidentType?: IncidentType;
  status?: ReportStatus;
}

export interface ReportSummary {
  total: number;
  open: number;
  reviewed: number;
  validated: number;
  dismissed: number;
}

// Incident type display configuration
export const INCIDENT_TYPE_CONFIG: Record<IncidentType, { label: string; color: string; icon: string }> = {
  QUOTA_NOT_MET: { label: 'Quota Not Met', color: 'text-amber-600', icon: 'target' },
  NO_LOGOUT: { label: 'No Logout', color: 'text-red-600', icon: 'log-out' },
  HIGH_GAP: { label: 'High Ticket Gap', color: 'text-orange-600', icon: 'clock' },
  EXCESSIVE_RESTARTS: { label: 'Excessive Restarts', color: 'text-purple-600', icon: 'rotate-ccw' },
  TIME_NOT_MET: { label: 'Time Not Met', color: 'text-red-600', icon: 'timer' },
  LATE_LOGIN: { label: 'Late Login', color: 'text-yellow-600', icon: 'log-in' },
  EARLY_OUT: { label: 'Early Out', color: 'text-orange-600', icon: 'door-open' },
  BIO_OVERUSE: { label: 'Bio Overuse', color: 'text-blue-600', icon: 'user' },
  OVERBREAK: { label: 'Over Break', color: 'text-pink-600', icon: 'coffee' },
};

export const SEVERITY_CONFIG: Record<ReportSeverity, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-800' },
  high: { label: 'High', color: 'bg-red-100 text-red-800' },
};

export const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800' },
  reviewed: { label: 'Escalated', color: 'bg-purple-100 text-purple-800' },
  validated: { label: 'Validated', color: 'bg-green-100 text-green-800' },
  dismissed: { label: 'Dismissed', color: 'bg-gray-100 text-gray-800' },
};

// Escalatable incident types that can generate outage requests
export const ESCALATABLE_INCIDENT_TYPES: IncidentType[] = ['LATE_LOGIN', 'EARLY_OUT', 'TIME_NOT_MET', 'EXCESSIVE_RESTARTS'];

/**
 * Check if an incident type can be escalated to an outage request
 */
export function isEscalatableIncident(type: IncidentType): boolean {
  return ESCALATABLE_INCIDENT_TYPES.includes(type);
}

/**
 * Get the outage reason for an escalatable incident type
 */
export function getOutageReasonForIncident(type: IncidentType): string {
  switch (type) {
    case 'LATE_LOGIN':
      return 'Late Login';
    case 'EARLY_OUT':
    case 'TIME_NOT_MET':
      return 'Undertime';
    case 'EXCESSIVE_RESTARTS':
      return 'Equipment Issue';
    default:
      return 'Other';
  }
}

/**
 * Fetch agent reports with optional filters
 */
export async function fetchAgentReports(
  filters: ReportFilters = {}
): Promise<{ data: AgentReport[] | null; error: string | null }> {
  try {
    let query = supabase
      .from('agent_reports')
      .select('*')
      .order('incident_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.year && filters.month) {
      const start = startOfMonth(new Date(filters.year, filters.month - 1));
      const end = endOfMonth(new Date(filters.year, filters.month - 1));
      query = query
        .gte('incident_date', format(start, 'yyyy-MM-dd'))
        .lte('incident_date', format(end, 'yyyy-MM-dd'));
    } else if (filters.weekStart) {
      const weekStart = new Date(filters.weekStart);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      query = query
        .gte('incident_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('incident_date', format(weekEnd, 'yyyy-MM-dd'));
    }

    if (filters.agentEmail) {
      query = query.eq('agent_email', filters.agentEmail.toLowerCase());
    }

    if (filters.incidentType) {
      query = query.eq('incident_type', filters.incidentType);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as AgentReport[], error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * Fetch a single report by ID
 */
export async function fetchReportById(
  reportId: string
): Promise<{ data: AgentReport | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('agent_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as AgentReport, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * Update report status
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  reviewerEmail: string,
  notes?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const updateData: Record<string, any> = {
      status,
      reviewed_by: reviewerEmail,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { error } = await supabase
      .from('agent_reports')
      .update(updateData)
      .eq('id', reportId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get report summary statistics for a date range
 */
export async function getReportSummary(
  year?: number,
  month?: number
): Promise<{ data: ReportSummary | null; error: string | null }> {
  try {
    let query = supabase.from('agent_reports').select('status');

    if (year && month) {
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(new Date(year, month - 1));
      query = query
        .gte('incident_date', format(start, 'yyyy-MM-dd'))
        .lte('incident_date', format(end, 'yyyy-MM-dd'));
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    const summary: ReportSummary = {
      total: data?.length || 0,
      open: data?.filter((r) => r.status === 'open').length || 0,
      reviewed: data?.filter((r) => r.status === 'reviewed').length || 0,
      validated: data?.filter((r) => r.status === 'validated').length || 0,
      dismissed: data?.filter((r) => r.status === 'dismissed').length || 0,
    };

    return { data: summary, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * Get analytics for a specific agent
 */
export async function getAgentAnalytics(
  agentEmail: string,
  startDate: string,
  endDate: string
): Promise<{ 
  data: { 
    byType: Record<IncidentType, number>; 
    byMonth: { month: string; count: number }[];
    trend: 'increasing' | 'decreasing' | 'stable';
  } | null; 
  error: string | null 
}> {
  try {
    const { data, error } = await supabase
      .from('agent_reports')
      .select('incident_type, incident_date')
      .eq('agent_email', agentEmail.toLowerCase())
      .gte('incident_date', startDate)
      .lte('incident_date', endDate);

    if (error) {
      return { data: null, error: error.message };
    }

    // Group by type
    const byType: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    data?.forEach((report) => {
      // Count by type
      byType[report.incident_type] = (byType[report.incident_type] || 0) + 1;
      
      // Count by month
      const month = report.incident_date.substring(0, 7); // YYYY-MM
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    // Convert byMonth to array sorted by month
    const byMonthArray = Object.entries(byMonth)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Determine trend (compare last 2 months)
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (byMonthArray.length >= 2) {
      const last = byMonthArray[byMonthArray.length - 1].count;
      const prev = byMonthArray[byMonthArray.length - 2].count;
      if (last > prev * 1.2) trend = 'increasing';
      else if (last < prev * 0.8) trend = 'decreasing';
    }

    return { 
      data: { 
        byType: byType as Record<IncidentType, number>, 
        byMonth: byMonthArray,
        trend,
      }, 
      error: null 
    };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * Get unique agents with reports for filter dropdown
 */
export async function getAgentsWithReports(): Promise<{ data: { email: string; name: string }[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('agent_reports')
      .select('agent_email, agent_name')
      .order('agent_name');

    if (error) {
      return { data: null, error: error.message };
    }

    // Deduplicate
    const unique = new Map<string, string>();
    data?.forEach((r) => {
      if (!unique.has(r.agent_email)) {
        unique.set(r.agent_email, r.agent_name);
      }
    });

    const agents = Array.from(unique.entries()).map(([email, name]) => ({ email, name }));
    return { data: agents, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * Create a new agent report (used by edge functions or auto-detection)
 */
export async function createAgentReport(
  report: Omit<AgentReport, 'id' | 'created_at' | 'updated_at' | 'reviewed_by' | 'reviewed_at' | 'notes'>
): Promise<{ success: boolean; id?: string; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('agent_reports')
      .insert({
        agent_email: report.agent_email.toLowerCase(),
        agent_name: report.agent_name,
        profile_id: report.profile_id,
        incident_type: report.incident_type,
        incident_date: report.incident_date,
        severity: report.severity || 'medium',
        status: report.status || 'open',
        details: report.details || {},
        frequency_count: report.frequency_count || 1,
      })
      .select('id')
      .single();

    if (error) {
      // Check for duplicate constraint violation
      if (error.code === '23505') {
        return { success: false, error: 'Report already exists for this agent, type, and date' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a report (admin only)
 */
export async function deleteReport(
  reportId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('agent_reports')
      .delete()
      .eq('id', reportId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * EOD Analytics data structure
 */
export interface EODAnalytics {
  date: string;
  attendance: {
    active: number;
    scheduled: number;
    onTime: number;
    onTimeRate: number;
    fullShift: number;
    fullShiftRate: number;
  };
  productivity: {
    total: number;
    email: number;
    chat: number;
    call: number;
    quotaAgents: number;
    quotaMet: number;
    quotaRate: number;
    avgGap: number | null;
  };
  time: {
    avgLogged: number | null;
    avgRequired: number | null;
  };
  compliance: {
    clean: number;
    cleanRate: number;
    incidents: number;
    breakdown: Record<string, number>;
  };
  status: 'good' | 'warning' | 'critical';
  details: string[];
}

/**
 * Fetch EOD team analytics for a specific date
 */
export async function fetchEODAnalytics(
  date?: string
): Promise<{ data: EODAnalytics | null; error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-eod-analytics`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ date, silent: true }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText || 'Failed to fetch analytics' };
    }

    const result = await response.json();
    return { data: result.analytics, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * EOW (End of Week) Analytics data structure
 */
export interface EOWAnalytics {
  weekStart: string;
  weekEnd: string;
  attendance: {
    scheduledDays: number;
    activeDays: number;
    onTimeDays: number;
    fullShiftDays: number;
    onTimeRate: number;
    fullShiftRate: number;
    attendanceRate: number;
  };
  productivity: {
    total: number;
    email: number;
    chat: number;
    call: number;
    quotaAgents: number;
    quotaMet: number;
    quotaRate: number;
    avgGap: number | null;
  };
  time: {
    totalLogged: number;
    totalRequired: number;
    avgLoggedPerDay: number | null;
    avgRequiredPerDay: number | null;
  };
  compliance: {
    totalIncidents: number;
    agentsWithIncidents: number;
    cleanAgents: number;
    cleanRate: number;
    breakdown: Record<string, number>;
  };
  status: 'good' | 'warning' | 'critical';
  details: string[];
}

/**
 * Fetch EOW (End of Week) team analytics
 */
export async function fetchEOWAnalytics(
  weekStart?: string,
  weekEnd?: string
): Promise<{ data: EOWAnalytics | null; error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-weekly-analytics`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ weekStart, weekEnd, silent: true }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText || 'Failed to fetch weekly analytics' };
    }

    const result = await response.json();
    return { data: result.analytics, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}
