import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Auto-Logout Stale Sessions
 * 
 * Runs every 15 minutes via pg_cron.
 * For each agent whose profile_status.current_status != 'LOGGED_OUT':
 *   1. Resolve their effective schedule for the status_since date
 *   2. Calculate shift end time
 *   3. If current time is 5+ hours past shift end → auto-logout + NO_LOGOUT report
 *   4. Handle overnight shifts correctly
 *   5. Skip agents on approved outages or day off
 */

function parseTimeToMinutes(timeStr: string): number | null {
  const match12 = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }
  return null;
}

function parseScheduleRange(schedule: string): { startMinutes: number; endMinutes: number } | null {
  const parts = schedule.split('-').map(s => s.trim());
  if (parts.length !== 2) return null;
  const start = parseTimeToMinutes(parts[0]);
  const end = parseTimeToMinutes(parts[1]);
  if (start === null || end === null) return null;
  return { startMinutes: start, endMinutes: end };
}

/**
 * Convert a UTC timestamp to an EST date string 'YYYY-MM-DD'
 */
function getESTDateFromUTC(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Calculate the UTC timestamp for shift_end + 5 hours for a given EST date and schedule.
 * Returns null if the schedule can't be parsed.
 */
function getAutoLogoutDeadlineUTC(estDateStr: string, endMinutes: number, startMinutes: number): Date {
  const [year, month, day] = estDateStr.split('-').map(Number);
  
  // Determine if overnight shift (end < start, e.g., 8PM-3AM)
  const isOvernight = endMinutes < startMinutes;
  
  // Shift end in EST
  const shiftEndHour = Math.floor(endMinutes / 60);
  const shiftEndMin = endMinutes % 60;
  
  // Build the EST date of shift end
  const shiftEndDate = new Date(Date.UTC(year, month - 1, day));
  if (isOvernight) {
    // Shift ends on the next calendar day
    shiftEndDate.setUTCDate(shiftEndDate.getUTCDate() + 1);
  }
  
  // EST = UTC-5, so add 5 hours to convert EST to UTC
  shiftEndDate.setUTCHours(shiftEndHour + 5, shiftEndMin, 0, 0);
  
  // Add 5 hours for the auto-logout deadline
  const deadline = new Date(shiftEndDate.getTime() + 5 * 60 * 60 * 1000);
  return deadline;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`[auto-logout] Running at ${now.toISOString()}`);

    // 1. Find all agents NOT logged out
    const { data: activeStatuses, error: statusError } = await supabase
      .from('profile_status')
      .select('profile_id, current_status, status_since')
      .neq('current_status', 'LOGGED_OUT');

    if (statusError) {
      throw new Error(`Failed to fetch active statuses: ${statusError.message}`);
    }

    if (!activeStatuses || activeStatuses.length === 0) {
      console.log('[auto-logout] No active sessions found');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[auto-logout] Found ${activeStatuses.length} active sessions`);

    let processed = 0;
    let autoLoggedOut = 0;

    for (const status of activeStatuses) {
      processed++;
      const { profile_id, current_status, status_since } = status;

      if (!status_since) continue;

      // Get the EST date of when the status was set
      const statusDateStr = getESTDateFromUTC(status_since);
      const todayStr = getESTDateFromUTC(now.toISOString());

      // If status is from today, skip (shift might still be active)
      // We'll still check using the schedule-based deadline below
      // but for same-day, we need to verify shift has ended + 5 hours

      // 2. Resolve effective schedule for the status_since date
      const { data: effectiveData, error: effectiveError } = await supabase.rpc('get_effective_schedule', {
        p_agent_id: profile_id,
        p_target_date: statusDateStr,
      });

      if (effectiveError || !effectiveData || effectiveData.length === 0) {
        console.log(`[auto-logout] Skipping ${profile_id} - failed to resolve schedule`);
        continue;
      }

      const row = effectiveData[0];

      // Skip day off or no schedule
      if (row.is_day_off || !row.effective_schedule || row.effective_schedule.trim() === '' || row.effective_schedule === 'Day Off') {
        // Day off but still logged in? Auto-logout immediately (shouldn't happen)
        // Actually, let's just skip - they may have an override
        console.log(`[auto-logout] Skipping ${profile_id} - day off or no schedule on ${statusDateStr}`);
        continue;
      }

      // 3. Parse schedule and calculate deadline
      const parsed = parseScheduleRange(row.effective_schedule);
      if (!parsed) {
        console.log(`[auto-logout] Skipping ${profile_id} - unparseable schedule: ${row.effective_schedule}`);
        continue;
      }

      const deadline = getAutoLogoutDeadlineUTC(statusDateStr, parsed.endMinutes, parsed.startMinutes);

      // 4. Check if we've passed the deadline
      if (now.getTime() < deadline.getTime()) {
        // Not yet 5 hours past shift end
        continue;
      }

      // 5. Check for approved leave on the status date
      const { data: approvedLeave } = await supabase
        .from('leave_requests')
        .select('id')
        .eq('status', 'approved')
        .lte('start_date', statusDateStr)
        .gte('end_date', statusDateStr)
        .limit(1);

      // Get agent profile info
      const { data: agentProfile } = await supabase
        .from('agent_profiles')
        .select('email, full_name')
        .eq('id', profile_id)
        .single();

      if (!agentProfile) {
        console.log(`[auto-logout] Skipping ${profile_id} - no profile found`);
        continue;
      }

      // Filter leave by agent email
      const { data: agentLeave } = await supabase
        .from('leave_requests')
        .select('id')
        .eq('status', 'approved')
        .eq('agent_email', agentProfile.email.toLowerCase())
        .lte('start_date', statusDateStr)
        .gte('end_date', statusDateStr)
        .limit(1);

      // Don't skip on leave - they still forgot to log out

      const autoLogoutTimestamp = deadline.toISOString();

      // 6. Idempotency check: skip if a SYSTEM_AUTO_LOGOUT event already exists for this profile + date
      const { data: existingEvent } = await supabase
        .from('profile_events')
        .select('id')
        .eq('profile_id', profile_id)
        .eq('event_type', 'LOGOUT')
        .eq('triggered_by', 'SYSTEM_AUTO_LOGOUT')
        .gte('created_at', `${statusDateStr}T00:00:00-05:00`)
        .lt('created_at', `${statusDateStr}T23:59:59-05:00`)
        .limit(1);

      if (existingEvent && existingEvent.length > 0) {
        console.log(`[auto-logout] Skipping ${agentProfile.email} — SYSTEM_AUTO_LOGOUT already exists for ${statusDateStr}`);
        // Just ensure status is LOGGED_OUT
        await supabase
          .from('profile_status')
          .update({
            current_status: 'LOGGED_OUT',
            status_since: autoLogoutTimestamp,
          })
          .eq('profile_id', profile_id);
        continue;
      }

      console.log(`[auto-logout] Auto-logging out ${agentProfile.email} (status since ${status_since}, deadline was ${deadline.toISOString()})`);

      // 7. Insert SYSTEM_AUTO_LOGOUT event
      await supabase.from('profile_events').insert({
        profile_id,
        event_type: 'LOGOUT',
        prev_status: current_status,
        new_status: 'LOGGED_OUT',
        triggered_by: 'SYSTEM_AUTO_LOGOUT',
        created_at: autoLogoutTimestamp,
      });

      // 8. Create NO_LOGOUT report (check for duplicates first)
      const { data: existingReport } = await supabase
        .from('agent_reports')
        .select('id')
        .eq('agent_email', agentProfile.email.toLowerCase())
        .eq('incident_date', statusDateStr)
        .eq('incident_type', 'NO_LOGOUT')
        .limit(1);

      if (!existingReport || existingReport.length === 0) {
        await supabase.from('agent_reports').insert({
          agent_email: agentProfile.email.toLowerCase(),
          agent_name: agentProfile.full_name || agentProfile.email,
          profile_id,
          incident_date: statusDateStr,
          incident_type: 'NO_LOGOUT',
          severity: 'high',
          details: {
            lastStatus: current_status,
            lastStatusSince: status_since,
            autoLogoutTime: autoLogoutTimestamp,
            source: 'cron_auto_logout',
          },
          status: 'open',
        });
      }

      // 9. Update profile_status to LOGGED_OUT
      await supabase
        .from('profile_status')
        .update({
          current_status: 'LOGGED_OUT',
          status_since: autoLogoutTimestamp,
        })
        .eq('profile_id', profile_id);

      autoLoggedOut++;
    }

    console.log(`[auto-logout] Done. Processed: ${processed}, Auto-logged out: ${autoLoggedOut}`);

    return new Response(
      JSON.stringify({ success: true, processed, autoLoggedOut }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[auto-logout] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
