import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
      const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

      // Get previous week boundaries (Mon-Sun, 7 days ago)
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0);

      // Convert to EST for week calculation
      const estNow = new Date(
        now.toLocaleString("en-US", { timeZone: "America/New_York" })
      );
      const dayOfWeek = estNow.getDay();
      const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : dayOfWeek - 1;

      const currentWeekMonday = new Date(estNow);
      currentWeekMonday.setDate(estNow.getDate() - daysToMonday);
      currentWeekMonday.setHours(0, 0, 0, 0);

      const previousWeekMonday = new Date(currentWeekMonday);
      previousWeekMonday.setDate(currentWeekMonday.getDate() - 7);

      const previousWeekSunday = new Date(previousWeekMonday);
      previousWeekSunday.setDate(previousWeekMonday.getDate() + 6);

      const weekStartStr = previousWeekMonday.toISOString().split("T")[0];
      const weekEndStr = previousWeekSunday.toISOString().split("T")[0];

      console.log(
        `Computing snapshots for week: ${weekStartStr} to ${weekEndStr}`
      );

      // Check if snapshot already finalized
      const { data: existingState } = await supabase
        .from("weekly_snapshot_state")
        .select("*")
        .eq("week_start", weekStartStr)
        .eq("is_final", true)
        .single();

      if (existingState) {
        console.log("Snapshot already finalized for this week, skipping");
        return new Response(
          JSON.stringify({
            success: true,
            message: "Snapshot already finalized",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // Mark as running
      await supabase.from("weekly_snapshot_state").upsert({
        week_start: weekStartStr,
        status: "running",
        is_final: false,
      });

      // Get all active agents
      const { data: agents } = await supabase
        .from("agent_profiles")
        .select("id, email, full_name, position, quota_email, quota_chat, quota_phone, quota_ot_email")
        .neq("employment_status", "Terminated");

      if (!agents || agents.length === 0) {
        throw new Error("No agents found");
      }

      // Compute snapshots for each agent
      const scorecardSnapshots: any[] = [];
      const agentMetrics: any[] = [];
      const dailyTicketBreakdowns: Record<
        string,
        { date: string; email: number; chat: number; call: number; ot_email: number }[]
      > = {};

      for (const agent of agents) {
        // Get effective schedules for the week
        const { data: schedules } = await supabase.rpc(
          "get_effective_schedules_for_week",
          {
            p_agent_id: agent.id,
            p_week_start: weekStartStr,
          }
        );

        // Get ticket counts for the week
        const { data: ticketCounts } = await supabase
          .from("ticket_logs")
          .select("ticket_type, timestamp, is_ot")
          .eq("agent_email", agent.email)
          .gte(
            "timestamp",
            new Date(
              previousWeekMonday.getTime() - 5 * 60 * 60 * 1000
            ).toISOString()
          )
          .lt(
            "timestamp",
            new Date(
              previousWeekSunday.getTime() + 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000
            ).toISOString()
          );

        // Get QA scores
        const { data: qaScores } = await supabase
          .from("qa_evaluations")
          .select("percentage")
          .eq("agent_email", agent.email)
          .gte("work_week_start", weekStartStr)
          .lte("work_week_start", weekEndStr);

        // Get leave data
        const { data: leaveData } = await supabase
          .from("leave_requests")
          .select("outage_reason, start_date, end_date, status")
          .eq("agent_email", agent.email)
          .eq("status", "approved")
          .lte("start_date", weekEndStr)
          .gte("end_date", weekStartStr);

        // Get zendesk metrics
        const { data: zendeskMetrics } = await supabase
          .from("zendesk_agent_metrics")
          .select("*")
          .eq("agent_email", agent.email)
          .eq("week_start", weekStartStr)
          .eq("week_end", weekEndStr)
          .single();

        // Calculate aggregates
        let emailCount = 0,
          chatCount = 0,
          callCount = 0,
          otEmailCount = 0;
        const dailyBreakdown: Record<
          string,
          { email: number; chat: number; call: number; ot_email: number }
        > = {};

        if (ticketCounts) {
          for (const ticket of ticketCounts) {
            const ticketDate = new Date(ticket.timestamp)
              .toISOString()
              .split("T")[0];
            if (!dailyBreakdown[ticketDate]) {
              dailyBreakdown[ticketDate] = {
                email: 0,
                chat: 0,
                call: 0,
                ot_email: 0,
              };
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
        }

        // Calculate leave days
        let plannedLeaveDays = 0,
          unplannedOutageDays = 0;
        if (leaveData) {
          for (const leave of leaveData) {
            const startDate = new Date(leave.start_date);
            const endDate = new Date(leave.end_date);
            const weekStart = new Date(weekStartStr);
            const weekEnd = new Date(weekEndStr);
            weekEnd.setDate(weekEnd.getDate() + 1);

            let current = new Date(
              Math.max(startDate.getTime(), weekStart.getTime())
            );
            while (current < Math.min(endDate.getTime(), weekEnd.getTime())) {
              if (leave.outage_reason === "Planned Leave") {
                plannedLeaveDays++;
              } else {
                unplannedOutageDays++;
              }
              current.setDate(current.getDate() + 1);
            }
          }
        }

        const qaAverage =
          qaScores && qaScores.length > 0
            ? qaScores.reduce((sum, q) => sum + (q.percentage || 0), 0) /
              qaScores.length
            : null;

        scorecardSnapshots.push({
          agent_email: agent.email,
          week_start: weekStartStr,
          week_end: weekEndStr,
          agent_position: agent.position,
          email_count: emailCount,
          chat_count: chatCount,
          call_count: callCount,
          ot_email_count: otEmailCount,
          qa_average: qaAverage,
          call_aht_seconds: zendeskMetrics?.call_aht_seconds || null,
          chat_aht_seconds: zendeskMetrics?.chat_aht_seconds || null,
          chat_frt_seconds: zendeskMetrics?.chat_frt_seconds || null,
          order_escalation: zendeskMetrics?.order_escalation || null,
          planned_leave_days: plannedLeaveDays,
          unplanned_outage_days: unplannedOutageDays,
        });

        agentMetrics.push({
          agent_email: agent.email,
          week_start: weekStartStr,
          week_end: weekEndStr,
          attendance_json: {
            schedules: schedules || [],
            planned_leave_days: plannedLeaveDays,
            unplanned_outage_days: unplannedOutageDays,
          },
        });

        dailyTicketBreakdowns[agent.email] = Object.entries(dailyBreakdown).map(
          ([date, counts]) => ({
            date,
            ...counts,
          })
        );
      }

      // Upsert snapshots
      if (scorecardSnapshots.length > 0) {
        await supabase.from("weekly_scorecard_snapshots").upsert(
          scorecardSnapshots,
          { onConflict: "agent_email,week_start" }
        );
      }

      if (agentMetrics.length > 0) {
        await supabase.from("weekly_agent_metrics").upsert(agentMetrics, {
          onConflict: "agent_email,week_start",
        });
      }

      // Upsert ticket summary with daily breakdowns
      for (const [email, breakdown] of Object.entries(
        dailyTicketBreakdowns
      )) {
        await supabase.from("weekly_ticket_summary").upsert({
          agent_email: email,
          week_start: weekStartStr,
          week_end: weekEndStr,
          daily_breakdown: breakdown,
          archive_path: null, // Will be set by retention-cleanup
        });
      }

      // Mark as success and finalize
      await supabase.from("weekly_snapshot_state").upsert({
        week_start: weekStartStr,
        status: "success",
        is_final: true,
      });

      console.log("Snapshot computation completed successfully");

      return new Response(
        JSON.stringify({
          success: true,
          message: "Snapshots computed and stored",
          week: `${weekStartStr} to ${weekEndStr}`,
          agents_processed: agents.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (error) {
      console.error("Error computing snapshots:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  });
}
