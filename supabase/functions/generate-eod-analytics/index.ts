import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Thresholds for "Good Day" status
const THRESHOLDS = {
  onTimeLoginRate: 90,      // ≥ 90% is acceptable
  shiftCompletionRate: 85,  // ≥ 85% is acceptable
  quotaAchievementRate: 70, // ≥ 70% is acceptable
  zeroViolationsRate: 75,   // ≥ 75% is acceptable
  avgTicketGapMinutes: 5,   // ≤ 5 min is acceptable
};

interface AgentDirectory {
  email: string;
  agent_name: string | null;
  mon_schedule: string | null;
  tue_schedule: string | null;
  wed_schedule: string | null;
  thu_schedule: string | null;
  fri_schedule: string | null;
  sat_schedule: string | null;
  sun_schedule: string | null;
  day_off: string[] | null;
  break_schedule: string | null;
}

interface AgentProfile {
  id: string;
  email: string;
  full_name: string | null;
  position: string | null;
  upwork_contract_id: string | null;
  quota_email: number | null;
  quota_chat: number | null;
  quota_phone: number | null;
}

interface ProfileEvent {
  profile_id: string;
  event_type: string;
  created_at: string;
}

interface EODAnalytics {
  date: string;
  attendance: {
    totalActiveAgents: number;
    scheduledAgents: number;
    onTimeLoginCount: number;
    onTimeLoginRate: number;
    fullShiftCompletionCount: number;
    fullShiftCompletionRate: number;
  };
  productivity: {
    totalTickets: number;
    emailTickets: number;
    chatTickets: number;
    callTickets: number;
    agentsWithQuota: number;
    quotaMetCount: number;
    quotaAchievementRate: number;
    avgTicketGapMinutes: number | null;
  };
  timeTracking: {
    avgHoursLogged: number | null;
    requiredHoursAvg: number | null;
  };
  compliance: {
    zeroViolationsCount: number;
    zeroViolationsRate: number;
    totalIncidents: number;
    incidentBreakdown: Record<string, number>;
  };
  overallStatus: 'good' | 'warning' | 'critical';
  statusDetails: string[];
}

/**
 * Parse schedule string "9:00 AM-5:00 PM" and return start/end minutes from midnight
 */
function parseScheduleRange(scheduleTime: string): { startMinutes: number; endMinutes: number } | null {
  const parts = scheduleTime.split('-');
  if (parts.length !== 2) return null;
  
  const parseTime = (timeStr: string): number | null => {
    const timeMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeMatch) return null;
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    else if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };
  
  const startMinutes = parseTime(parts[0]);
  const endMinutes = parseTime(parts[1]);
  
  if (startMinutes === null || endMinutes === null) return null;
  return { startMinutes, endMinutes };
}

/**
 * Get the schedule for a specific day
 */
function getScheduleForDay(directory: AgentDirectory, dayOfWeek: number): string | null {
  const dayMap: Record<number, keyof AgentDirectory> = {
    0: 'sun_schedule',
    1: 'mon_schedule',
    2: 'tue_schedule',
    3: 'wed_schedule',
    4: 'thu_schedule',
    5: 'fri_schedule',
    6: 'sat_schedule',
  };
  return directory[dayMap[dayOfWeek]] as string | null;
}

/**
 * Check if a day is a day off
 */
function isDayOff(directory: AgentDirectory, dayName: string): boolean {
  const dayOff = directory.day_off || [];
  return dayOff.some(d => d.toLowerCase() === dayName.toLowerCase());
}

/**
 * Calculate expected quota based on agent's position
 */
function calculateExpectedQuota(profile: AgentProfile): number {
  const position = profile.position?.toLowerCase() || '';
  const quotaEmail = profile.quota_email || 0;
  const quotaChat = profile.quota_chat || 0;
  const quotaPhone = profile.quota_phone || 0;

  if (position.includes('hybrid')) {
    return quotaEmail + quotaChat + quotaPhone;
  } else if (position.includes('chat')) {
    return quotaEmail + quotaChat;
  } else if (position.includes('phone')) {
    return quotaEmail + quotaPhone;
  } else if (position.includes('email')) {
    return quotaEmail;
  }
  return 0;
}

/**
 * Determine overall status based on metrics
 */
function determineOverallStatus(analytics: Omit<EODAnalytics, 'overallStatus' | 'statusDetails'>): { status: 'good' | 'warning' | 'critical'; details: string[] } {
  const details: string[] = [];
  let warningCount = 0;
  let criticalCount = 0;

  // Check On-Time Login Rate
  if (analytics.attendance.onTimeLoginRate < THRESHOLDS.onTimeLoginRate - 10) {
    criticalCount++;
    details.push(`⚠️ On-Time Login Rate critically low: ${analytics.attendance.onTimeLoginRate.toFixed(0)}%`);
  } else if (analytics.attendance.onTimeLoginRate < THRESHOLDS.onTimeLoginRate) {
    warningCount++;
    details.push(`⚡ On-Time Login Rate below target: ${analytics.attendance.onTimeLoginRate.toFixed(0)}%`);
  }

  // Check Shift Completion Rate
  if (analytics.attendance.fullShiftCompletionRate < THRESHOLDS.shiftCompletionRate - 10) {
    criticalCount++;
    details.push(`⚠️ Shift Completion Rate critically low: ${analytics.attendance.fullShiftCompletionRate.toFixed(0)}%`);
  } else if (analytics.attendance.fullShiftCompletionRate < THRESHOLDS.shiftCompletionRate) {
    warningCount++;
    details.push(`⚡ Shift Completion Rate below target: ${analytics.attendance.fullShiftCompletionRate.toFixed(0)}%`);
  }

  // Check Quota Achievement Rate
  if (analytics.productivity.quotaAchievementRate < THRESHOLDS.quotaAchievementRate - 15) {
    criticalCount++;
    details.push(`⚠️ Quota Achievement critically low: ${analytics.productivity.quotaAchievementRate.toFixed(0)}%`);
  } else if (analytics.productivity.quotaAchievementRate < THRESHOLDS.quotaAchievementRate) {
    warningCount++;
    details.push(`⚡ Quota Achievement below target: ${analytics.productivity.quotaAchievementRate.toFixed(0)}%`);
  }

  // Check Zero Violations Rate
  if (analytics.compliance.zeroViolationsRate < THRESHOLDS.zeroViolationsRate - 15) {
    criticalCount++;
    details.push(`⚠️ Zero Violations Rate critically low: ${analytics.compliance.zeroViolationsRate.toFixed(0)}%`);
  } else if (analytics.compliance.zeroViolationsRate < THRESHOLDS.zeroViolationsRate) {
    warningCount++;
    details.push(`⚡ Zero Violations Rate below target: ${analytics.compliance.zeroViolationsRate.toFixed(0)}%`);
  }

  // Check Avg Ticket Gap
  if (analytics.productivity.avgTicketGapMinutes !== null) {
    if (analytics.productivity.avgTicketGapMinutes > THRESHOLDS.avgTicketGapMinutes * 2) {
      criticalCount++;
      details.push(`⚠️ Avg Ticket Gap critically high: ${analytics.productivity.avgTicketGapMinutes.toFixed(1)} min`);
    } else if (analytics.productivity.avgTicketGapMinutes > THRESHOLDS.avgTicketGapMinutes) {
      warningCount++;
      details.push(`⚡ Avg Ticket Gap above target: ${analytics.productivity.avgTicketGapMinutes.toFixed(1)} min`);
    }
  }

  let status: 'good' | 'warning' | 'critical';
  if (criticalCount >= 2) {
    status = 'critical';
  } else if (criticalCount >= 1 || warningCount >= 3) {
    status = 'warning';
  } else if (warningCount >= 1) {
    status = 'warning';
  } else {
    status = 'good';
    details.push('✅ All metrics within acceptable thresholds');
  }

  return { status, details };
}

/**
 * Format hours as "Xh Ym"
 */
function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Generate HTML email content for EOD analytics
 */
function generateEmailHtml(analytics: EODAnalytics): string {
  const statusEmoji = analytics.overallStatus === 'good' ? '✅' : analytics.overallStatus === 'warning' ? '⚠️' : '🚨';
  const statusColor = analytics.overallStatus === 'good' ? '#10b981' : analytics.overallStatus === 'warning' ? '#f59e0b' : '#ef4444';
  const statusText = analytics.overallStatus === 'good' ? 'Good Performance' : analytics.overallStatus === 'warning' ? 'Needs Attention' : 'Critical Issues';

  const checkIcon = (isGood: boolean) => isGood 
    ? '<span style="color: #10b981;">✓</span>' 
    : '<span style="color: #ef4444;">✗</span>';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
      <div style="background-color: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #1e293b;">📊 EOD Team Analytics</h1>
          <p style="margin: 0; color: #64748b; font-size: 14px;">${analytics.date}</p>
        </div>

        <!-- Overall Status Banner -->
        <div style="background-color: ${statusColor}15; border-left: 4px solid ${statusColor}; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <div style="font-size: 18px; font-weight: 600; color: ${statusColor};">
            ${statusEmoji} ${statusText}
          </div>
          ${analytics.statusDetails.map(d => `<div style="font-size: 13px; color: #475569; margin-top: 4px;">${d}</div>`).join('')}
        </div>

        <!-- Attendance Section -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; color: #334155; margin: 0 0 12px 0; display: flex; align-items: center;">
            👥 ATTENDANCE <span style="font-weight: normal; color: #64748b; margin-left: 8px;">(${analytics.attendance.totalActiveAgents} active agents)</span>
          </h2>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>On-Time Login:</span>
              <span style="font-weight: 600;">${checkIcon(analytics.attendance.onTimeLoginRate >= THRESHOLDS.onTimeLoginRate)} ${analytics.attendance.onTimeLoginRate.toFixed(0)}% (${analytics.attendance.onTimeLoginCount}/${analytics.attendance.scheduledAgents})</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Full Shift Completion:</span>
              <span style="font-weight: 600;">${checkIcon(analytics.attendance.fullShiftCompletionRate >= THRESHOLDS.shiftCompletionRate)} ${analytics.attendance.fullShiftCompletionRate.toFixed(0)}% (${analytics.attendance.fullShiftCompletionCount}/${analytics.attendance.scheduledAgents})</span>
            </div>
          </div>
        </div>

        <!-- Productivity Section -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; color: #334155; margin: 0 0 12px 0;">📈 PRODUCTIVITY</h2>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Tickets Handled:</span>
              <span style="font-weight: 600;">${analytics.productivity.totalTickets} total</span>
            </div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 8px; padding-left: 16px;">
              Email: ${analytics.productivity.emailTickets} | Chat: ${analytics.productivity.chatTickets} | Call: ${analytics.productivity.callTickets}
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Quota Met:</span>
              <span style="font-weight: 600;">${checkIcon(analytics.productivity.quotaAchievementRate >= THRESHOLDS.quotaAchievementRate)} ${analytics.productivity.quotaAchievementRate.toFixed(0)}% (${analytics.productivity.quotaMetCount}/${analytics.productivity.agentsWithQuota})</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Avg Ticket Gap:</span>
              <span style="font-weight: 600;">${analytics.productivity.avgTicketGapMinutes !== null 
                ? `${checkIcon(analytics.productivity.avgTicketGapMinutes <= THRESHOLDS.avgTicketGapMinutes)} ${analytics.productivity.avgTicketGapMinutes.toFixed(1)} min`
                : 'N/A'}</span>
            </div>
          </div>
        </div>

        <!-- Time Tracking Section -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; color: #334155; margin: 0 0 12px 0;">⏱️ TIME TRACKING</h2>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Avg Hours Logged:</span>
              <span style="font-weight: 600;">${analytics.timeTracking.avgHoursLogged !== null 
                ? `${formatHours(analytics.timeTracking.avgHoursLogged)} / ${analytics.timeTracking.requiredHoursAvg !== null ? formatHours(analytics.timeTracking.requiredHoursAvg) : '--'} required`
                : 'N/A'}</span>
            </div>
          </div>
        </div>

        <!-- Compliance Section -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; color: #334155; margin: 0 0 12px 0;">✅ COMPLIANCE</h2>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Clean Record:</span>
              <span style="font-weight: 600;">${checkIcon(analytics.compliance.zeroViolationsRate >= THRESHOLDS.zeroViolationsRate)} ${analytics.compliance.zeroViolationsRate.toFixed(0)}% (${analytics.compliance.zeroViolationsCount}/${analytics.attendance.scheduledAgents} agents)</span>
            </div>
            ${analytics.compliance.totalIncidents > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Incidents:</span>
                <span style="font-weight: 600;">${analytics.compliance.totalIncidents} total</span>
              </div>
              <div style="font-size: 12px; color: #64748b; padding-left: 16px;">
                ${Object.entries(analytics.compliance.incidentBreakdown).map(([type, count]) => `${type}: ${count}`).join(' | ')}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">
            This report was automatically generated by VFS Updates Hub.<br>
            View full details in the Agent Reports section.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate Slack message blocks for EOD analytics
 */
function generateSlackMessage(analytics: EODAnalytics): string {
  const statusEmoji = analytics.overallStatus === 'good' ? '✅' : analytics.overallStatus === 'warning' ? '⚠️' : '🚨';
  
  const lines = [
    `📊 *EOD Team Analytics - ${analytics.date}*`,
    '',
    `${statusEmoji} *Overall: ${analytics.overallStatus.toUpperCase()}*`,
    '',
    `👥 *Attendance* (${analytics.attendance.totalActiveAgents} active)`,
    `• On-Time: ${analytics.attendance.onTimeLoginRate.toFixed(0)}% | Shift Complete: ${analytics.attendance.fullShiftCompletionRate.toFixed(0)}%`,
    '',
    `📈 *Productivity*`,
    `• Tickets: ${analytics.productivity.totalTickets} | Quota Met: ${analytics.productivity.quotaAchievementRate.toFixed(0)}% | Gap: ${analytics.productivity.avgTicketGapMinutes?.toFixed(1) ?? '--'} min`,
    '',
    `✅ *Compliance*`,
    `• Clean: ${analytics.compliance.zeroViolationsRate.toFixed(0)}% | Incidents: ${analytics.compliance.totalIncidents}`,
  ];

  return lines.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const slackBotToken = Deno.env.get('SLACK_BOT_TOKEN');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get target date from request or default to yesterday
    let targetDate: Date;
    try {
      const body = await req.json();
      if (body.date) {
        targetDate = new Date(body.date);
      } else {
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - 1);
      }
    } catch {
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1);
    }

    const targetDateStr = targetDate.toISOString().split('T')[0];
    const dayOfWeek = targetDate.getDay();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[dayOfWeek];

    console.log(`Generating EOD analytics for ${targetDateStr} (${dayName})`);

    // ========================
    // FETCH ALL DATA
    // ========================

    // Fetch all agent profiles with quota info
    const { data: profiles } = await supabase
      .from('agent_profiles')
      .select('id, email, full_name, position, upwork_contract_id, quota_email, quota_chat, quota_phone');

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No profiles found', analytics: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all agent directories
    const { data: directories } = await supabase
      .from('agent_directory')
      .select('email, agent_name, mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule, day_off, break_schedule');

    const directoryMap = new Map<string, AgentDirectory>();
    directories?.forEach(d => directoryMap.set(d.email.toLowerCase(), d));

    // Fetch all events for the target date
    const startOfDay = `${targetDateStr}T00:00:00.000Z`;
    const endOfDay = `${targetDateStr}T23:59:59.999Z`;

    const { data: allEvents } = await supabase
      .from('profile_events')
      .select('profile_id, event_type, created_at')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: true });

    // Fetch ticket logs for the target date
    const { data: ticketLogs } = await supabase
      .from('ticket_logs')
      .select('agent_email, ticket_type')
      .gte('timestamp', startOfDay)
      .lte('timestamp', endOfDay);

    // Fetch ticket gap data
    const { data: ticketGaps } = await supabase
      .from('ticket_gap_daily')
      .select('agent_email, avg_gap_seconds')
      .eq('date', targetDateStr);

    // Fetch Upwork daily logs
    const { data: upworkLogs } = await supabase
      .from('upwork_daily_logs')
      .select('agent_email, total_hours')
      .eq('date', targetDateStr);

    // Fetch incidents for the target date
    const { data: incidents } = await supabase
      .from('agent_reports')
      .select('agent_email, incident_type')
      .eq('incident_date', targetDateStr);

    // ========================
    // CALCULATE METRICS
    // ========================

    // Build maps for quick lookup
    const upworkHoursByAgent = new Map<string, number>();
    upworkLogs?.forEach(log => {
      if (log.agent_email && log.total_hours !== null) {
        upworkHoursByAgent.set(log.agent_email.toLowerCase(), log.total_hours);
      }
    });

    const ticketGapByAgent = new Map<string, number>();
    ticketGaps?.forEach(gap => {
      if (gap.agent_email && gap.avg_gap_seconds !== null) {
        ticketGapByAgent.set(gap.agent_email.toLowerCase(), gap.avg_gap_seconds);
      }
    });

    // Aggregate ticket counts
    const ticketCountsByAgent = new Map<string, { email: number; chat: number; call: number }>();
    let totalEmailTickets = 0;
    let totalChatTickets = 0;
    let totalCallTickets = 0;

    ticketLogs?.forEach(log => {
      const email = log.agent_email?.toLowerCase();
      if (!email) return;
      
      if (!ticketCountsByAgent.has(email)) {
        ticketCountsByAgent.set(email, { email: 0, chat: 0, call: 0 });
      }
      const counts = ticketCountsByAgent.get(email)!;
      const ticketType = log.ticket_type?.toLowerCase();
      if (ticketType === 'email') { counts.email++; totalEmailTickets++; }
      else if (ticketType === 'chat') { counts.chat++; totalChatTickets++; }
      else if (ticketType === 'call') { counts.call++; totalCallTickets++; }
    });

    // Aggregate incidents by agent and type
    const incidentsByAgent = new Map<string, string[]>();
    const incidentBreakdown: Record<string, number> = {};

    incidents?.forEach(i => {
      const email = i.agent_email.toLowerCase();
      if (!incidentsByAgent.has(email)) {
        incidentsByAgent.set(email, []);
      }
      incidentsByAgent.get(email)!.push(i.incident_type);
      incidentBreakdown[i.incident_type] = (incidentBreakdown[i.incident_type] || 0) + 1;
    });

    // ========================
    // COMPUTE ATTENDANCE METRICS
    // ========================

    let scheduledAgentsCount = 0;
    let activeAgentsCount = 0;
    let onTimeLoginCount = 0;
    let fullShiftCompletionCount = 0;
    let agentsWithQuota = 0;
    let quotaMetCount = 0;
    let totalLoggedHours = 0;
    let totalRequiredHours = 0;
    let agentsWithLoggedHours = 0;

    for (const profile of profiles as AgentProfile[]) {
      const directory = directoryMap.get(profile.email.toLowerCase());
      
      // Skip if day off
      if (directory && isDayOff(directory, dayName)) {
        continue;
      }

      // Get schedule for the day
      const schedule = directory ? getScheduleForDay(directory, dayOfWeek) : null;
      if (!schedule) continue;

      const parsedSchedule = parseScheduleRange(schedule);
      if (!parsedSchedule) continue;

      scheduledAgentsCount++;

      let requiredMinutes = parsedSchedule.endMinutes - parsedSchedule.startMinutes;
      if (requiredMinutes < 0) requiredMinutes += 24 * 60;
      totalRequiredHours += requiredMinutes / 60;

      // Get events for this profile
      const profileEvents = (allEvents as ProfileEvent[] || []).filter(e => e.profile_id === profile.id);
      const loginEvents = profileEvents.filter(e => e.event_type === 'LOGIN');
      const logoutEvents = profileEvents.filter(e => e.event_type === 'LOGOUT');

      if (loginEvents.length > 0) {
        activeAgentsCount++;

        // Check on-time login (within 10 minutes of schedule start)
        const firstLogin = new Date(loginEvents[0].created_at);
        const loginHour = parseInt(new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          hour12: false,
        }).format(firstLogin));
        const loginMinute = parseInt(new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          minute: '2-digit',
        }).format(firstLogin));
        const loginMinutes = loginHour * 60 + loginMinute;

        if (loginMinutes <= parsedSchedule.startMinutes + 10) {
          onTimeLoginCount++;
        }

        // Check full shift completion
        if (logoutEvents.length > 0) {
          const lastLogout = new Date(logoutEvents[logoutEvents.length - 1].created_at);
          const logoutHour = parseInt(new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            hour: '2-digit',
            hour12: false,
          }).format(lastLogout));
          const logoutMinute = parseInt(new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            minute: '2-digit',
          }).format(lastLogout));
          const logoutMinutes = logoutHour * 60 + logoutMinute;

          if (logoutMinutes >= parsedSchedule.endMinutes) {
            fullShiftCompletionCount++;
          }

          // Calculate logged hours
          const durationMinutes = (lastLogout.getTime() - firstLogin.getTime()) / (1000 * 60);
          totalLoggedHours += durationMinutes / 60;
          agentsWithLoggedHours++;
        }
      }

      // Check quota achievement
      const expectedQuota = calculateExpectedQuota(profile);
      if (expectedQuota > 0) {
        agentsWithQuota++;
        const agentTickets = ticketCountsByAgent.get(profile.email.toLowerCase()) || { email: 0, chat: 0, call: 0 };
        const actualTotal = agentTickets.email + agentTickets.chat + agentTickets.call;
        if (actualTotal >= expectedQuota) {
          quotaMetCount++;
        }
      }
    }

    // Calculate average ticket gap
    let avgTicketGapMinutes: number | null = null;
    if (ticketGapByAgent.size > 0) {
      const totalGapSeconds = Array.from(ticketGapByAgent.values()).reduce((a, b) => a + b, 0);
      avgTicketGapMinutes = (totalGapSeconds / ticketGapByAgent.size) / 60;
    }

    // Calculate zero violations count
    const agentsWithIncidents = new Set(incidentsByAgent.keys());
    const zeroViolationsCount = scheduledAgentsCount - agentsWithIncidents.size;

    // ========================
    // BUILD ANALYTICS OBJECT
    // ========================

    const analyticsData: Omit<EODAnalytics, 'overallStatus' | 'statusDetails'> = {
      date: targetDateStr,
      attendance: {
        totalActiveAgents: activeAgentsCount,
        scheduledAgents: scheduledAgentsCount,
        onTimeLoginCount,
        onTimeLoginRate: scheduledAgentsCount > 0 ? (onTimeLoginCount / scheduledAgentsCount) * 100 : 0,
        fullShiftCompletionCount,
        fullShiftCompletionRate: scheduledAgentsCount > 0 ? (fullShiftCompletionCount / scheduledAgentsCount) * 100 : 0,
      },
      productivity: {
        totalTickets: totalEmailTickets + totalChatTickets + totalCallTickets,
        emailTickets: totalEmailTickets,
        chatTickets: totalChatTickets,
        callTickets: totalCallTickets,
        agentsWithQuota,
        quotaMetCount,
        quotaAchievementRate: agentsWithQuota > 0 ? (quotaMetCount / agentsWithQuota) * 100 : 0,
        avgTicketGapMinutes,
      },
      timeTracking: {
        avgHoursLogged: agentsWithLoggedHours > 0 ? totalLoggedHours / agentsWithLoggedHours : null,
        requiredHoursAvg: scheduledAgentsCount > 0 ? totalRequiredHours / scheduledAgentsCount : null,
      },
      compliance: {
        zeroViolationsCount,
        zeroViolationsRate: scheduledAgentsCount > 0 ? (zeroViolationsCount / scheduledAgentsCount) * 100 : 0,
        totalIncidents: incidents?.length || 0,
        incidentBreakdown,
      },
    };

    const { status: overallStatus, details: statusDetails } = determineOverallStatus(analyticsData);

    const analytics: EODAnalytics = {
      ...analyticsData,
      overallStatus,
      statusDetails,
    };

    console.log('EOD Analytics:', JSON.stringify(analytics, null, 2));

    // ========================
    // SEND NOTIFICATIONS
    // ========================

    // Get admin emails
    const { data: admins } = await supabase
      .from('user_roles')
      .select('email')
      .in('role', ['admin', 'hr', 'super_admin']);

    const adminEmails = [...new Set(admins?.map(a => a.email.toLowerCase()) || [])];

    // Create in-app notifications
    const title = `📊 EOD Team Analytics: ${targetDateStr}`;
    const statusEmoji = analytics.overallStatus === 'good' ? '✅' : analytics.overallStatus === 'warning' ? '⚠️' : '🚨';
    const message = `${statusEmoji} ${analytics.overallStatus.toUpperCase()}: ${analytics.attendance.totalActiveAgents} active agents, ${analytics.productivity.totalTickets} tickets, ${analytics.compliance.zeroViolationsRate.toFixed(0)}% clean record`;

    const notifications = adminEmails.map(email => ({
      user_email: email,
      title,
      message,
      type: 'eod_analytics',
      reference_type: 'agent_reports',
      reference_id: null,
    }));

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    // Send email via Resend
    if (resendApiKey && adminEmails.length > 0) {
      const htmlBody = generateEmailHtml(analytics);

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'VFS Updates Hub <noreply@vfsoperations.online>',
            to: adminEmails,
            subject: `${title} - ${analytics.overallStatus.toUpperCase()}`,
            html: htmlBody,
          }),
        });
        console.log('EOD analytics email sent successfully');
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
      }
    }

    // Send Slack notification
    if (slackBotToken) {
      const slackMessage = generateSlackMessage(analytics);
      try {
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${slackBotToken}`,
          },
          body: JSON.stringify({
            channel: '#a_pb_mgt',
            text: slackMessage,
            mrkdwn: true,
          }),
        });
        console.log('EOD analytics Slack message sent successfully');
      } catch (slackErr) {
        console.error('Slack send error:', slackErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDateStr,
        analytics,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in generate-eod-analytics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
