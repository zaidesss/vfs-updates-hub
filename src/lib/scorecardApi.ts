import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isWithinInterval, parseISO } from 'date-fns';

// Types
export interface ScorecardConfig {
  id: string;
  support_type: string;
  metric_key: string;
  weight: number;
  goal: number;
  is_enabled: boolean;
  display_order: number;
}

export interface AgentProfile {
  id: string;
  email: string;
  full_name: string | null;
  agent_name: string | null;
  position: string | null;
  employment_status: string | null;
  quota_email: number | null;
  quota_chat: number | null;
  quota_phone: number | null;
  quota_ot_email: number | null;
  day_off: string[] | null;
  mon_schedule: string | null;
  tue_schedule: string | null;
  wed_schedule: string | null;
  thu_schedule: string | null;
  fri_schedule: string | null;
  sat_schedule: string | null;
  sun_schedule: string | null;
}

export interface AgentScorecard {
  agent: AgentProfile;
  productivity: number | null;
  productivityCount: number;
  callAht: number | null;
  chatAht: number | null;
  chatFrt: number | null;
  qa: number | null;
  revalida: number | null;
  reliability: number | null;
  otProductivity: number | null;
  orderEscalation: number | null; // For Logistics - manual percentage input
  finalScore: number | null;
  isOnLeave: boolean;
  scheduledDays: number;
  daysPresent: number;
  approvedLeaveDays: number;
  plannedLeaveDays: number;
  unplannedOutageDays: number;
  isSaved?: boolean;
}

export interface SavedScorecard {
  id: string;
  week_start: string;
  week_end: string;
  support_type: string;
  agent_email: string;
  agent_name: string | null;
  productivity: number | null;
  productivity_count: number | null;
  call_aht_seconds: number | null;
  chat_aht_seconds: number | null;
  chat_frt_seconds: number | null;
  qa: number | null;
  revalida: number | null;
  reliability: number | null;
  ot_productivity: number | null;
  final_score: number | null;
  scheduled_days: number | null;
  days_present: number | null;
  approved_leave_days: number | null;
  is_on_leave: boolean | null;
  saved_by: string;
  saved_at: string;
}

export interface ZendeskAgentMetrics {
  agent_email: string;
  call_aht_seconds: number | null;
  chat_aht_seconds: number | null;
  chat_frt_seconds: number | null;
  total_calls: number | null;
  total_chats: number | null;
  order_escalation: number | null;
}

// Constants
export const SUPPORT_TYPES = [
  'Hybrid Support',
  'Phone Support',
  'Chat Support',
  'Email Support',
  'Logistics'
] as const;

export const EXCLUDED_POSITIONS = ['Team Lead', 'Technical Support'];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// RPC result type for get_weekly_scorecard_data
interface ScorecardRPCResult {
  agent_email: string;
  agent_name: string | null;
  agent_position: string | null;
  profile_id: string;
  quota_email: number | null;
  quota_chat: number | null;
  quota_phone: number | null;
  quota_ot_email: number | null;
  day_off: string[] | null;
  mon_schedule: string | null;
  tue_schedule: string | null;
  wed_schedule: string | null;
  thu_schedule: string | null;
  fri_schedule: string | null;
  sat_schedule: string | null;
  sun_schedule: string | null;
  email_count: number;
  chat_count: number;
  call_count: number;
  ot_email_count: number;
  qa_average: number | null;
  revalida_score: number | null;
  days_with_login: number;
  approved_leave_days: number;
  planned_leave_days: number;
  unplanned_outage_days: number;
  call_aht_seconds: number | null;
  chat_aht_seconds: number | null;
  chat_frt_seconds: number | null;
  order_escalation: number | null;
  is_saved: boolean;
}

// Fetch scorecard configuration for a support type
export async function fetchScorecardConfig(supportType: string): Promise<ScorecardConfig[]> {
  const { data, error } = await supabase
    .from('scorecard_config')
    .select('*')
    .eq('support_type', supportType)
    .eq('is_enabled', true)
    .order('display_order');

  if (error) throw error;
  return data || [];
}

// Get eligible agents based on position filter
// When supportType is 'all', fetch all agents across all support types
export async function fetchEligibleAgents(supportType: string): Promise<AgentProfile[]> {
  let query = supabase
    .from('agent_profiles')
    .select('id, email, full_name, agent_name, position, employment_status, quota_email, quota_chat, quota_phone, quota_ot_email, day_off, mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule')
    .neq('employment_status', 'Terminated')
    .not('position', 'in', `(${EXCLUDED_POSITIONS.map(p => `"${p}"`).join(',')})`)
    .order('full_name');
    
  // Only filter by position if not 'all'
  if (supportType !== 'all') {
    query = query.eq('position', supportType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as AgentProfile[];
}

// Coverage override type for schedule adjustments
interface CoverageOverride {
  agent_id: string;
  date: string;
  override_start: string;
  override_end: string;
}

// Fetch coverage overrides for a date range
async function fetchCoverageOverridesForWeek(
  weekStart: string,
  weekEnd: string
): Promise<CoverageOverride[]> {
  const { data, error } = await supabase
    .from('coverage_overrides')
    .select('agent_id, date, override_start, override_end')
    .gte('date', weekStart)
    .lte('date', weekEnd);

  if (error) {
    console.error('Error fetching coverage overrides:', error);
    return [];
  }
  return data || [];
}

// Build a lookup map: agent_id -> Set of override dates
function buildOverrideDateMap(overrides: CoverageOverride[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const o of overrides) {
    if (!map.has(o.agent_id)) map.set(o.agent_id, new Set());
    map.get(o.agent_id)!.add(o.date);
  }
  return map;
}

// Calculate scheduled working days for a week (excluding day_off, respecting overrides)
export function getScheduledDays(
  profile: AgentProfile,
  weekStart: Date,
  weekEnd: Date,
  overrideDates?: Set<string>
): number {
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  let scheduledDays = 0;

  for (const day of days) {
    const dayStr = format(day, 'yyyy-MM-dd');
    
    // If there's a coverage override for this day, it counts as scheduled
    if (overrideDates?.has(dayStr)) {
      scheduledDays++;
      continue;
    }
    
    const dayName = DAY_NAMES[day.getDay()];
    if (!profile.day_off?.includes(dayName)) {
      // Also check if the day has a schedule set
      const scheduleField = `${dayName.toLowerCase()}_schedule` as keyof AgentProfile;
      const schedule = profile[scheduleField];
      if (schedule && schedule !== 'Day Off' && schedule !== '') {
        scheduledDays++;
      } else if (!schedule) {
        // If no schedule field, count as scheduled if not in day_off
        scheduledDays++;
      }
    }
  }

  return scheduledDays;
}

// Count approved leave days within a week
export function countApprovedLeaveDays(
  leaveRequests: Array<{ start_date: string; end_date: string; status: string; agent_email: string; outage_reason?: string }>,
  agentEmail: string,
  weekStart: Date,
  weekEnd: Date
): number {
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  let leaveDays = 0;

  const approvedLeaves = leaveRequests.filter(
    lr => lr.agent_email.toLowerCase() === agentEmail.toLowerCase() && lr.status === 'approved'
  );

  for (const day of weekDays) {
    for (const leave of approvedLeaves) {
      const leaveStart = parseISO(leave.start_date);
      const leaveEnd = parseISO(leave.end_date);
      if (isWithinInterval(day, { start: leaveStart, end: leaveEnd })) {
        leaveDays++;
        break; // Only count once per day
      }
    }
  }

  return leaveDays;
}

// Count outage days by type (planned vs unplanned) for reliability deduction calculation
// Planned Leave = 0% deduction, all other outage reasons = 1% deduction per day
export function countOutageDaysByType(
  leaveRequests: Array<{ start_date: string; end_date: string; status: string; agent_email: string; outage_reason?: string }>,
  agentEmail: string,
  weekStart: Date,
  weekEnd: Date
): { plannedLeaveDays: number; unplannedOutageDays: number } {
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  let plannedLeaveDays = 0;
  let unplannedOutageDays = 0;

  const approvedLeaves = leaveRequests.filter(
    lr => lr.agent_email.toLowerCase() === agentEmail.toLowerCase() && lr.status === 'approved'
  );

  // Track which days have been counted to avoid double-counting
  const countedDays = new Map<string, string>(); // date -> outage_reason

  for (const day of weekDays) {
    const dayStr = format(day, 'yyyy-MM-dd');
    for (const leave of approvedLeaves) {
      const leaveStart = parseISO(leave.start_date);
      const leaveEnd = parseISO(leave.end_date);
      if (isWithinInterval(day, { start: leaveStart, end: leaveEnd })) {
        // Only count each day once (prefer planned leave if overlapping)
        if (!countedDays.has(dayStr)) {
          countedDays.set(dayStr, leave.outage_reason || 'Unplanned');
        } else if (leave.outage_reason === 'Planned Leave' && countedDays.get(dayStr) !== 'Planned Leave') {
          countedDays.set(dayStr, 'Planned Leave');
        }
      }
    }
  }

  // Count by type
  for (const reason of countedDays.values()) {
    if (reason === 'Planned Leave') {
      plannedLeaveDays++;
    } else {
      unplannedOutageDays++;
    }
  }

  return { plannedLeaveDays, unplannedOutageDays };
}

// Count days with LOGIN event
export function countDaysWithLogin(
  profileEvents: Array<{ profile_id: string; event_type: string; created_at: string }>,
  profileId: string,
  weekStart: Date,
  weekEnd: Date
): number {
  const loginDays = new Set<string>();

  const events = profileEvents.filter(
    e => e.profile_id === profileId && e.event_type === 'LOGIN'
  );

  for (const event of events) {
    const eventDate = parseISO(event.created_at);
    if (isWithinInterval(eventDate, { start: weekStart, end: weekEnd })) {
      loginDays.add(format(eventDate, 'yyyy-MM-dd'));
    }
  }

  return loginDays.size;
}

// Get weekly quota based on support type
export function getWeeklyQuota(profile: AgentProfile, supportType: string, workingDays: number): number {
  switch (supportType) {
    case 'Email Support':
      return (profile.quota_email || 0) * workingDays;
    case 'Chat Support':
      return (profile.quota_chat || 0) * workingDays;
    case 'Phone Support':
      return (profile.quota_phone || 0) * workingDays;
    case 'Hybrid Support':
      return ((profile.quota_email || 0) + (profile.quota_chat || 0) + (profile.quota_phone || 0)) * workingDays;
    default:
      return 0;
  }
}

// Calculate metric score based on goal and metric type
export function calculateMetricScore(value: number, goal: number, metricKey: string): number {
  if (goal === 0) return 0;

  // For AHT/FRT, lower is better (goal / actual)
  if (['call_aht', 'chat_aht', 'chat_frt'].includes(metricKey)) {
    if (value === 0) return 0;
    return Math.min(100, (goal / value) * 100);
  }

  // For other metrics, higher is better (actual / goal)
  return Math.min(100, (value / goal) * 100);
}

// Fetch Zendesk metrics from cache table
export async function fetchZendeskMetrics(
  weekStart: string,
  weekEnd: string,
  agentEmails?: string[]
): Promise<ZendeskAgentMetrics[]> {
  let query = supabase
    .from('zendesk_agent_metrics')
    .select('agent_email, call_aht_seconds, chat_aht_seconds, chat_frt_seconds, total_calls, total_chats, order_escalation')
    .eq('week_start', weekStart)
    .eq('week_end', weekEnd);

  if (agentEmails && agentEmails.length > 0) {
    query = query.in('agent_email', agentEmails.map(e => e.toLowerCase()));
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching Zendesk metrics:', error);
    return [];
  }

  return data || [];
}

// Fetch saved scorecards for a specific week and support type
export async function fetchSavedScorecard(
  weekStart: string,
  weekEnd: string,
  supportType: string
): Promise<SavedScorecard[]> {
  const { data, error } = await supabase
    .from('saved_scorecards')
    .select('*')
    .eq('week_start', weekStart)
    .eq('week_end', weekEnd)
    .eq('support_type', supportType);

  if (error) {
    console.error('Error fetching saved scorecard:', error);
    return [];
  }

  return data || [];
}

// Check if a week is saved (optionally for all support types)
export async function isWeekSaved(
  weekStart: string,
  weekEnd: string,
  supportType: string
): Promise<boolean> {
  let query = supabase
    .from('saved_scorecards')
    .select('id', { count: 'exact', head: true })
    .eq('week_start', weekStart)
    .eq('week_end', weekEnd);
  
  // When supportType is 'all', check if any records exist for this week
  if (supportType !== 'all') {
    query = query.eq('support_type', supportType);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error checking saved status:', error);
    return false;
  }

  return (count || 0) > 0;
}

// Save scorecard for a week (admin only)
// Each agent is saved with their own support type (position)
export async function saveScorecard(
  weekStart: string,
  weekEnd: string,
  supportType: string,
  scorecards: AgentScorecard[],
  savedBy: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  const records = scorecards.map(sc => ({
    week_start: weekStart,
    week_end: weekEnd,
    support_type: sc.agent.position || supportType, // Use agent's own position
    agent_email: sc.agent.email.toLowerCase(),
    agent_name: sc.agent.full_name || sc.agent.agent_name,
    productivity: sc.productivity,
    productivity_count: sc.productivityCount,
    call_aht_seconds: sc.callAht,
    chat_aht_seconds: sc.chatAht,
    chat_frt_seconds: sc.chatFrt,
    qa: sc.qa,
    revalida: sc.revalida,
    reliability: sc.reliability,
    ot_productivity: sc.otProductivity,
    final_score: sc.finalScore,
    scheduled_days: sc.scheduledDays,
    days_present: sc.daysPresent,
    approved_leave_days: sc.approvedLeaveDays,
    unplanned_outage_days: sc.unplannedOutageDays,
    is_on_leave: sc.isOnLeave,
    saved_by: savedBy,
    saved_at: now,
  }));

  // Upsert to handle re-saving
  const { error } = await supabase
    .from('saved_scorecards')
    .upsert(records, {
      onConflict: 'week_start,week_end,support_type,agent_email',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('Error saving scorecard:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Fetch weekly scorecard data via consolidated RPC
 * Replaces 10+ parallel queries with a single database call
 */
export async function fetchWeeklyScorecardRPC(
  weekStart: Date,
  weekEnd: Date,
  supportType: string
): Promise<{ data: AgentScorecard[]; fromRPC: boolean }> {
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  try {
    // Fetch RPC data and config in parallel
    const configPromises = supportType === 'all'
      ? SUPPORT_TYPES.map(type => fetchScorecardConfig(type).then(config => ({ type, config })))
      : [fetchScorecardConfig(supportType).then(config => ({ type: supportType, config }))];

    const [rpcResult, configResults, overrides] = await Promise.all([
      supabase.rpc('get_weekly_scorecard_data', {
        p_week_start: weekStartStr,
        p_week_end: weekEndStr,
        p_support_type: supportType,
      }),
      Promise.all(configPromises),
      fetchCoverageOverridesForWeek(weekStartStr, weekEndStr),
    ]);

    if (rpcResult.error) {
      console.error('RPC error, falling back to legacy fetch:', rpcResult.error);
      // Fallback to legacy function
      const legacyData = await fetchWeeklyScorecard(weekStart, weekEnd, supportType);
      return { data: legacyData, fromRPC: false };
    }

    const rpcData = (rpcResult.data || []) as unknown as ScorecardRPCResult[];
    const configMap = new Map(configResults.map(r => [r.type, r.config]));
    const config = supportType === 'all' ? [] : (configResults[0]?.config || []);
    const overrideDateMap = buildOverrideDateMap(overrides);

    // Transform RPC results to AgentScorecard format
    const scorecards: AgentScorecard[] = rpcData.map(row => {
      const agentSupportType = row.agent_position || supportType;
      
      // Calculate scheduled days from day_off + schedules + overrides
      const agentOverrideDates = overrideDateMap.get(row.profile_id);
      const scheduledDays = calculateScheduledDaysFromRPC(row, weekStart, weekEnd, agentOverrideDates);
      
      // New reliability calculation: 100% - (unplanned_outage_days × 1%)
      // Planned Leave = no deduction, all other outage reasons = 1% deduction per day
      const reliability = Math.max(0, 100 - row.unplanned_outage_days);
      
      // Agent is considered on leave only if they have planned leave covering all scheduled days
      const isOnLeave = row.planned_leave_days >= scheduledDays;
      
      // For productivity quota calculation, adjust by total approved leave
      const adjustedScheduledDays = Math.max(0, scheduledDays - row.approved_leave_days);

      // Calculate productivity based on support type
      let productivityCount = 0;
      switch (agentSupportType) {
        case 'Email Support':
          productivityCount = row.email_count;
          break;
        case 'Chat Support':
          productivityCount = row.chat_count;
          break;
        case 'Phone Support':
          productivityCount = row.call_count;
          break;
        case 'Hybrid Support':
          productivityCount = row.email_count + row.chat_count + row.call_count;
          break;
      }

      // Get weekly quota
      const agentProfile: AgentProfile = {
        id: row.profile_id,
        email: row.agent_email,
        full_name: row.agent_name,
        agent_name: row.agent_name,
        position: row.agent_position,
        employment_status: 'Active',
        quota_email: row.quota_email,
        quota_chat: row.quota_chat,
        quota_phone: row.quota_phone,
        quota_ot_email: row.quota_ot_email,
        day_off: row.day_off,
        mon_schedule: row.mon_schedule,
        tue_schedule: row.tue_schedule,
        wed_schedule: row.wed_schedule,
        thu_schedule: row.thu_schedule,
        fri_schedule: row.fri_schedule,
        sat_schedule: row.sat_schedule,
        sun_schedule: row.sun_schedule,
      };

      const weeklyQuota = getWeeklyQuota(agentProfile, agentSupportType, adjustedScheduledDays);
      const productivity = weeklyQuota > 0 ? (productivityCount / weeklyQuota) * 100 : null;

      // Calculate OT productivity: (OT Email Count / (quota_ot_email × days with OT work)) × 100
      // For now, we use days_with_login as an approximation for OT days worked
      // TODO: Track actual OT days separately if needed
      let otProductivity: number | null = null;
      if (row.ot_email_count > 0 && row.quota_ot_email && row.quota_ot_email > 0) {
        // Use days_with_login as approximation for OT days worked
        const otDaysWorked = row.days_with_login > 0 ? row.days_with_login : 1;
        const weeklyOtQuota = row.quota_ot_email * otDaysWorked;
        otProductivity = weeklyOtQuota > 0 ? (row.ot_email_count / weeklyOtQuota) * 100 : null;
      }

      // Calculate final score
      const agentConfig = supportType === 'all'
        ? (configMap.get(agentSupportType) || [])
        : config;

      let finalScore = 0;
      let totalWeight = 0;

      for (const c of agentConfig) {
        let metricValue: number | null = null;

        switch (c.metric_key) {
          case 'productivity':
            metricValue = productivity;
            break;
          case 'reliability':
            metricValue = reliability;
            break;
          case 'qa':
            metricValue = row.qa_average;
            break;
          case 'revalida':
            metricValue = row.revalida_score;
            break;
          case 'call_aht':
            metricValue = row.call_aht_seconds;
            break;
          case 'chat_aht':
            metricValue = row.chat_aht_seconds;
            break;
          case 'chat_frt':
            metricValue = row.chat_frt_seconds;
            break;
          case 'ot_productivity':
            metricValue = otProductivity;
            break;
          case 'order_escalation':
            metricValue = row.order_escalation;
            break;
        }

        if (metricValue !== null && metricValue !== undefined) {
          const score = calculateMetricScore(metricValue, c.goal, c.metric_key);
          finalScore += score * (c.weight / 100);
          totalWeight += c.weight;
        }
      }

      // Normalize if some metrics are missing
      if (totalWeight > 0 && totalWeight < 100) {
        finalScore = (finalScore / totalWeight) * 100;
      }

      return {
        agent: agentProfile,
        productivity,
        productivityCount,
        callAht: row.call_aht_seconds,
        chatAht: row.chat_aht_seconds,
        chatFrt: row.chat_frt_seconds,
        qa: row.qa_average,
        revalida: row.revalida_score,
        reliability,
        otProductivity,
        orderEscalation: row.order_escalation,
        finalScore: isOnLeave ? null : finalScore,
        isOnLeave,
        scheduledDays,
        daysPresent: row.days_with_login,
        approvedLeaveDays: row.approved_leave_days,
        plannedLeaveDays: row.planned_leave_days,
        unplannedOutageDays: row.unplanned_outage_days,
        isSaved: row.is_saved,
      };
    });

    return { data: scorecards, fromRPC: true };
  } catch (err) {
    console.error('RPC exception, falling back to legacy fetch:', err);
    const legacyData = await fetchWeeklyScorecard(weekStart, weekEnd, supportType);
    return { data: legacyData, fromRPC: false };
  }
}

// Helper to calculate scheduled days from RPC result
function calculateScheduledDaysFromRPC(
  row: ScorecardRPCResult,
  weekStart: Date,
  weekEnd: Date,
  overrideDates?: Set<string>
): number {
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  let scheduledDays = 0;

  for (const day of days) {
    const dayStr = format(day, 'yyyy-MM-dd');
    
    // If there's a coverage override for this day, it counts as scheduled
    if (overrideDates?.has(dayStr)) {
      scheduledDays++;
      continue;
    }
    
    const dayName = DAY_NAMES[day.getDay()];
    if (!row.day_off?.includes(dayName)) {
      const scheduleMap: Record<string, string | null> = {
        'Sun': row.sun_schedule,
        'Mon': row.mon_schedule,
        'Tue': row.tue_schedule,
        'Wed': row.wed_schedule,
        'Thu': row.thu_schedule,
        'Fri': row.fri_schedule,
        'Sat': row.sat_schedule,
      };
      const schedule = scheduleMap[dayName];
      if (schedule && schedule !== 'Day Off' && schedule !== '') {
        scheduledDays++;
      } else if (!schedule) {
        scheduledDays++;
      }
    }
  }

  return scheduledDays;
}

// Fetch all data for weekly scorecard (legacy function)
// When supportType is 'all', fetches all agents and calculates scores using each agent's own position config
export async function fetchWeeklyScorecard(
  weekStart: Date,
  weekEnd: Date,
  supportType: string
): Promise<AgentScorecard[]> {
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  // When 'all', we need to fetch configs for all support types
  const configPromises = supportType === 'all' 
    ? SUPPORT_TYPES.map(type => fetchScorecardConfig(type).then(config => ({ type, config })))
    : [fetchScorecardConfig(supportType).then(config => ({ type: supportType, config }))];

  // When 'all', we need to fetch saved scorecards for all support types
  const savedPromises = supportType === 'all'
    ? SUPPORT_TYPES.map(type => fetchSavedScorecard(weekStartStr, weekEndStr, type))
    : [fetchSavedScorecard(weekStartStr, weekEndStr, supportType)];

  // Fetch all required data in parallel
  const [agentsResult, configResults, ticketLogsResult, qaResult, eventsResult, leaveResult, zendeskMetricsResult, savedResults, revalidaBatchesResult, coverageOverrides] = await Promise.all([
    fetchEligibleAgents(supportType),
    Promise.all(configPromises),
    supabase
      .from('ticket_logs')
      .select('agent_email, ticket_type, timestamp')
      .gte('timestamp', weekStart.toISOString())
      .lte('timestamp', weekEnd.toISOString()),
    supabase
      .from('qa_evaluations')
      .select('agent_email, percentage, work_week_start, audit_date')
      .gte('work_week_start', weekStartStr)
      .lte('work_week_start', weekEndStr),
    supabase
      .from('profile_events')
      .select('profile_id, event_type, created_at')
      .eq('event_type', 'LOGIN')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString()),
    supabase
      .from('leave_requests')
      .select('agent_email, start_date, end_date, status, outage_reason')
      .eq('status', 'approved')
      .lte('start_date', weekEndStr)
      .gte('end_date', weekStartStr),
    fetchZendeskMetrics(weekStartStr, weekEndStr),
    Promise.all(savedPromises),
    // Fetch Revalida batches whose start_at falls within this week
    supabase
      .from('revalida_batches')
      .select('id')
      .gte('start_at', weekStartStr)
      .lte('start_at', weekEndStr + 'T23:59:59'),
    // Fetch coverage overrides for the week
    fetchCoverageOverridesForWeek(weekStartStr, weekEndStr),
  ]);

  const agents = agentsResult;
  // Build config map by support type for 'all' mode
  const configMap = new Map(configResults.map(r => [r.type, r.config]));
  const config = supportType === 'all' ? [] : (configResults[0]?.config || []);
  const ticketLogs = ticketLogsResult.data || [];
  const qaEvaluations = qaResult.data || [];
  const profileEvents = eventsResult.data || [];
  const leaveRequests = leaveResult.data || [];
  const zendeskMetrics = zendeskMetricsResult;
  // Flatten saved scorecards from all support types
  const savedScorecards = savedResults.flat();
  
  // Fetch Revalida attempts for the week's batches
  const weeklyBatchIds = (revalidaBatchesResult.data || []).map((b: { id: string }) => b.id);
  let revalidaMap = new Map<string, number>();
  
  if (weeklyBatchIds.length > 0) {
    const { data: revalidaAttempts } = await supabase
      .from('revalida_attempts')
      .select('agent_email, final_percent')
      .in('batch_id', weeklyBatchIds)
      .eq('status', 'graded');
    
    for (const attempt of revalidaAttempts || []) {
      if (attempt.final_percent !== null) {
        revalidaMap.set(attempt.agent_email.toLowerCase(), attempt.final_percent);
      }
    }
  }

  // Create lookup maps
  const zendeskMap = new Map(zendeskMetrics.map(m => [m.agent_email.toLowerCase(), m]));
  const savedMap = new Map(savedScorecards.map(s => [s.agent_email.toLowerCase(), s]));
  const overrideDateMap = buildOverrideDateMap(coverageOverrides);

  // Build scorecard for each agent
  const scorecards: AgentScorecard[] = [];

  for (const agent of agents) {
    const agentEmailLower = agent.email.toLowerCase();
    const saved = savedMap.get(agentEmailLower);
    const zendesk = zendeskMap.get(agentEmailLower);

    // If saved, use saved values
    if (saved) {
      scorecards.push({
        agent,
        productivity: saved.productivity,
        productivityCount: saved.productivity_count || 0,
        callAht: saved.call_aht_seconds,
        chatAht: saved.chat_aht_seconds,
        chatFrt: saved.chat_frt_seconds,
        qa: saved.qa,
        revalida: saved.revalida,
        reliability: saved.reliability,
        otProductivity: saved.ot_productivity,
        orderEscalation: (saved as any).order_escalation ?? null,
        finalScore: saved.final_score,
        isOnLeave: saved.is_on_leave || false,
        scheduledDays: saved.scheduled_days || 0,
        daysPresent: saved.days_present || 0,
        approvedLeaveDays: saved.approved_leave_days || 0,
        plannedLeaveDays: (saved as any).planned_leave_days ?? 0,
        unplannedOutageDays: (saved as any).unplanned_outage_days ?? 0,
        isSaved: true,
      });
      continue;
    }

    // Calculate live values (with coverage override awareness)
    const agentOverrideDates = overrideDateMap.get(agent.id);
    const scheduledDays = getScheduledDays(agent, weekStart, weekEnd, agentOverrideDates);
    const approvedLeaveDays = countApprovedLeaveDays(leaveRequests, agent.email, weekStart, weekEnd);
    const { plannedLeaveDays, unplannedOutageDays } = countOutageDaysByType(leaveRequests, agent.email, weekStart, weekEnd);
    const adjustedScheduledDays = Math.max(0, scheduledDays - approvedLeaveDays);
    const daysPresent = countDaysWithLogin(profileEvents, agent.id, weekStart, weekEnd);
    
    // New reliability calculation: 100% - (unplanned_outage_days × 1%)
    // Planned Leave = no deduction, all other outage reasons = 1% deduction per day
    const reliability = Math.max(0, 100 - unplannedOutageDays);
    
    // Agent is considered on leave only if they have planned leave covering all scheduled days
    const isOnLeave = plannedLeaveDays >= scheduledDays;

    // Calculate ticket counts
    // Determine which support type to use for this agent's calculations
    const agentSupportType = agent.position || supportType;
    
    const agentTickets = ticketLogs.filter(
      t => t.agent_email?.toLowerCase() === agentEmailLower
    );
    const emailCount = agentTickets.filter(t => t.ticket_type?.toLowerCase() === 'email').length;
    const chatCount = agentTickets.filter(t => t.ticket_type?.toLowerCase() === 'chat').length;
    const callCount = agentTickets.filter(t => t.ticket_type?.toLowerCase() === 'call').length;
    
    let productivityCount = 0;
    switch (agentSupportType) {
      case 'Email Support':
        productivityCount = emailCount;
        break;
      case 'Chat Support':
        productivityCount = chatCount;
        break;
      case 'Phone Support':
        productivityCount = callCount;
        break;
      case 'Hybrid Support':
        productivityCount = emailCount + chatCount + callCount;
        break;
    }

    // Calculate productivity percentage using agent's own support type
    const weeklyQuota = getWeeklyQuota(agent, agentSupportType, adjustedScheduledDays);
    const productivity = weeklyQuota > 0 ? (productivityCount / weeklyQuota) * 100 : null;

    // Calculate QA average
    const agentQA = qaEvaluations.filter(
      q => q.agent_email?.toLowerCase() === agentEmailLower
    );
    const qa = agentQA.length > 0
      ? agentQA.reduce((sum, q) => sum + (q.percentage || 0), 0) / agentQA.length
      : null;

    // Get Zendesk metrics
    const callAht = zendesk?.call_aht_seconds ?? null;
    const chatAht = zendesk?.chat_aht_seconds ?? null;
    const chatFrt = zendesk?.chat_frt_seconds ?? null;

    // Calculate final score based on agent's own position config
    // In 'all' mode, get the config for the agent's specific position
    const agentConfig = supportType === 'all' 
      ? (configMap.get(agentSupportType) || [])
      : config;
    
    let finalScore = 0;
    let totalWeight = 0;

    for (const c of agentConfig) {
      let metricValue: number | null = null;

      switch (c.metric_key) {
        case 'productivity':
          metricValue = productivity;
          break;
        case 'reliability':
          metricValue = reliability;
          break;
        case 'qa':
          metricValue = qa;
          break;
        case 'revalida':
          metricValue = revalidaMap.get(agentEmailLower) ?? null;
          break;
        case 'call_aht':
          metricValue = callAht;
          break;
        case 'chat_aht':
          metricValue = chatAht;
          break;
        case 'chat_frt':
          metricValue = chatFrt;
          break;
        case 'order_escalation':
          metricValue = zendesk?.order_escalation ?? null;
          break;
      }

      if (metricValue !== null && metricValue !== undefined) {
        const score = calculateMetricScore(metricValue, c.goal, c.metric_key);
        finalScore += score * (c.weight / 100);
        totalWeight += c.weight;
      }
    }

    // Normalize if some metrics are missing
    if (totalWeight > 0 && totalWeight < 100) {
      finalScore = (finalScore / totalWeight) * 100;
    }

    scorecards.push({
      agent,
      productivity,
      productivityCount,
      callAht,
      chatAht,
      chatFrt,
      qa,
      revalida: revalidaMap.get(agentEmailLower) ?? null,
      reliability,
      otProductivity: null, // Placeholder
      orderEscalation: zendesk?.order_escalation ?? null,
      finalScore: isOnLeave ? null : finalScore,
      isOnLeave,
      scheduledDays,
      daysPresent,
      approvedLeaveDays,
      plannedLeaveDays,
      unplannedOutageDays,
      isSaved: false,
    });
  }

  return scorecards;
}

// Get color class based on percentage of goal
export function getScoreColor(score: number | null, goal: number = 100): string {
  if (score === null) return 'text-muted-foreground';
  const percentage = (score / goal) * 100;
  if (percentage >= 100) return 'text-green-600 dark:text-green-400';
  if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function getScoreBgColor(score: number | null, goal: number = 100): string {
  if (score === null) return 'bg-muted/30';
  const percentage = (score / goal) * 100;
  if (percentage >= 100) return 'bg-green-100 dark:bg-green-900/30';
  if (percentage >= 80) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

// Format seconds as mm:ss
export function formatSeconds(seconds: number | null): string {
  if (seconds === null) return '-';
  return `${seconds}s`;
}

// Update Zendesk metrics in the database (for admin edits)
export async function updateZendeskMetrics(
  weekStart: string,
  weekEnd: string,
  agentEmail: string,
  updates: {
    call_aht_seconds?: number | null;
    chat_aht_seconds?: number | null;
    chat_frt_seconds?: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('zendesk_agent_metrics')
    .update({
      ...updates,
      fetched_at: new Date().toISOString(), // Mark as updated
    })
    .eq('week_start', weekStart)
    .eq('week_end', weekEnd)
    .eq('agent_email', agentEmail.toLowerCase());

  if (error) {
    console.error('Error updating Zendesk metrics:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Upsert Zendesk metrics (create if not exists, update if exists)
export async function upsertZendeskMetrics(
  weekStart: string,
  weekEnd: string,
  agentEmail: string,
  updates: {
    call_aht_seconds?: number | null;
    chat_aht_seconds?: number | null;
    chat_frt_seconds?: number | null;
    order_escalation?: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('zendesk_agent_metrics')
    .upsert({
      week_start: weekStart,
      week_end: weekEnd,
      agent_email: agentEmail.toLowerCase(),
      ...updates,
      fetched_at: new Date().toISOString(),
    }, {
      onConflict: 'week_start,week_end,agent_email',
    });

  if (error) {
    console.error('Error upserting Zendesk metrics:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Trigger a manual refresh of Zendesk metrics for a specific support type
export async function triggerMetricsRefresh(
  weekStart: string,
  weekEnd: string,
  supportType: string
): Promise<{ success: boolean; processed?: number; error?: string }> {
  // Fetch agent emails for this support type
  const { data: agents, error: agentsError } = await supabase
    .from('agent_profiles')
    .select('email')
    .eq('position', supportType)
    .neq('employment_status', 'Terminated')
    .not('zendesk_instance', 'is', null);

  if (agentsError) {
    return { success: false, error: agentsError.message };
  }

  const agentEmails = (agents || []).map(a => a.email);
  if (agentEmails.length === 0) {
    return { success: true, processed: 0 };
  }

  // Call edge function with scheduled: true to bypass cache
  const response = await supabase.functions.invoke('fetch-zendesk-metrics', {
    body: {
      scheduled: true, // Bypasses the 1-hour cache
      weekStart,
      weekEnd,
      agentEmails,
    },
  });

  if (response.error) {
    return { success: false, error: response.error.message };
  }

  return { success: true, processed: response.data?.processed || agentEmails.length };
}
