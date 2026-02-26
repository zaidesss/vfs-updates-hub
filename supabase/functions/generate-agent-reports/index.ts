import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/gmail-sender.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProfileEvent {
  id: string;
  profile_id: string;
  event_type: string;
  prev_status: string;
  new_status: string;
  triggered_by: string;
  created_at: string;
}

interface AgentProfile {
  id: string;
  email: string;
  full_name: string | null;
  position: string[] | null;
  upwork_contract_id: string | null;
  quota_email: number | null;
  quota_chat: number | null;
  quota_phone: number | null;
  employment_status: string | null;
}


/**
 * Parse a 12-hour time string and return total minutes from midnight
 */
function parseTimeToMinutes(timeStr: string): number | null {
  const timeMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeMatch) return null;
  
  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  else if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

/**
 * Parse schedule string "9:00 AM-5:00 PM" and return start/end minutes
 */
function parseScheduleRange(scheduleTime: string): { startMinutes: number; endMinutes: number } | null {
  const parts = scheduleTime.split('-');
  if (parts.length !== 2) return null;
  
  const startMinutes = parseTimeToMinutes(parts[0].trim());
  const endMinutes = parseTimeToMinutes(parts[1].trim());
  
  if (startMinutes === null || endMinutes === null) return null;
  
  return { startMinutes, endMinutes };
}

/**
 * Calculate expected quota based on agent's position
 */
function calculateExpectedQuota(profile: AgentProfile): number {
  const posArr = profile.position || [];
  const quotaEmail = profile.quota_email || 0;
  const quotaChat = profile.quota_chat || 0;
  const quotaPhone = profile.quota_phone || 0;

  const hasEmail = posArr.includes('Email');
  const hasChat = posArr.includes('Chat');
  const hasPhone = posArr.includes('Phone');

  if (hasEmail && hasChat && hasPhone) return quotaEmail + quotaChat + quotaPhone;
  if (hasEmail && hasChat) return quotaEmail + quotaChat;
  if (hasEmail && hasPhone) return quotaEmail + quotaPhone;
  if (hasEmail) return quotaEmail;
  return 0; // No quota for Team Lead, Logistics, Technical, etc.
}

/**
 * Check if agent is Email Support (for HIGH_GAP violation)
 */
function isEmailSupport(profile: AgentProfile): boolean {
  const posArr = profile.position || [];
  return posArr.includes('Email') && !posArr.includes('Chat') && !posArr.includes('Phone');
}

/**
 * Calculate severity based on time overage in minutes
 */
function calculateTimeSeverity(minutes: number): string {
  if (minutes <= 5) return 'low';
  if (minutes <= 15) return 'medium';
  return 'high';
}

/**
 * Calculate severity based on quota shortfall
 */
function calculateQuotaSeverity(shortfall: number): string {
  if (shortfall <= 10) return 'low';
  if (shortfall <= 30) return 'medium';
  return 'high';
}

/**
 * Calculate severity based on average gap in minutes
 * Returns null if gap is under 5 minutes (no report needed)
 */
function calculateGapSeverity(gapMinutes: number): string | null {
  if (gapMinutes < 5) return null;
  if (gapMinutes <= 10) return 'low';
  if (gapMinutes <= 20) return 'medium';
  return 'high';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // Slack notification disabled - pending finalization of Daily Agent Report details

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

    console.log(`Generating agent reports for ${targetDateStr} (${dayName})`);

    // Fetch all agent profiles with their directories and quota info
    const { data: profiles } = await supabase
      .from('agent_profiles')
      .select('id, email, full_name, position, upwork_contract_id, quota_email, quota_chat, quota_phone, employment_status')
      .neq('employment_status', 'Terminated');

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No profiles found', reports: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch coverage overrides for the target date
    const { data: overrides } = await supabase
      .from('coverage_overrides')
      .select('agent_id, override_start, override_end, reason')
      .eq('date', targetDateStr);

    const overrideMap = new Map<string, { override_start: string; override_end: string; reason: string }>();
    overrides?.forEach(o => overrideMap.set(o.agent_id, o));

    // Fetch all events for the target date using EST boundaries
    // EST = UTC-5, so midnight EST = 5:00 AM UTC
    // Start of EST day: targetDate at 5:00 AM UTC
    // End of EST day: next day at 4:59:59 AM UTC
    const startOfDayEST = `${targetDateStr}T05:00:00.000Z`;
    const nextDay = new Date(targetDateStr);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    // Extended to 5:00 AM EST (09:59:59 UTC) to capture overnight shift logouts
    const endOfDayEST = `${nextDayStr}T09:59:59.999Z`;

    const { data: allEvents } = await supabase
      .from('profile_events')
      .select('*')
      .gte('created_at', startOfDayEST)
      .lte('created_at', endOfDayEST)
      .order('created_at', { ascending: true });

    // Fetch ticket logs for the target date (for QUOTA_NOT_MET)
    const { data: ticketLogs } = await supabase
      .from('ticket_logs')
      .select('agent_email, ticket_type')
      .gte('timestamp', startOfDayEST)
      .lte('timestamp', endOfDayEST);

    // Aggregate ticket counts by agent
    const ticketCountsByAgent = new Map<string, { email: number; chat: number; call: number }>();
    ticketLogs?.forEach(log => {
      const email = log.agent_email?.toLowerCase();
      if (!email) return;
      
      if (!ticketCountsByAgent.has(email)) {
        ticketCountsByAgent.set(email, { email: 0, chat: 0, call: 0 });
      }
      const counts = ticketCountsByAgent.get(email)!;
      const ticketType = log.ticket_type?.toLowerCase();
      if (ticketType === 'email') counts.email++;
      else if (ticketType === 'chat') counts.chat++;
      else if (ticketType === 'call') counts.call++;
    });

    // Fetch ticket gap data for the target date (for HIGH_GAP)
    const { data: ticketGaps } = await supabase
      .from('ticket_gap_daily')
      .select('agent_email, avg_gap_seconds')
      .eq('date', targetDateStr);

    const ticketGapByAgent = new Map<string, number>();
    ticketGaps?.forEach(gap => {
      if (gap.agent_email && gap.avg_gap_seconds !== null) {
        ticketGapByAgent.set(gap.agent_email.toLowerCase(), gap.avg_gap_seconds);
      }
    });

    // Fetch Upwork daily logs for the target date (for TIME_NOT_MET)
    const { data: upworkLogs } = await supabase
      .from('upwork_daily_logs')
      .select('agent_email, total_hours')
      .eq('date', targetDateStr);

    const upworkHoursByAgent = new Map<string, number>();
    upworkLogs?.forEach(log => {
      if (log.agent_email && log.total_hours !== null) {
        upworkHoursByAgent.set(log.agent_email.toLowerCase(), log.total_hours);
      }
    });

    // Fetch existing reports for the target date to avoid duplicates
    const { data: existingReports } = await supabase
      .from('agent_reports')
      .select('agent_email, incident_type')
      .eq('incident_date', targetDateStr);

    const existingReportSet = new Set<string>();
    existingReports?.forEach(r => {
      existingReportSet.add(`${r.agent_email.toLowerCase()}_${r.incident_type}`);
    });

    const reportsToCreate: Array<{
      agent_email: string;
      agent_name: string;
      profile_id: string | null;
      incident_date: string;
      incident_type: string;
      severity: string;
      details: Record<string, unknown>;
      status: string;
    }> = [];

    for (const profile of profiles as AgentProfile[]) {
      const agentName = profile.full_name || profile.email;
      const profileEvents = (allEvents as ProfileEvent[] || []).filter(e => e.profile_id === profile.id);

      // Use get_effective_schedule RPC to resolve the schedule for this date
      // Precedence: coverage_overrides > agent_schedule_assignments > agent_profiles
      const { data: effectiveData, error: effectiveError } = await supabase.rpc('get_effective_schedule', {
        p_agent_id: profile.id,
        p_target_date: targetDateStr,
      });

      if (effectiveError || !effectiveData || effectiveData.length === 0) {
        console.log(`Skipping ${agentName} - failed to resolve effective schedule`);
        continue;
      }

      const effectiveRow = effectiveData[0];
      const schedule = effectiveRow.effective_schedule;
      const breakSchedule = effectiveRow.effective_break_schedule;
      const isDayOffForDate = effectiveRow.is_day_off;

      // Skip if day off
      if (isDayOffForDate) {
        continue;
      }
      
      // Skip if blank/null schedule (treat as implicit day off)
      if (!schedule || schedule.trim() === '') {
        continue;
      }
      
      const parsedSchedule = parseScheduleRange(schedule);

      // ========================
      // Check for NO_LOGOUT
      // Updated: Only trigger if 3+ hours past scheduled shift end AND still not logged out
      // ========================
      const loginEvents = profileEvents.filter(e => e.event_type === 'LOGIN');
      const logoutEvents = profileEvents.filter(e => e.event_type === 'LOGOUT' && e.triggered_by !== 'SYSTEM_AUTO_LOGOUT');

      // Session-pairing: filter logouts to only those AFTER the last login
      // This prevents "logout bleed" where a previous session's logout masks a missing logout
      // Applies to ALL shift types (not just overnight) to handle multi-session days
      let currentSessionLogouts = logoutEvents;
      if (loginEvents.length > 0) {
        const lastLoginTime = new Date(loginEvents[loginEvents.length - 1].created_at).getTime();
        currentSessionLogouts = logoutEvents.filter(e =>
          new Date(e.created_at).getTime() > lastLoginTime
        );
      }
      
      if (loginEvents.length > 0 && currentSessionLogouts.length === 0 && parsedSchedule) {
        // Check if this is an overnight shift (end time < start time, e.g., 4PM-2AM)
        const isOvernightShift = parsedSchedule.endMinutes < parsedSchedule.startMinutes;
        
        let skipNoLogout = false;
        if (isOvernightShift) {
          // For overnight shifts, first check if the shift hasn't ended yet.
          // If the shift end time (in UTC) is still in the future, the agent is still working —
          // skip NO_LOGOUT entirely to avoid false positives.
          // Shift end in EST = endMinutes; convert to UTC by adding 5 hours (EST = UTC-5)
          const shiftEndMinutesEST = parsedSchedule.endMinutes; // e.g., 270 for 4:30 AM
          const shiftEndHourEST = Math.floor(shiftEndMinutesEST / 60);
          const shiftEndMinEST = shiftEndMinutesEST % 60;
          // The overnight shift ends on the NEXT calendar day in EST
          const shiftEndDateEST = new Date(targetDateStr);
          shiftEndDateEST.setDate(shiftEndDateEST.getDate() + 1); // next day
          // Build UTC time: EST + 5 hours
          const shiftEndUTC = new Date(Date.UTC(
            shiftEndDateEST.getFullYear(),
            shiftEndDateEST.getMonth(),
            shiftEndDateEST.getDate(),
            shiftEndHourEST + 5,
            shiftEndMinEST,
            0
          ));
          
          if (Date.now() < shiftEndUTC.getTime()) {
            skipNoLogout = true;
            console.log(`Skipping NO_LOGOUT for ${agentName} - overnight shift hasn't ended yet (ends at ${shiftEndUTC.toISOString()})`);
          }

          if (!skipNoLogout) {
            // Shift has ended — check if there's a logout event in the extended window
            // that falls after midnight EST AND after the last login (same session)
            const allProfileEvents = (allEvents as ProfileEvent[] || []).filter(e => e.profile_id === profile.id);
            const lastLoginTime = new Date(loginEvents[loginEvents.length - 1].created_at).getTime();
            const postMidnightSessionLogouts = allProfileEvents.filter(e => {
              if (e.event_type !== 'LOGOUT') return false;
              if (new Date(e.created_at).getTime() <= lastLoginTime) return false;
              const eventDate = new Date(e.created_at);
              const eventHourEST = parseInt(new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/New_York',
                hour: '2-digit',
                hour12: false,
              }).format(eventDate));
              return eventHourEST < 5;
            });
            if (postMidnightSessionLogouts.length > 0) {
              skipNoLogout = true;
              console.log(`Skipping NO_LOGOUT for ${agentName} - overnight shift with post-midnight session logout found`);
            }
          }
        }
        
        if (!skipNoLogout) {
          const reportKey = `${profile.email.toLowerCase()}_NO_LOGOUT`;
          if (!existingReportSet.has(reportKey)) {
            reportsToCreate.push({
              agent_email: profile.email.toLowerCase(),
              agent_name: agentName,
              profile_id: profile.id,
              incident_date: targetDateStr,
              incident_type: 'NO_LOGOUT',
              severity: 'high',
              details: {
                loginTime: loginEvents[0].created_at,
                scheduledEnd: parsedSchedule.endMinutes,
                message: 'Agent logged in but did not log out',
              },
              status: 'open',
            });
          }
        }
      }

      // ========================
      // Check for LATE_LOGIN with dynamic severity
      // ========================
      if (parsedSchedule && loginEvents.length > 0) {
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

      // Check for OT grace period: if agent had an OT_LOGOUT within 30 min before shift start, extend grace by 30 min
      let lateLoginGrace = 10; // default 10-minute grace
      const otLogoutEvents = profileEvents.filter(e => e.event_type === 'OT_LOGOUT');
      if (otLogoutEvents.length > 0) {
        const lastOtLogout = new Date(otLogoutEvents[otLogoutEvents.length - 1].created_at);
        const otLogoutHour = parseInt(new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          hour12: false,
        }).format(lastOtLogout));
        const otLogoutMinute = parseInt(new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          minute: '2-digit',
        }).format(lastOtLogout));
        const otLogoutMinutes = otLogoutHour * 60 + otLogoutMinute;
        // If OT_LOGOUT happened within 30 min before scheduled start, grant 30-min grace
        const minutesBeforeStart = parsedSchedule.startMinutes - otLogoutMinutes;
        if (minutesBeforeStart >= 0 && minutesBeforeStart <= 30) {
          lateLoginGrace = 40; // 10 base + 30 OT grace
          console.log(`OT grace applied for ${agentName}: OT_LOGOUT was ${minutesBeforeStart}min before shift start`);
        }
      }

      // Late if more than grace period after schedule start
      if (loginMinutes > parsedSchedule.startMinutes + lateLoginGrace) {
        const reportKey = `${profile.email.toLowerCase()}_LATE_LOGIN`;
        if (!existingReportSet.has(reportKey)) {
          const lateMinutes = loginMinutes - parsedSchedule.startMinutes;
          reportsToCreate.push({
              agent_email: profile.email.toLowerCase(),
              agent_name: agentName,
              profile_id: profile.id,
              incident_date: targetDateStr,
              incident_type: 'LATE_LOGIN',
              severity: calculateTimeSeverity(lateMinutes),
              details: {
                scheduledStart: parsedSchedule.startMinutes,
                actualLogin: loginMinutes,
                lateByMinutes: lateMinutes,
              },
              status: 'open',
            });
          }
        }
      }

      // ========================
      // Check for EXCESSIVE_RESTART with dynamic severity
      // ========================
      const restartStartEvents = profileEvents.filter(e => e.event_type === 'DEVICE_RESTART_START');
      const restartEndEvents = profileEvents.filter(e => e.event_type === 'DEVICE_RESTART_END');
      
      let totalRestartSeconds = 0;
      for (const startEvent of restartStartEvents) {
        const matchingEnd = restartEndEvents.find(e => 
          new Date(e.created_at) > new Date(startEvent.created_at)
        );
        if (matchingEnd) {
          const duration = (new Date(matchingEnd.created_at).getTime() - new Date(startEvent.created_at).getTime()) / 1000;
          totalRestartSeconds += duration;
        }
      }

      if (totalRestartSeconds > 300) { // More than 5 minutes total
        const reportKey = `${profile.email.toLowerCase()}_EXCESSIVE_RESTARTS`;
        if (!existingReportSet.has(reportKey)) {
          const overageMinutes = Math.floor((totalRestartSeconds - 300) / 60);
          reportsToCreate.push({
            agent_email: profile.email.toLowerCase(),
            agent_name: agentName,
            profile_id: profile.id,
            incident_date: targetDateStr,
            incident_type: 'EXCESSIVE_RESTARTS',
            severity: calculateTimeSeverity(overageMinutes),
            details: {
              totalRestartSeconds,
              restartCount: restartStartEvents.length,
              overageMinutes,
            },
            status: 'open',
          });
        }
      }

      // ========================
      // Check for BIO_OVERUSE with dynamic severity
      // ========================
      const bioStartEvents = profileEvents.filter(e => e.event_type === 'BIO_START');
      const bioEndEvents = profileEvents.filter(e => e.event_type === 'BIO_END');
      
      let totalBioSeconds = 0;
      for (const startEvent of bioStartEvents) {
        const matchingEnd = bioEndEvents.find(e => 
          new Date(e.created_at) > new Date(startEvent.created_at)
        );
        if (matchingEnd) {
          const duration = (new Date(matchingEnd.created_at).getTime() - new Date(startEvent.created_at).getTime()) / 1000;
          totalBioSeconds += duration;
        }
      }

      // Calculate bio allowance (5 mins for 5+ hour shift, 2.5 mins otherwise)
      let bioAllowance = 150; // Default 2 mins 30 secs
      if (parsedSchedule) {
        let shiftDuration = parsedSchedule.endMinutes - parsedSchedule.startMinutes;
        if (shiftDuration < 0) shiftDuration += 24 * 60;
        if (shiftDuration >= 300) bioAllowance = 300; // 5 mins for 5+ hour shift
      }

      if (totalBioSeconds > bioAllowance) {
        const reportKey = `${profile.email.toLowerCase()}_BIO_OVERUSE`;
        if (!existingReportSet.has(reportKey)) {
          const overageSeconds = totalBioSeconds - bioAllowance;
          const overageMinutes = Math.ceil(overageSeconds / 60);
          reportsToCreate.push({
            agent_email: profile.email.toLowerCase(),
            agent_name: agentName,
            profile_id: profile.id,
            incident_date: targetDateStr,
            incident_type: 'BIO_OVERUSE',
            severity: calculateTimeSeverity(overageMinutes),
            details: {
              totalBioSeconds,
              bioAllowance,
              overageSeconds,
              overageMinutes,
            },
            status: 'open',
          });
        }
      }

      // ========================
      // Check for EARLY_OUT with dynamic severity
      // ========================
      if (logoutEvents.length > 0 && parsedSchedule) {
        const isOvernightShift = parsedSchedule.endMinutes < parsedSchedule.startMinutes;

        // Session-pairing: filter logouts to only those AFTER the last login
        // Applies to ALL shift types (consistent with NO_LOGOUT fix) to prevent
        // previous session's logout from masking an early out in the current session
        let effectiveLogoutEvents = logoutEvents;
        if (loginEvents.length > 0) {
          const lastLoginTime = new Date(loginEvents[loginEvents.length - 1].created_at).getTime();
          effectiveLogoutEvents = logoutEvents.filter(e =>
            new Date(e.created_at).getTime() > lastLoginTime
          );
          if (effectiveLogoutEvents.length === 0) {
            console.log(`Skipping EARLY_OUT for ${agentName} - logout(s) found but all precede the last login (previous day's session bleed)`);
          }
        }

        if (effectiveLogoutEvents.length > 0) {
          const lastLogout = effectiveLogoutEvents[effectiveLogoutEvents.length - 1];
          const logoutTime = new Date(lastLogout.created_at);
          const logoutHour = parseInt(new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            hour: '2-digit',
            hour12: false,
          }).format(logoutTime));
          const logoutMinute = parseInt(new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            minute: '2-digit',
          }).format(logoutTime));
          const logoutMinutes = logoutHour * 60 + logoutMinute;

          let isEarlyOut = false;
          if (isOvernightShift) {
            if (logoutMinutes < parsedSchedule.startMinutes && logoutMinutes < parsedSchedule.endMinutes) {
              isEarlyOut = true;
            }
          } else {
            if (logoutMinutes < parsedSchedule.endMinutes) {
              isEarlyOut = true;
            }
          }

          if (isEarlyOut) {
            const reportKey = `${profile.email.toLowerCase()}_EARLY_OUT`;
            if (!existingReportSet.has(reportKey)) {
              const earlyByMinutes = parsedSchedule.endMinutes - logoutMinutes;
              reportsToCreate.push({
                agent_email: profile.email.toLowerCase(),
                agent_name: agentName,
                profile_id: profile.id,
                incident_date: targetDateStr,
                incident_type: 'EARLY_OUT',
                severity: calculateTimeSeverity(earlyByMinutes),
                details: {
                  scheduledEnd: parsedSchedule.endMinutes,
                  actualLogout: logoutMinutes,
                  earlyByMinutes,
                },
                status: 'open',
              });
            }
          }
        }
      }

      // ========================
      // Check for OVERBREAK with dynamic severity
      // ========================
      if (breakSchedule) {
        const breakParsed = parseScheduleRange(breakSchedule);
        if (breakParsed) {
          let allowedBreakMinutes = breakParsed.endMinutes - breakParsed.startMinutes;
          if (allowedBreakMinutes < 0) allowedBreakMinutes += 24 * 60;
          
          const graceMinutes = Math.ceil(allowedBreakMinutes / 6);
          const maxAllowedMinutes = allowedBreakMinutes + graceMinutes;

          // Calculate total break time from events
          const breakInEvents = profileEvents.filter(e => e.event_type === 'BREAK_IN');
          const breakOutEvents = profileEvents.filter(e => e.event_type === 'BREAK_OUT');
          
          let totalBreakSeconds = 0;
          for (const startEvent of breakInEvents) {
            const matchingEnd = breakOutEvents.find(e => 
              new Date(e.created_at) > new Date(startEvent.created_at)
            );
            if (matchingEnd) {
              const duration = (new Date(matchingEnd.created_at).getTime() - new Date(startEvent.created_at).getTime()) / 1000;
              totalBreakSeconds += duration;
            }
          }

          const totalBreakMinutes = Math.floor(totalBreakSeconds / 60);

          if (totalBreakMinutes > maxAllowedMinutes) {
            const reportKey = `${profile.email.toLowerCase()}_OVERBREAK`;
            if (!existingReportSet.has(reportKey)) {
              const overageMinutes = totalBreakMinutes - allowedBreakMinutes;
              reportsToCreate.push({
                agent_email: profile.email.toLowerCase(),
                agent_name: agentName,
                profile_id: profile.id,
                incident_date: targetDateStr,
                incident_type: 'OVERBREAK',
                severity: calculateTimeSeverity(overageMinutes),
                details: {
                  allowedMinutes: allowedBreakMinutes,
                  graceMinutes,
                  totalBreakMinutes,
                  overageMinutes,
                },
                status: 'open',
              });
            }
          }
        }
      }

      // ========================
      // Check for TIME_NOT_MET with Upwork priority and dynamic severity
      // ========================
      if (parsedSchedule) {
        let requiredMinutes = parsedSchedule.endMinutes - parsedSchedule.startMinutes;
        if (requiredMinutes < 0) requiredMinutes += 24 * 60;

        let loggedMinutes: number | null = null;
        let timeSource: string = 'portal';

        // Check Upwork first if agent has upwork_contract_id
        if (profile.upwork_contract_id) {
          const upworkHours = upworkHoursByAgent.get(profile.email.toLowerCase());
          if (upworkHours !== undefined) {
            loggedMinutes = Math.floor(upworkHours * 60);
            timeSource = 'upwork';
          }
        }

        // Fall back to Portal time if no Upwork data
        if (loggedMinutes === null && loginEvents.length > 0 && logoutEvents.length > 0) {
          const firstLogin = new Date(loginEvents[0].created_at);
          const lastLogout = new Date(logoutEvents[logoutEvents.length - 1].created_at);
          loggedMinutes = Math.floor((lastLogout.getTime() - firstLogin.getTime()) / (1000 * 60));
          timeSource = 'portal';
        }

        // If logged less than 90% of required hours
        if (loggedMinutes !== null && loggedMinutes < requiredMinutes * 0.9) {
          const reportKey = `${profile.email.toLowerCase()}_TIME_NOT_MET`;
          if (!existingReportSet.has(reportKey)) {
            const shortfallMinutes = requiredMinutes - loggedMinutes;
            reportsToCreate.push({
              agent_email: profile.email.toLowerCase(),
              agent_name: agentName,
              profile_id: profile.id,
              incident_date: targetDateStr,
              incident_type: 'TIME_NOT_MET',
              severity: calculateTimeSeverity(shortfallMinutes),
              details: {
                loggedHours: loggedMinutes / 60,
                requiredHours: requiredMinutes / 60,
                shortfallMinutes,
                timeSource,
              },
              status: 'open',
            });
          }
        }
      }

      // ========================
      // Check for QUOTA_NOT_MET
      // Skip Team Lead / Technical positions entirely
      // ========================
      const posArr = profile.position || [];
      const isNonTicketRole = posArr.some(p => ['Team Lead', 'Technical'].includes(p));
      
      if (!isNonTicketRole) {
        // Use effective quotas from the schedule resolver (accounts for overrides & assignments)
        const effQuotaEmail = effectiveRow.effective_quota_email || 0;
        const effQuotaChat = effectiveRow.effective_quota_chat || 0;
        const effQuotaPhone = effectiveRow.effective_quota_phone || 0;
        
        const hasEmail = posArr.includes('Email');
        const hasChat = posArr.includes('Chat');
        const hasPhone = posArr.includes('Phone');
        
        let expectedQuota = 0;
        if (hasEmail && hasChat && hasPhone) expectedQuota = effQuotaEmail + effQuotaChat + effQuotaPhone;
        else if (hasEmail && hasChat) expectedQuota = effQuotaEmail + effQuotaChat;
        else if (hasEmail && hasPhone) expectedQuota = effQuotaEmail + effQuotaPhone;
        else if (hasEmail) expectedQuota = effQuotaEmail;
        
        if (expectedQuota > 0) {
          const agentTickets = ticketCountsByAgent.get(profile.email.toLowerCase()) || { email: 0, chat: 0, call: 0 };
          const actualTotal = agentTickets.email + agentTickets.chat + agentTickets.call;

          if (actualTotal < expectedQuota) {
            const reportKey = `${profile.email.toLowerCase()}_QUOTA_NOT_MET`;
            if (!existingReportSet.has(reportKey)) {
              const shortfall = expectedQuota - actualTotal;
              reportsToCreate.push({
                agent_email: profile.email.toLowerCase(),
                agent_name: agentName,
                profile_id: profile.id,
                incident_date: targetDateStr,
                incident_type: 'QUOTA_NOT_MET',
                severity: calculateQuotaSeverity(shortfall),
                details: {
                  expectedQuota,
                  actualTotal,
                  shortfall,
                  breakdown: agentTickets,
                  position: profile.position,
                  quotaSource: 'effective_schedule',
                },
                status: 'open',
              });
            }
          }
        }
      }

      // ========================
      // Check for HIGH_GAP (Email Support only, skip TL/Technical)
      // ========================
      if (!isNonTicketRole && isEmailSupport(profile)) {
        const avgGapSeconds = ticketGapByAgent.get(profile.email.toLowerCase());
        if (avgGapSeconds !== undefined) {
          const avgGapMinutes = avgGapSeconds / 60;
          const gapSeverity = calculateGapSeverity(avgGapMinutes);

          if (gapSeverity !== null) {
            const reportKey = `${profile.email.toLowerCase()}_HIGH_GAP`;
            if (!existingReportSet.has(reportKey)) {
              reportsToCreate.push({
                agent_email: profile.email.toLowerCase(),
                agent_name: agentName,
                profile_id: profile.id,
                incident_date: targetDateStr,
                incident_type: 'HIGH_GAP',
                severity: gapSeverity,
                details: {
                  avgGapMinutes: Math.round(avgGapMinutes * 10) / 10,
                  avgGapSeconds,
                  threshold: 5,
                },
                status: 'open',
              });
            }
          }
        }
      }

      // ========================
      // Check for NCNS (No Call No Show)
      // Agent has a scheduled shift, no login events, and no approved/pending outage request
      // ========================
      if (loginEvents.length === 0 && parsedSchedule) {
        const reportKey = `${profile.email.toLowerCase()}_NCNS`;
        if (!existingReportSet.has(reportKey)) {
          // Check for approved or pending outage request covering this date
          const { data: outageRequests } = await supabase
            .from('leave_requests')
            .select('id')
            .eq('agent_email', profile.email.toLowerCase())
            .lte('start_date', targetDateStr)
            .gte('end_date', targetDateStr)
            .in('status', ['approved', 'pending', 'for_review', 'pending_override'])
            .limit(1);

          if (!outageRequests || outageRequests.length === 0) {
            console.log(`NCNS detected for ${agentName} - scheduled shift ${schedule} but no login and no outage request`);
            reportsToCreate.push({
              agent_email: profile.email.toLowerCase(),
              agent_name: agentName,
              profile_id: profile.id,
              incident_date: targetDateStr,
              incident_type: 'NCNS',
              severity: 'critical',
              details: {
                scheduledShift: schedule,
                message: 'Agent was scheduled but did not log in and has no outage request',
              },
              status: 'open',
            });

            // Trigger real-time Slack + Email alert
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-status-alert-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  agentEmail: profile.email.toLowerCase(),
                  agentName,
                  alertType: 'NCNS',
                  details: {
                    scheduledShift: schedule,
                    incidentDate: targetDateStr,
                    severity: 'critical',
                  },
                }),
              });
            } catch (alertErr) {
              console.error(`Failed to send NCNS alert for ${agentName}:`, alertErr);
            }
          }
        }
      }
    }

    // Insert all reports
    if (reportsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('agent_reports')
        .insert(reportsToCreate);

      if (insertError) {
        console.error('Failed to insert reports:', insertError);
      }
    }

    // Send summary notification if there are reports
    if (reportsToCreate.length > 0) {
      // Get admin emails
      const { data: admins } = await supabase
        .from('user_roles')
        .select('email')
        .in('role', ['admin', 'hr', 'super_admin']);

      const adminEmails = [...new Set(admins?.map(a => a.email.toLowerCase()) || [])];

      // Group reports by type
      const reportsByType: Record<string, number> = {};
      reportsToCreate.forEach(r => {
        reportsByType[r.incident_type] = (reportsByType[r.incident_type] || 0) + 1;
      });

      const summaryLines = Object.entries(reportsByType)
        .map(([type, count]) => `• ${type}: ${count}`)
        .join('\n');

      const title = `📊 Daily Agent Report: ${targetDateStr}`;
      const message = `${reportsToCreate.length} incidents detected:\n${summaryLines}`;

      // Create in-app notifications
      const notifications = adminEmails.map(email => ({
        user_email: email,
        title,
        message,
        type: 'agent_report_summary',
        reference_type: 'agent_reports',
        reference_id: null,
      }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      // Send email to admins
      if (adminEmails.length > 0) {
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>📊 Daily Agent Report</h2>
            <p><strong>Date:</strong> ${targetDateStr}</p>
            <p><strong>Total Incidents:</strong> ${reportsToCreate.length}</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <h3>Summary by Type</h3>
            <ul>
              ${Object.entries(reportsByType).map(([type, count]) => 
                `<li><strong>${type}:</strong> ${count}</li>`
              ).join('')}
            </ul>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              This report was automatically generated by VFS Updates Hub.
              View full details in the Agent Reports section.
            </p>
          </div>
        `;

        try {
          await sendEmail({
            to: adminEmails,
            subject: title,
            html: htmlBody,
          });
        } catch (emailErr) {
          console.error('Email send error:', emailErr);
        }
      }

      // Slack notification disabled for daily incident reports
      // Will be re-enabled once the format is confirmed
    }

    // ========================
    // TRIGGER EOD ANALYTICS
    // ========================
    // Call the generate-eod-analytics function to send team-wide performance summary
    try {
      console.log('Triggering EOD analytics...');
      const eodResponse = await fetch(`${supabaseUrl}/functions/v1/generate-eod-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ date: targetDateStr }),
      });
      
      if (eodResponse.ok) {
        const eodResult = await eodResponse.json();
        console.log('EOD analytics completed:', eodResult.analytics?.overallStatus);
      } else {
        const errorText = await eodResponse.text();
        console.error('EOD analytics failed:', errorText);
      }
    } catch (eodError) {
      console.error('Error calling EOD analytics:', eodError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDateStr,
        reportsCreated: reportsToCreate.length,
        reportTypes: reportsToCreate.reduce((acc, r) => {
          acc[r.incident_type] = (acc[r.incident_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in generate-agent-reports:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
