import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const slackBotToken = Deno.env.get("SLACK_BOT_TOKEN");

    let weekStart: Date;
    let weekEnd: Date;
    let silent = false;
    
    try { 
      const body = await req.json();
      silent = body.silent === true;
      if (body.weekStart && body.weekEnd) {
        weekStart = new Date(body.weekStart);
        weekEnd = new Date(body.weekEnd);
      } else {
        // Default to previous week (Mon-Sun)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() - daysToLastMonday - 1); // Last Sunday
        weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 6); // Previous Monday
      }
    } catch { 
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - daysToLastMonday - 1);
      weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
    }

    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    console.log(`Weekly analytics for ${weekStartStr} to ${weekEndStr}`);

    // Fetch all profiles
    const { data: profiles } = await supabase.from("agent_profiles").select("id, email, full_name, position, quota_email, quota_chat, quota_phone");
    if (!profiles?.length) return new Response(JSON.stringify({ success: true, message: "No profiles" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Fetch directories for schedule info
    const { data: dirs } = await supabase.from("agent_directory").select("email, mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule, day_off");
    const dirMap = new Map<string, any>(); dirs?.forEach(d => dirMap.set(d.email.toLowerCase(), d));

    // Fetch events for the week
    const startOfWeek = `${weekStartStr}T00:00:00.000Z`;
    const endOfWeek = `${weekEndStr}T23:59:59.999Z`;
    
    const { data: events } = await supabase.from("profile_events").select("profile_id, event_type, created_at").gte("created_at", startOfWeek).lte("created_at", endOfWeek);
    const { data: tickets } = await supabase.from("ticket_logs").select("agent_email, ticket_type").gte("timestamp", startOfWeek).lte("timestamp", endOfWeek);
    const { data: gaps } = await supabase.from("ticket_gap_daily").select("agent_email, avg_gap_seconds, date").gte("date", weekStartStr).lte("date", weekEndStr);
    const { data: incidents } = await supabase.from("agent_reports").select("agent_email, incident_type").gte("incident_date", weekStartStr).lte("incident_date", weekEndStr);

    // Helper functions
    const parseTime = (t: string): number | null => {
      const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!m) return null;
      let h = parseInt(m[1], 10); const mins = parseInt(m[2], 10); const p = m[3].toUpperCase();
      if (p === "PM" && h !== 12) h += 12; else if (p === "AM" && h === 12) h = 0;
      return h * 60 + mins;
    };
    const parseSched = (s: string) => { const p = s.split("-"); if (p.length !== 2) return null; const st = parseTime(p[0]), en = parseTime(p[1]); return st !== null && en !== null ? { st, en } : null; };
    const dayKeys = ["sun_schedule", "mon_schedule", "tue_schedule", "wed_schedule", "thu_schedule", "fri_schedule", "sat_schedule"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const getQuota = (p: any) => { const pos = (p.position || "").toLowerCase(); const qe = p.quota_email || 0, qc = p.quota_chat || 0, qp = p.quota_phone || 0; return pos.includes("hybrid") ? qe + qc + qp : pos.includes("chat") ? qe + qc : pos.includes("phone") ? qe + qp : qe; };

    // Aggregate tickets
    let totalEmail = 0, totalChat = 0, totalCall = 0;
    const tixByAgent = new Map<string, number>();
    tickets?.forEach(t => {
      const em = t.agent_email?.toLowerCase();
      if (!em) return;
      tixByAgent.set(em, (tixByAgent.get(em) || 0) + 1);
      const tt = t.ticket_type?.toLowerCase();
      if (tt === "email") totalEmail++; else if (tt === "chat") totalChat++; else if (tt === "call") totalCall++;
    });

    // Aggregate gaps
    const gapValues: number[] = [];
    gaps?.forEach(g => { if (g.avg_gap_seconds !== null) gapValues.push(g.avg_gap_seconds); });
    const avgGap = gapValues.length > 0 ? gapValues.reduce((a, b) => a + b, 0) / gapValues.length / 60 : null;

    // Aggregate incidents
    const incByAgent = new Set<string>();
    const incBreakdown: Record<string, number> = {};
    incidents?.forEach(i => { incByAgent.add(i.agent_email.toLowerCase()); incBreakdown[i.incident_type] = (incBreakdown[i.incident_type] || 0) + 1; });

    // Calculate weekly metrics per agent
    let totalScheduledDays = 0, totalActiveDays = 0, totalOnTimeDays = 0, totalFullShiftDays = 0;
    let quotaAgents = 0, quotaMet = 0;
    let totalLoggedHrs = 0, totalRequiredHrs = 0;

    // Iterate through each day of the week
    const currentDate = new Date(weekStart);
    while (currentDate <= weekEnd) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dow = currentDate.getDay();
      const dayName = dayNames[dow];
      const schedKey = dayKeys[dow];

      for (const p of profiles) {
        const dir = dirMap.get(p.email.toLowerCase());
        const isDayOff = (dir?.day_off || []).some((x: string) => x.toLowerCase() === dayName.toLowerCase());
        if (isDayOff) continue;

        const sched = dir?.[schedKey];
        if (!sched) continue;
        const parsed = parseSched(sched);
        if (!parsed) continue;
        totalScheduledDays++;

        let reqMins = parsed.en - parsed.st; if (reqMins < 0) reqMins += 1440;
        totalRequiredHrs += reqMins / 60;

        const pEvents = (events || []).filter((e: any) => e.profile_id === p.id && e.created_at.startsWith(dateStr));
        const logins = pEvents.filter((e: any) => e.event_type === "LOGIN");
        const logouts = pEvents.filter((e: any) => e.event_type === "LOGOUT");

        if (logins.length > 0) {
          totalActiveDays++;
          const fl = new Date(logins[0].created_at);
          const loginMins = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false }).format(fl)) * 60 + parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", minute: "2-digit" }).format(fl));
          if (loginMins <= parsed.st + 10) totalOnTimeDays++;

          if (logouts.length > 0) {
            const ll = new Date(logouts[logouts.length - 1].created_at);
            const logoutMins = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false }).format(ll)) * 60 + parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", minute: "2-digit" }).format(ll));
            if (logoutMins >= parsed.en) totalFullShiftDays++;
            totalLoggedHrs += (ll.getTime() - fl.getTime()) / 3600000;
          }
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate quota metrics for the week
    for (const p of profiles) {
      const q = getQuota(p);
      if (q > 0) {
        quotaAgents++;
        const weeklyQuota = q * 5; // Assuming 5-day work week
        if ((tixByAgent.get(p.email.toLowerCase()) || 0) >= weeklyQuota * 0.8) quotaMet++; // 80% of weekly quota
      }
    }

    const analytics = {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      attendance: {
        scheduledDays: totalScheduledDays,
        activeDays: totalActiveDays,
        onTimeDays: totalOnTimeDays,
        fullShiftDays: totalFullShiftDays,
        onTimeRate: totalScheduledDays > 0 ? (totalOnTimeDays / totalScheduledDays) * 100 : 0,
        fullShiftRate: totalScheduledDays > 0 ? (totalFullShiftDays / totalScheduledDays) * 100 : 0,
        attendanceRate: totalScheduledDays > 0 ? (totalActiveDays / totalScheduledDays) * 100 : 0,
      },
      productivity: {
        total: totalEmail + totalChat + totalCall,
        email: totalEmail,
        chat: totalChat,
        call: totalCall,
        quotaAgents,
        quotaMet,
        quotaRate: quotaAgents > 0 ? (quotaMet / quotaAgents) * 100 : 0,
        avgGap,
      },
      time: {
        totalLogged: totalLoggedHrs,
        totalRequired: totalRequiredHrs,
        avgLoggedPerDay: totalActiveDays > 0 ? totalLoggedHrs / totalActiveDays : null,
        avgRequiredPerDay: totalScheduledDays > 0 ? totalRequiredHrs / totalScheduledDays : null,
      },
      compliance: {
        totalIncidents: incidents?.length || 0,
        agentsWithIncidents: incByAgent.size,
        cleanAgents: profiles.length - incByAgent.size,
        cleanRate: profiles.length > 0 ? ((profiles.length - incByAgent.size) / profiles.length) * 100 : 0,
        breakdown: incBreakdown,
      },
    };

    // Determine status
    let status: "good" | "warning" | "critical" = "good";
    const details: string[] = [];
    
    if (analytics.attendance.onTimeRate < 80) { status = "critical"; details.push(`On-Time Rate: ${analytics.attendance.onTimeRate.toFixed(0)}%`); }
    else if (analytics.attendance.onTimeRate < 90) { status = "warning"; details.push(`On-Time Rate: ${analytics.attendance.onTimeRate.toFixed(0)}%`); }
    
    if (analytics.productivity.quotaRate < 55) { status = "critical"; details.push(`Quota Achievement: ${analytics.productivity.quotaRate.toFixed(0)}%`); }
    else if (analytics.productivity.quotaRate < 70) { if (status === "good") status = "warning"; details.push(`Quota Achievement: ${analytics.productivity.quotaRate.toFixed(0)}%`); }
    
    if (analytics.compliance.cleanRate < 60) { status = "critical"; details.push(`Clean Rate: ${analytics.compliance.cleanRate.toFixed(0)}%`); }
    else if (analytics.compliance.cleanRate < 75) { if (status === "good") status = "warning"; details.push(`Clean Rate: ${analytics.compliance.cleanRate.toFixed(0)}%`); }
    
    if (details.length === 0) details.push("All weekly metrics within acceptable thresholds");

    const result = { ...analytics, status, details };
    console.log("Weekly Analytics:", JSON.stringify(result));

    // Notifications - only when NOT in silent mode
    if (!silent) {
      const { data: admins } = await supabase.from("user_roles").select("email").in("role", ["admin", "hr", "super_admin"]);
      const adminEmails = [...new Set(admins?.map(x => x.email.toLowerCase()) || [])];
      const title = `📊 Weekly Team Analytics: ${weekStartStr} to ${weekEndStr}`;
      const statusEmoji = status === "good" ? "✅" : status === "warning" ? "⚠️" : "🚨";
      const msg = `${statusEmoji} ${status.toUpperCase()}: ${analytics.productivity.total} tickets, ${analytics.attendance.attendanceRate.toFixed(0)}% attendance, ${analytics.compliance.cleanRate.toFixed(0)}% clean`;

      const notifs = adminEmails.map(email => ({ user_email: email, title, message: msg, type: "weekly_analytics", reference_type: "agent_reports", reference_id: null }));
      if (notifs.length > 0) await supabase.from("notifications").insert(notifs);

      // Email
      if (resendApiKey && adminEmails.length > 0) {
        const fmtH = (h: number) => { const hrs = Math.floor(h), mins = Math.round((h - hrs) * 60); return hrs === 0 ? `${mins}m` : mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`; };
        const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8fafc;">
          <div style="background:#fff;border-radius:12px;padding:24px;">
            <h1 style="text-align:center;font-size:24px;">📊 Weekly Team Analytics</h1>
            <p style="text-align:center;color:#64748b;">${weekStartStr} to ${weekEndStr}</p>
            <div style="background:${status === "good" ? "#10b981" : status === "warning" ? "#f59e0b" : "#ef4444"}15;border-left:4px solid ${status === "good" ? "#10b981" : status === "warning" ? "#f59e0b" : "#ef4444"};padding:16px;border-radius:8px;margin-bottom:24px;">
              <strong>${statusEmoji} ${status.toUpperCase()}</strong>
              ${details.map(d => `<div style="font-size:13px;margin-top:4px;">${d}</div>`).join("")}
            </div>
            <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:16px;">
              <strong>👥 Attendance</strong><br>
              Active: ${analytics.attendance.activeDays}/${analytics.attendance.scheduledDays} days (${analytics.attendance.attendanceRate.toFixed(0)}%)<br>
              On-Time: ${analytics.attendance.onTimeRate.toFixed(0)}% | Full Shift: ${analytics.attendance.fullShiftRate.toFixed(0)}%
            </div>
            <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:16px;">
              <strong>📈 Productivity</strong><br>
              Total Tickets: ${analytics.productivity.total} (Email: ${analytics.productivity.email}, Chat: ${analytics.productivity.chat}, Call: ${analytics.productivity.call})<br>
              Quota Met: ${analytics.productivity.quotaRate.toFixed(0)}% | Avg Gap: ${analytics.productivity.avgGap?.toFixed(1) ?? "--"} min
            </div>
            <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:16px;">
              <strong>⏱️ Time</strong><br>
              Total Hours: ${fmtH(analytics.time.totalLogged)} logged / ${fmtH(analytics.time.totalRequired)} required<br>
              Avg Per Day: ${analytics.time.avgLoggedPerDay !== null ? fmtH(analytics.time.avgLoggedPerDay) : "--"}
            </div>
            <div style="background:#f1f5f9;padding:16px;border-radius:8px;">
              <strong>✅ Compliance</strong><br>
              Clean Agents: ${analytics.compliance.cleanAgents} (${analytics.compliance.cleanRate.toFixed(0)}%)<br>
              Total Incidents: ${analytics.compliance.totalIncidents}
            </div>
          </div>
        </body></html>`;
        try { await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` }, body: JSON.stringify({ from: "VFS Updates Hub <noreply@vfsoperations.online>", to: adminEmails, subject: `${title} - ${status.toUpperCase()}`, html }) }); console.log("Email sent"); } catch (e) { console.error("Email error:", e); }
      }

      // Slack
      if (slackBotToken) {
        const slackMsg = `📊 *Weekly Team Analytics*\n*${weekStartStr} to ${weekEndStr}*\n\n${statusEmoji} *${status.toUpperCase()}*\n\n👥 Attendance: ${analytics.attendance.attendanceRate.toFixed(0)}% | On-Time: ${analytics.attendance.onTimeRate.toFixed(0)}% | Full Shift: ${analytics.attendance.fullShiftRate.toFixed(0)}%\n📈 Productivity: ${analytics.productivity.total} tickets | Quota: ${analytics.productivity.quotaRate.toFixed(0)}%\n✅ Compliance: ${analytics.compliance.cleanRate.toFixed(0)}% clean | ${analytics.compliance.totalIncidents} incidents`;
        try { await fetch("https://slack.com/api/chat.postMessage", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${slackBotToken}` }, body: JSON.stringify({ channel: "#a_pb_mgt", text: slackMsg, mrkdwn: true }) }); console.log("Slack sent"); } catch (e) { console.error("Slack error:", e); }
      }
    }

    return new Response(JSON.stringify({ success: true, weekStart: weekStartStr, weekEnd: weekEndStr, analytics: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
