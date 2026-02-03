import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
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

    // Fetch all agent profiles with their directories
    const { data: profiles } = await supabase
      .from('agent_profiles')
      .select('id, email, full_name');

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No profiles found', reports: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all agent directories
    const { data: directories } = await supabase
      .from('agent_directory')
      .select('email, agent_name, mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule, day_off');

    const directoryMap = new Map<string, AgentDirectory>();
    directories?.forEach(d => directoryMap.set(d.email.toLowerCase(), d));

    // Fetch all events for the target date
    const startOfDay = `${targetDateStr}T00:00:00.000Z`;
    const endOfDay = `${targetDateStr}T23:59:59.999Z`;

    const { data: allEvents } = await supabase
      .from('profile_events')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: true });

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
      const directory = directoryMap.get(profile.email.toLowerCase());
      const agentName = profile.full_name || directory?.agent_name || profile.email;
      const profileEvents = (allEvents as ProfileEvent[] || []).filter(e => e.profile_id === profile.id);

      // Skip if day off
      if (directory && isDayOff(directory, dayName)) {
        continue;
      }

      // Get schedule for the day
      const schedule = directory ? getScheduleForDay(directory, dayOfWeek) : null;
      const parsedSchedule = schedule ? parseScheduleRange(schedule) : null;

      // Check for NO_LOGOUT: Had LOGIN but no LOGOUT
      const loginEvents = profileEvents.filter(e => e.event_type === 'LOGIN');
      const logoutEvents = profileEvents.filter(e => e.event_type === 'LOGOUT');
      
      if (loginEvents.length > 0 && logoutEvents.length === 0) {
        const reportKey = `${profile.email.toLowerCase()}_NO_LOGOUT`;
        if (!existingReportSet.has(reportKey)) {
          reportsToCreate.push({
            agent_email: profile.email.toLowerCase(),
            agent_name: agentName,
            profile_id: profile.id,
            incident_date: targetDateStr,
            incident_type: 'NO_LOGOUT',
            severity: 'medium',
            details: {
              loginTime: loginEvents[0].created_at,
              message: 'Agent logged in but did not log out by end of day',
            },
            status: 'open',
          });
        }
      }

      // Check for LATE_LOGIN
      if (parsedSchedule && loginEvents.length > 0) {
        const firstLogin = new Date(loginEvents[0].created_at);
        // Convert to EST for comparison
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

        // Late if more than 10 minutes after schedule start
        if (loginMinutes > parsedSchedule.startMinutes + 10) {
          const reportKey = `${profile.email.toLowerCase()}_LATE_LOGIN`;
          if (!existingReportSet.has(reportKey)) {
            const lateMinutes = loginMinutes - parsedSchedule.startMinutes;
            reportsToCreate.push({
              agent_email: profile.email.toLowerCase(),
              agent_name: agentName,
              profile_id: profile.id,
              incident_date: targetDateStr,
              incident_type: 'LATE_LOGIN',
              severity: 'low',
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

      // Check for EXCESSIVE_RESTART: Total restart time > 5 minutes
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
          reportsToCreate.push({
            agent_email: profile.email.toLowerCase(),
            agent_name: agentName,
            profile_id: profile.id,
            incident_date: targetDateStr,
            incident_type: 'EXCESSIVE_RESTARTS',
            severity: 'medium',
            details: {
              totalRestartSeconds,
              restartCount: restartStartEvents.length,
            },
            status: 'open',
          });
        }
      }

      // Check for BIO_OVERUSE: Total bio time exceeded allowance
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

      // Calculate bio allowance (4 mins for 8+ hour shift, 2 mins otherwise)
      let bioAllowance = 120; // Default 2 mins
      if (parsedSchedule) {
        let shiftDuration = parsedSchedule.endMinutes - parsedSchedule.startMinutes;
        if (shiftDuration < 0) shiftDuration += 24 * 60;
        if (shiftDuration >= 480) bioAllowance = 240; // 4 mins for 8+ hour shift
      }

      if (totalBioSeconds > bioAllowance) {
        const reportKey = `${profile.email.toLowerCase()}_BIO_OVERUSE`;
        if (!existingReportSet.has(reportKey)) {
          reportsToCreate.push({
            agent_email: profile.email.toLowerCase(),
            agent_name: agentName,
            profile_id: profile.id,
            incident_date: targetDateStr,
            incident_type: 'BIO_OVERUSE',
            severity: 'low',
            details: {
              totalBioSeconds,
              bioAllowance,
              overageSeconds: totalBioSeconds - bioAllowance,
            },
            status: 'open',
          });
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

      // Send email via Resend
      if (resendApiKey && adminEmails.length > 0) {
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
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: 'VFS Updates Hub <noreply@vfsoperations.online>',
              to: adminEmails,
              subject: title,
              html: htmlBody,
            }),
          });
        } catch (emailErr) {
          console.error('Email send error:', emailErr);
        }
      }

      // Slack notification disabled - pending finalization of Daily Agent Report details
      // Will be re-enabled once the format is confirmed
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
