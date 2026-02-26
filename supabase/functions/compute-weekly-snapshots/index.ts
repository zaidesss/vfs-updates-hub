import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Helpers ──────────────────────────────────────────────────────────

function getWeekBoundaries() {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const estNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dayOfWeek = estNow.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : dayOfWeek - 1;

  const currentWeekMonday = new Date(estNow);
  currentWeekMonday.setDate(estNow.getDate() - daysToMonday);
  currentWeekMonday.setHours(0, 0, 0, 0);

  const previousWeekMonday = new Date(currentWeekMonday);
  previousWeekMonday.setDate(currentWeekMonday.getDate() - 7);

  const previousWeekSunday = new Date(previousWeekMonday);
  previousWeekSunday.setDate(previousWeekMonday.getDate() + 6);

  return {
    weekStartStr: previousWeekMonday.toISOString().split("T")[0],
    weekEndStr: previousWeekSunday.toISOString().split("T")[0],
    previousWeekMonday,
    previousWeekSunday,
  };
}

function minutesToFormatted(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(/[:\s]/);
  if (parts.length < 2) return null;
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  const isPM = timeStr.toUpperCase().includes("PM");
  const isAM = timeStr.toUpperCase().includes("AM");
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// ── Per-Agent: Scorecard Snapshot ────────────────────────────────────

async function computeScorecardSnapshot(
  supabase: any,
  agent: any,
  weekStartStr: string,
  weekEndStr: string,
  previousWeekMonday: Date,
  previousWeekSunday: Date
) {
  const [schedulesRes, ticketsRes, qaRes, leaveRes, zendeskRes, revalidaRes] = await Promise.all([
    supabase.rpc("get_effective_schedules_for_week", {
      p_agent_id: agent.id,
      p_week_start: weekStartStr,
    }),
    supabase
      .from("ticket_logs")
      .select("ticket_type, timestamp, is_ot")
      .eq("agent_email", agent.email)
      .gte("timestamp", new Date(previousWeekMonday.getTime() - 5 * 60 * 60 * 1000).toISOString())
      .lt("timestamp", new Date(previousWeekSunday.getTime() + 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("qa_evaluations")
      .select("percentage")
      .eq("agent_email", agent.email)
      .gte("work_week_start", weekStartStr)
      .lte("work_week_start", weekEndStr),
    supabase
      .from("leave_requests")
      .select("outage_reason, start_date, end_date, status")
      .eq("agent_email", agent.email)
      .eq("status", "approved")
      .lte("start_date", weekEndStr)
      .gte("end_date", weekStartStr),
    supabase
      .from("zendesk_agent_metrics")
      .select("*")
      .eq("agent_email", agent.email)
      .eq("week_start", weekStartStr)
      .eq("week_end", weekEndStr)
      .single(),
    supabase
      .from("revalida_attempts")
      .select("final_percent, batch:revalida_batches!inner(start_at)")
      .eq("agent_email", agent.email)
      .eq("status", "graded")
      .gte("batch.start_at", weekStartStr)
      .lt("batch.start_at", weekEndStr + "T23:59:59Z")
      .order("submitted_at", { ascending: false })
      .limit(1),
  ]);

  const schedules = schedulesRes.data || [];
  const ticketCounts = ticketsRes.data || [];
  const qaScores = qaRes.data || [];
  const leaveData = leaveRes.data || [];
  const zendeskMetrics = zendeskRes.data;
  const revalidaData = revalidaRes.data || [];

  // Ticket aggregation
  let emailCount = 0, chatCount = 0, callCount = 0, otEmailCount = 0;
  const dailyBreakdown: Record<string, { email: number; chat: number; call: number; ot_email: number }> = {};

  for (const ticket of ticketCounts) {
    const ticketDate = new Date(ticket.timestamp).toISOString().split("T")[0];
    if (!dailyBreakdown[ticketDate]) {
      dailyBreakdown[ticketDate] = { email: 0, chat: 0, call: 0, ot_email: 0 };
    }
    const type = (ticket.ticket_type || "").toLowerCase();
    if (type === "email" && ticket.is_ot) {
      otEmailCount++;
      dailyBreakdown[ticketDate].ot_email++;
    } else if (type === "email") {
      emailCount++;
      dailyBreakdown[ticketDate].email++;
    } else if (type === "chat") {
      chatCount++;
      dailyBreakdown[ticketDate].chat++;
    } else if (type === "call") {
      callCount++;
      dailyBreakdown[ticketDate].call++;
    }
  }

  // Leave calculation
  let plannedLeaveDays = 0, unplannedOutageDays = 0;
  for (const leave of leaveData) {
    const startDate = new Date(leave.start_date);
    const endDate = new Date(leave.end_date);
    const weekStart = new Date(weekStartStr);
    const weekEnd = new Date(weekEndStr);
    weekEnd.setDate(weekEnd.getDate() + 1);

    const current = new Date(Math.max(startDate.getTime(), weekStart.getTime()));
    while (current.getTime() < Math.min(endDate.getTime() + 86400000, weekEnd.getTime())) {
      if (leave.outage_reason === "Planned Leave") plannedLeaveDays++;
      else unplannedOutageDays++;
      current.setDate(current.getDate() + 1);
    }
  }

  // Schedule analysis
  let scheduledDays = 0;
  let otScheduledDays = 0;
  for (const s of schedules) {
    if (!s.is_day_off && s.effective_schedule && s.effective_schedule !== "Day Off") {
      scheduledDays++;
    }
    if (s.effective_ot_schedule && s.effective_ot_schedule !== "" && s.effective_ot_schedule !== "Day Off") {
      otScheduledDays++;
    }
  }

  const qaAverage = qaScores.length > 0
    ? qaScores.reduce((sum: number, q: any) => sum + (q.percentage || 0), 0) / qaScores.length
    : null;

  const revalidaScore = revalidaData.length > 0 ? revalidaData[0].final_percent : null;

  // Calculate OT productivity percentage
  let otProductivityPercent: number | null = null;
  if (otEmailCount > 0 && agent.quota_ot_email && agent.quota_ot_email > 0 && otScheduledDays > 0) {
    const weeklyOtQuota = agent.quota_ot_email * otScheduledDays;
    otProductivityPercent = weeklyOtQuota > 0 ? (otEmailCount / weeklyOtQuota) * 100 : null;
  }

  const scorecardSnapshot = {
    agent_email: agent.email,
    agent_id: agent.id,
    agent_name: agent.full_name || agent.agent_name || null,
    week_start: weekStartStr,
    week_end: weekEndStr,
    support_type: agent.position,
    productivity_count: emailCount + chatCount + callCount,
    ot_productivity: otProductivityPercent,
    qa: qaAverage,
    revalida: revalidaScore,
    call_aht_seconds: zendeskMetrics?.call_aht_seconds || null,
    chat_aht_seconds: zendeskMetrics?.chat_aht_seconds || null,
    chat_frt_seconds: zendeskMetrics?.chat_frt_seconds || null,
    order_escalation: zendeskMetrics?.order_escalation || null,
    planned_leave_days: plannedLeaveDays,
    unplanned_outage_days: unplannedOutageDays,
    approved_leave_days: plannedLeaveDays + unplannedOutageDays,
    scheduled_days: scheduledDays,
    schedule_json: schedules,
    schedule_source: "computed",
    computed_at: new Date().toISOString(),
    is_final: true,
  };

  const ticketSummary = {
    agent_email: agent.email,
    week_start: weekStartStr,
    daily_breakdown: Object.entries(dailyBreakdown).map(([date, counts]) => ({ date, ...counts })),
    total_tickets: emailCount + chatCount + callCount + otEmailCount,
    computed_at: new Date().toISOString(),
    is_final: true,
  };

  const agentMetric = {
    agent_email: agent.email,
    week_start: weekStartStr,
    week_end: weekEndStr,
    attendance_json: {
      schedules: schedules,
      planned_leave_days: plannedLeaveDays,
      unplanned_outage_days: unplannedOutageDays,
    },
  };

  return { scorecardSnapshot, ticketSummary, agentMetric };
}

// ── Per-Agent: Attendance Snapshots ──────────────────────────────────

async function computeAttendanceSnapshots(
  supabase: any,
  agent: any,
  weekStartStr: string
) {
  const snapshots: any[] = [];
  const weekStart = new Date(weekStartStr);

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    // Get effective schedule for this day
    const { data: scheduleData } = await supabase.rpc("get_effective_schedule", {
      p_agent_id: agent.id,
      p_target_date: dateStr,
    });

    const schedule = scheduleData?.[0];

    // Get profile events for this day (EST boundaries)
    const dayStartUTC = new Date(date.getTime() + 5 * 60 * 60 * 1000); // EST midnight in UTC
    const dayEndUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000);

    const { data: events } = await supabase
      .from("profile_events")
      .select("event_type, new_status, prev_status, created_at")
      .eq("profile_id", agent.id)
      .gte("created_at", dayStartUTC.toISOString())
      .lt("created_at", dayEndUTC.toISOString())
      .order("created_at", { ascending: true });

    const dayEvents = events || [];

    // Check for leave
    const { data: leaveForDay } = await supabase
      .from("leave_requests")
      .select("outage_reason")
      .eq("agent_email", agent.email)
      .eq("status", "approved")
      .lte("start_date", dateStr)
      .gte("end_date", dateStr)
      .limit(1);

    const isOnLeave = leaveForDay && leaveForDay.length > 0;
    const leaveType = isOnLeave ? leaveForDay[0].outage_reason : null;

    // Find login/logout times
    const loginEvent = dayEvents.find((e: any) => e.event_type === "LOGIN");
    const logoutEvent = [...dayEvents].reverse().find((e: any) => e.event_type === "LOGOUT");
    const otLoginEvent = dayEvents.find((e: any) => e.new_status === "ON_OT");
    const otLogoutEvent = [...dayEvents].reverse().find((e: any) => e.prev_status === "ON_OT");

    const loginTime = loginEvent?.created_at || null;
    const logoutTime = logoutEvent?.created_at || null;

    // Calculate break duration
    let breakMinutes = 0;
    let breakStart: Date | null = null;
    for (const e of dayEvents) {
      if (e.new_status === "ON_BREAK" || e.new_status === "ON_BIO") {
        breakStart = new Date(e.created_at);
      } else if (breakStart && (e.prev_status === "ON_BREAK" || e.prev_status === "ON_BIO")) {
        breakMinutes += (new Date(e.created_at).getTime() - breakStart.getTime()) / 60000;
        breakStart = null;
      }
    }

    // Calculate hours worked
    let hoursWorkedMinutes: number | null = null;
    if (loginTime && logoutTime) {
      const totalMinutes = (new Date(logoutTime).getTime() - new Date(loginTime).getTime()) / 60000;
      hoursWorkedMinutes = Math.max(0, Math.round(totalMinutes - breakMinutes));
    }

    // OT hours
    let otHoursWorkedMinutes: number | null = null;
    if (otLoginEvent && otLogoutEvent) {
      otHoursWorkedMinutes = Math.round(
        (new Date(otLogoutEvent.created_at).getTime() - new Date(otLoginEvent.created_at).getTime()) / 60000
      );
    }

    // OT ticket count for this day
    const { data: otTickets } = await supabase
      .from("ticket_logs")
      .select("id", { count: "exact", head: true })
      .eq("agent_email", agent.email)
      .eq("is_ot", true)
      .gte("timestamp", dayStartUTC.toISOString())
      .lt("timestamp", dayEndUTC.toISOString());

    const otTicketCount = otTickets?.length || 0;

    // Parse schedule times
    const scheduleStr = schedule?.effective_schedule || "";
    const scheduleParts = scheduleStr.split(" - ");
    const scheduleStartMins = scheduleParts[0] ? parseTimeToMinutes(scheduleParts[0]) : null;
    const scheduleEndMins = scheduleParts[1] ? parseTimeToMinutes(scheduleParts[1]) : null;

    // Determine early out
    let isEarlyOut = false;
    if (logoutTime && scheduleEndMins !== null) {
      const logoutDate = new Date(logoutTime);
      const logoutMins = logoutDate.getHours() * 60 + logoutDate.getMinutes();
      // Offset for EST
      const estLogout = new Date(logoutDate.getTime() - 5 * 60 * 60 * 1000);
      const estMins = estLogout.getHours() * 60 + estLogout.getMinutes();
      if (estMins < scheduleEndMins - 5) isEarlyOut = true; // 5 min grace
    }

    // Allowed break
    const breakScheduleStr = schedule?.effective_break_schedule || "";
    const breakParts = breakScheduleStr.split(" - ");
    let allowedBreakMinutes: number | null = null;
    if (breakParts.length === 2) {
      const bStart = parseTimeToMinutes(breakParts[0]);
      const bEnd = parseTimeToMinutes(breakParts[1]);
      if (bStart !== null && bEnd !== null) allowedBreakMinutes = bEnd - bStart;
    }

    const breakOverageMinutes = allowedBreakMinutes !== null
      ? Math.max(0, Math.round(breakMinutes) - allowedBreakMinutes)
      : null;

    // Determine status
    let status = "absent";
    if (isOnLeave) status = "leave";
    else if (schedule?.is_day_off) status = "day_off";
    else if (loginTime) status = "present";

    if (status === "absent" && !schedule?.is_day_off && !isOnLeave && dayEvents.length === 0) {
      // Check if it's a future day or just no data
      if (date > new Date()) continue; // Skip future dates
    }

    snapshots.push({
      profile_id: agent.id,
      date: dateStr,
      status,
      login_time: loginTime,
      logout_time: logoutTime,
      schedule_start: scheduleParts[0]?.trim() || null,
      schedule_end: scheduleParts[1]?.trim() || null,
      hours_worked_minutes: hoursWorkedMinutes,
      hours_worked_formatted: hoursWorkedMinutes !== null ? minutesToFormatted(hoursWorkedMinutes) : null,
      break_duration_minutes: Math.round(breakMinutes),
      break_duration_formatted: minutesToFormatted(Math.round(breakMinutes)),
      allowed_break_minutes: allowedBreakMinutes,
      allowed_break_formatted: allowedBreakMinutes !== null ? minutesToFormatted(allowedBreakMinutes) : null,
      break_overage_minutes: breakOverageMinutes,
      is_overbreak: breakOverageMinutes !== null && breakOverageMinutes > 0,
      is_early_out: isEarlyOut,
      no_logout: loginTime !== null && logoutTime === null,
      leave_type: leaveType,
      ot_login_time: otLoginEvent?.created_at || null,
      ot_logout_time: otLogoutEvent?.created_at || null,
      ot_schedule: schedule?.effective_ot_schedule || null,
      ot_status: otLoginEvent ? (otLogoutEvent ? "completed" : "in_progress") : null,
      ot_hours_worked_minutes: otHoursWorkedMinutes,
      ot_ticket_count: otTicketCount,
      quota_ot_email: schedule?.effective_quota_ot_email ?? null,
    });
  }

  return snapshots;
}

// ── Per-Agent: Event Snapshots ───────────────────────────────────────

async function computeEventSnapshots(
  supabase: any,
  agent: any,
  weekStartStr: string,
  previousWeekMonday: Date,
  previousWeekSunday: Date
) {
  const dayStartUTC = new Date(previousWeekMonday.getTime() + 5 * 60 * 60 * 1000);
  const dayEndUTC = new Date(previousWeekSunday.getTime() + 29 * 60 * 60 * 1000); // +24h +5h

  const { data: events } = await supabase
    .from("profile_events")
    .select("event_type")
    .eq("profile_id", agent.id)
    .gte("created_at", dayStartUTC.toISOString())
    .lt("created_at", dayEndUTC.toISOString());

  const counts: Record<string, number> = {};
  for (const e of events || []) {
    counts[e.event_type] = (counts[e.event_type] || 0) + 1;
  }

  return Object.entries(counts).map(([eventType, count]) => ({
    profile_id: agent.id,
    week_start: weekStartStr,
    event_type: eventType,
    count,
  }));
}

// ── Per-Agent: Incident Snapshots ────────────────────────────────────

async function computeIncidentSnapshot(
  supabase: any,
  agent: any,
  weekStartStr: string,
  weekEndStr: string
) {
  const { data: reports } = await supabase
    .from("agent_reports")
    .select("id, incident_type, incident_date, severity, status, details, notes")
    .eq("agent_email", agent.email)
    .gte("incident_date", weekStartStr)
    .lte("incident_date", weekEndStr);

  const incidents = reports || [];
  if (incidents.length === 0) return null;

  const byType: Record<string, number> = {};
  for (const r of incidents) {
    byType[r.incident_type] = (byType[r.incident_type] || 0) + 1;
  }

  return {
    agent_id: agent.id,
    agent_email: agent.email,
    week_start: weekStartStr,
    incident_count: incidents.length,
    by_type: byType,
    incidents_json: incidents,
    computed_at: new Date().toISOString(),
    is_final: true,
  };
}

// ── Main Handler ─────────────────────────────────────────────────────

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
      const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

      const { weekStartStr, weekEndStr, previousWeekMonday, previousWeekSunday } = getWeekBoundaries();
      console.log(`Computing snapshots for week: ${weekStartStr} to ${weekEndStr}`);

      // Check if already finalized
      const { data: existingState } = await supabase
        .from("weekly_snapshot_state")
        .select("*")
        .eq("week_start", weekStartStr)
        .eq("status", "finalized")
        .single();

      if (existingState) {
        console.log("Snapshot already finalized for this week, skipping");
        return new Response(
          JSON.stringify({ success: true, message: "Snapshot already finalized" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Mark as running
      await supabase.from("weekly_snapshot_state").upsert(
        { week_start: weekStartStr, status: "running", last_computed_at: new Date().toISOString() },
        { onConflict: "week_start" }
      );

      // Get all active agents
      const { data: agents } = await supabase
        .from("agent_profiles")
        .select("id, email, full_name, agent_name, position, quota_email, quota_chat, quota_phone, quota_ot_email")
        .neq("employment_status", "Terminated");

      if (!agents || agents.length === 0) throw new Error("No agents found");

      const scorecardSnapshots: any[] = [];
      const ticketSummaries: any[] = [];
      const agentMetrics: any[] = [];
      const attendanceSnapshots: any[] = [];
      const eventSnapshots: any[] = [];
      const incidentSnapshots: any[] = [];
      const errors: string[] = [];

      for (const agent of agents) {
        try {
          // Run all per-agent computations in parallel
          const [scorecardResult, attendance, events, incident] = await Promise.all([
            computeScorecardSnapshot(supabase, agent, weekStartStr, weekEndStr, previousWeekMonday, previousWeekSunday),
            computeAttendanceSnapshots(supabase, agent, weekStartStr),
            computeEventSnapshots(supabase, agent, weekStartStr, previousWeekMonday, previousWeekSunday),
            computeIncidentSnapshot(supabase, agent, weekStartStr, weekEndStr),
          ]);

          scorecardSnapshots.push(scorecardResult.scorecardSnapshot);
          ticketSummaries.push(scorecardResult.ticketSummary);
          agentMetrics.push(scorecardResult.agentMetric);
          attendanceSnapshots.push(...attendance);
          eventSnapshots.push(...events);
          if (incident) incidentSnapshots.push(incident);
        } catch (err) {
          const msg = `Agent ${agent.email}: ${err instanceof Error ? err.message : String(err)}`;
          console.error(msg);
          errors.push(msg);
        }
      }

      // Upsert all data in parallel
      const upsertOps = [];

      if (scorecardSnapshots.length > 0) {
        upsertOps.push(
          supabase.from("weekly_scorecard_snapshots").upsert(scorecardSnapshots, { onConflict: "agent_email,week_start" })
        );
      }
      if (agentMetrics.length > 0) {
        upsertOps.push(
          supabase.from("weekly_agent_metrics").upsert(agentMetrics, { onConflict: "agent_email,week_start" })
        );
      }
      if (ticketSummaries.length > 0) {
        upsertOps.push(
          supabase.from("weekly_ticket_summary").upsert(ticketSummaries, { onConflict: "agent_email,week_start" })
        );
      }
      if (attendanceSnapshots.length > 0) {
        upsertOps.push(
          supabase.from("attendance_snapshots").upsert(attendanceSnapshots, { onConflict: "profile_id,date" })
        );
      }
      if (eventSnapshots.length > 0) {
        upsertOps.push(
          supabase.from("event_snapshots").upsert(eventSnapshots, { onConflict: "profile_id,week_start,event_type" })
        );
      }
      if (incidentSnapshots.length > 0) {
        upsertOps.push(
          supabase.from("weekly_incident_snapshots").upsert(incidentSnapshots, { onConflict: "agent_id,week_start" })
        );
      }

      const upsertResults = await Promise.all(upsertOps);
      for (const res of upsertResults) {
        if (res.error) {
          console.error("Upsert error:", res.error);
          errors.push(`Upsert: ${res.error.message}`);
        }
      }

      // Mark as finalized
      await supabase.from("weekly_snapshot_state").upsert(
        {
          week_start: weekStartStr,
          status: errors.length > 0 ? "partial" : "finalized",
          finalized_at: new Date().toISOString(),
          last_computed_at: new Date().toISOString(),
          error_message: errors.length > 0 ? errors.join("; ") : null,
        },
        { onConflict: "week_start" }
      );

      console.log(`Snapshot computation completed. Agents: ${agents.length}, Errors: ${errors.length}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: errors.length > 0 ? "Snapshots computed with some errors" : "Snapshots computed and stored",
          week: `${weekStartStr} to ${weekEndStr}`,
          agents_processed: agents.length,
          records: {
            scorecard: scorecardSnapshots.length,
            attendance: attendanceSnapshots.length,
            events: eventSnapshots.length,
            incidents: incidentSnapshots.length,
            tickets: ticketSummaries.length,
          },
          errors: errors.length > 0 ? errors : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } catch (error) {
      console.error("Error computing snapshots:", error);
      return new Response(
        JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
  });
}
