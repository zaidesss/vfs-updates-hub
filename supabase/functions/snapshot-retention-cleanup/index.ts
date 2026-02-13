import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 6-month cutoff
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 6);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    console.log(`Retention cleanup started. Cutoff: ${cutoffStr}`);

    // 1. Archive old scorecard snapshots to storage
    const { data: oldSnapshots, error: snapErr } = await supabase
      .from("weekly_scorecard_snapshots")
      .select("*")
      .lt("week_start", cutoffStr)
      .order("week_start", { ascending: true });

    if (snapErr) {
      console.error("Error fetching old snapshots:", snapErr);
      throw snapErr;
    }

    let archivedSnapshots = 0;
    let archivedMetrics = 0;
    let archivedTicketSummaries = 0;
    let archivedIncidents = 0;

    if (oldSnapshots && oldSnapshots.length > 0) {
      // Group by week for organized archives
      const weekGroups: Record<string, any[]> = {};
      for (const snap of oldSnapshots) {
        const week = snap.week_start;
        if (!weekGroups[week]) weekGroups[week] = [];
        weekGroups[week].push(snap);
      }

      for (const [weekStart, records] of Object.entries(weekGroups)) {
        const fileName = `snapshots/scorecard-${weekStart}.json`;
        await supabase.storage
          .from("ticket-archives")
          .upload(fileName, JSON.stringify(records, null, 2), {
            contentType: "application/json",
            upsert: true,
          });
      }

      // Delete archived scorecard snapshots
      const { error: delErr } = await supabase
        .from("weekly_scorecard_snapshots")
        .delete()
        .lt("week_start", cutoffStr);

      if (!delErr) archivedSnapshots = oldSnapshots.length;
    }

    // 2. Archive old agent metrics
    const { data: oldMetrics } = await supabase
      .from("weekly_agent_metrics")
      .select("*")
      .lt("week_start", cutoffStr);

    if (oldMetrics && oldMetrics.length > 0) {
      const weekGroups: Record<string, any[]> = {};
      for (const m of oldMetrics) {
        const week = m.week_start;
        if (!weekGroups[week]) weekGroups[week] = [];
        weekGroups[week].push(m);
      }

      for (const [weekStart, records] of Object.entries(weekGroups)) {
        const fileName = `snapshots/agent-metrics-${weekStart}.json`;
        await supabase.storage
          .from("ticket-archives")
          .upload(fileName, JSON.stringify(records, null, 2), {
            contentType: "application/json",
            upsert: true,
          });
      }

      const { error: delErr } = await supabase
        .from("weekly_agent_metrics")
        .delete()
        .lt("week_start", cutoffStr);

      if (!delErr) archivedMetrics = oldMetrics.length;
    }

    // 3. Archive old ticket summaries
    const { data: oldSummaries } = await supabase
      .from("weekly_ticket_summary")
      .select("*")
      .lt("week_start", cutoffStr);

    if (oldSummaries && oldSummaries.length > 0) {
      const weekGroups: Record<string, any[]> = {};
      for (const s of oldSummaries) {
        const week = s.week_start;
        if (!weekGroups[week]) weekGroups[week] = [];
        weekGroups[week].push(s);
      }

      for (const [weekStart, records] of Object.entries(weekGroups)) {
        const fileName = `snapshots/ticket-summary-${weekStart}.json`;
        await supabase.storage
          .from("ticket-archives")
          .upload(fileName, JSON.stringify(records, null, 2), {
            contentType: "application/json",
            upsert: true,
          });

        // Update archive_path before deleting
        for (const r of records) {
          await supabase
            .from("weekly_ticket_summary")
            .update({ archive_path: fileName })
            .eq("id", r.id);
        }
      }

      const { error: delErr } = await supabase
        .from("weekly_ticket_summary")
        .delete()
        .lt("week_start", cutoffStr);

      if (!delErr) archivedTicketSummaries = oldSummaries.length;
    }

    // 4. Archive old incident snapshots
    const { data: oldIncidents } = await supabase
      .from("weekly_incident_snapshots")
      .select("*")
      .lt("week_start", cutoffStr);

    if (oldIncidents && oldIncidents.length > 0) {
      const weekGroups: Record<string, any[]> = {};
      for (const i of oldIncidents) {
        const week = i.week_start;
        if (!weekGroups[week]) weekGroups[week] = [];
        weekGroups[week].push(i);
      }

      for (const [weekStart, records] of Object.entries(weekGroups)) {
        const fileName = `snapshots/incidents-${weekStart}.json`;
        await supabase.storage
          .from("ticket-archives")
          .upload(fileName, JSON.stringify(records, null, 2), {
            contentType: "application/json",
            upsert: true,
          });
      }

      const { error: delErr } = await supabase
        .from("weekly_incident_snapshots")
        .delete()
        .lt("week_start", cutoffStr);

      if (!delErr) archivedIncidents = oldIncidents.length;
    }

    // 5. Clean up old snapshot state records
    await supabase
      .from("weekly_snapshot_state")
      .delete()
      .lt("week_start", cutoffStr);

    const summary = {
      success: true,
      cutoff: cutoffStr,
      archived: {
        scorecard_snapshots: archivedSnapshots,
        agent_metrics: archivedMetrics,
        ticket_summaries: archivedTicketSummaries,
        incident_snapshots: archivedIncidents,
      },
    };

    console.log("Retention cleanup complete:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Retention cleanup error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
