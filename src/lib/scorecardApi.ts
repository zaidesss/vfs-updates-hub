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
  finalScore: number | null;
  isOnLeave: boolean;
  scheduledDays: number;
  daysPresent: number;
  approvedLeaveDays: number;
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
export async function fetchEligibleAgents(supportType: string): Promise<AgentProfile[]> {
  const { data, error } = await supabase
    .from('agent_profiles')
    .select('id, email, full_name, agent_name, position, employment_status, quota_email, quota_chat, quota_phone, day_off, mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule')
    .neq('employment_status', 'Terminated')
    .not('position', 'in', `(${EXCLUDED_POSITIONS.map(p => `"${p}"`).join(',')})`)
    .eq('position', supportType)
    .order('full_name');

  if (error) throw error;
  return (data || []) as AgentProfile[];
}

// Calculate scheduled working days for a week (excluding day_off)
export function getScheduledDays(profile: AgentProfile, weekStart: Date, weekEnd: Date): number {
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  let scheduledDays = 0;

  for (const day of days) {
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
  leaveRequests: Array<{ start_date: string; end_date: string; status: string; agent_email: string }>,
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

// Fetch all data for weekly scorecard
export async function fetchWeeklyScorecard(
  weekStart: Date,
  weekEnd: Date,
  supportType: string
): Promise<AgentScorecard[]> {
  // Fetch all required data in parallel
  const [agentsResult, configResult, ticketLogsResult, qaResult, eventsResult, leaveResult] = await Promise.all([
    fetchEligibleAgents(supportType),
    fetchScorecardConfig(supportType),
    supabase
      .from('ticket_logs')
      .select('agent_email, ticket_type, timestamp')
      .gte('timestamp', weekStart.toISOString())
      .lte('timestamp', weekEnd.toISOString()),
    supabase
      .from('qa_evaluations')
      .select('agent_email, percentage, audit_date')
      .gte('audit_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('audit_date', format(weekEnd, 'yyyy-MM-dd')),
    supabase
      .from('profile_events')
      .select('profile_id, event_type, created_at')
      .eq('event_type', 'LOGIN')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString()),
    supabase
      .from('leave_requests')
      .select('agent_email, start_date, end_date, status')
      .eq('status', 'approved')
      .lte('start_date', format(weekEnd, 'yyyy-MM-dd'))
      .gte('end_date', format(weekStart, 'yyyy-MM-dd'))
  ]);

  const agents = agentsResult;
  const config = configResult;
  const ticketLogs = ticketLogsResult.data || [];
  const qaEvaluations = qaResult.data || [];
  const profileEvents = eventsResult.data || [];
  const leaveRequests = leaveResult.data || [];

  // Build scorecard for each agent
  const scorecards: AgentScorecard[] = [];

  for (const agent of agents) {
    // Calculate scheduled days
    const scheduledDays = getScheduledDays(agent, weekStart, weekEnd);
    
    // Calculate approved leave days
    const approvedLeaveDays = countApprovedLeaveDays(leaveRequests, agent.email, weekStart, weekEnd);
    
    // Calculate adjusted scheduled days
    const adjustedScheduledDays = Math.max(0, scheduledDays - approvedLeaveDays);
    
    // Count days with login
    const daysPresent = countDaysWithLogin(profileEvents, agent.id, weekStart, weekEnd);
    
    // Calculate reliability
    const reliability = adjustedScheduledDays > 0
      ? Math.min(100, (daysPresent / adjustedScheduledDays) * 100)
      : 100;

    // Check if on full-week leave
    const isOnLeave = approvedLeaveDays >= scheduledDays;

    // Calculate ticket counts
    const agentTickets = ticketLogs.filter(
      t => t.agent_email?.toLowerCase() === agent.email.toLowerCase()
    );
    const emailCount = agentTickets.filter(t => t.ticket_type?.toLowerCase() === 'email').length;
    const chatCount = agentTickets.filter(t => t.ticket_type?.toLowerCase() === 'chat').length;
    const callCount = agentTickets.filter(t => t.ticket_type?.toLowerCase() === 'call').length;
    
    let productivityCount = 0;
    switch (supportType) {
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

    // Calculate productivity percentage
    const weeklyQuota = getWeeklyQuota(agent, supportType, adjustedScheduledDays);
    const productivity = weeklyQuota > 0 ? (productivityCount / weeklyQuota) * 100 : null;

    // Calculate QA average
    const agentQA = qaEvaluations.filter(
      q => q.agent_email?.toLowerCase() === agent.email.toLowerCase()
    );
    const qa = agentQA.length > 0
      ? agentQA.reduce((sum, q) => sum + (q.percentage || 0), 0) / agentQA.length
      : null;

    // Calculate final score based on config
    let finalScore = 0;
    let totalWeight = 0;

    for (const c of config) {
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
          metricValue = null; // Pending
          break;
        case 'call_aht':
        case 'chat_aht':
        case 'chat_frt':
          metricValue = null; // Will be fetched from Zendesk
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
      callAht: null, // Pending Zendesk integration
      chatAht: null,
      chatFrt: null,
      qa,
      revalida: null, // Pending
      reliability,
      otProductivity: null, // Placeholder
      finalScore: isOnLeave ? null : finalScore,
      isOnLeave,
      scheduledDays,
      daysPresent,
      approvedLeaveDays
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
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
