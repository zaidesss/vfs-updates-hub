import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THRESHOLDS = { onTimeLogin: 90, shiftComplete: 85, quota: 70, violations: 75, gap: 5 };

// Positions to exclude from all team analytics
const EXCLUDED_POSITIONS = ['Team Lead', 'Technical'];
// Positions to exclude from ticket counts and quota only (included in attendance/compliance/time)
const TICKET_EXCLUDED_POSITIONS = ['Team Lead', 'Technical', 'Logistics'];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const slackBotToken = Deno.env.get("SLACK_BOT_TOKEN");

    let targetDate: Date;
    let silent = false;
    try { 
      const body = await req.json(); 
      targetDate = body.date ? new Date(body.date) : new Date();
      silent = body.silent === true;
    }
    catch { targetDate = new Date(); }

    const dateStr = targetDate.toISOString().split("T")[0];
    const dow = targetDate.getDay();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = dayNames[dow];

    console.log(`EOD analytics for ${dateStr} (${dayName})`);

    // Fetch profiles excluding Team Leads, Technical Support, and Logistics
    const { data: profiles } = await supabase
      .from("agent_profiles")
      .select("id, email, position, quota_email, quota_chat, quota_phone")
      .not('position', 'ov', '{"Team Lead","Technical"}');
    if (!profiles?.length) return new Response(JSON.stringify({ success: true, message: "No profiles" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Build set of emails for ticket-excluded positions (Logistics agents)
    const ticketExcludedEmails = new Set<string>();
    profiles.forEach(p => {
      const posArr: string[] = p.position || [];
      if (posArr.some(pos => TICKET_EXCLUDED_POSITIONS.includes(pos))) {
        ticketExcludedEmails.add(p.email.toLowerCase());
      }
    });

    const { data: dirs } = await supabase.from("agent_directory").select("email, mon_schedule, tue_schedule, wed_schedule, thu_schedule, fri_schedule, sat_schedule, sun_schedule, day_off");
    const dirMap = new Map<string, any>(); dirs?.forEach(d => dirMap.set(d.email.toLowerCase(), d));

    // EST boundaries: midnight EST = 5:00 AM UTC
    const startOfDayEST = `${dateStr}T05:00:00.000Z`;
    const nextDateForEnd = new Date(dateStr);
    nextDateForEnd.setDate(nextDateForEnd.getDate() + 1);
    const endOfDayEST = `${nextDateForEnd.toISOString().split("T")[0]}T04:59:59.999Z`;

    const { data: events } = await supabase.from("profile_events").select("profile_id, event_type, created_at").gte("created_at", startOfDayEST).lte("created_at", endOfDayEST);
    const { data: tickets } = await supabase.from("ticket_logs").select("agent_email, ticket_type").gte("timestamp", startOfDayEST).lte("timestamp", endOfDayEST);
    const { data: gaps } = await supabase.from("ticket_gap_daily").select("agent_email, avg_gap_seconds").eq("date", dateStr);
    const { data: incidents } = await supabase.from("agent_reports").select("agent_email, incident_type").eq("incident_date", dateStr);

    // Fetch approved Planned Leave for this date
    const { data: leaves } = await supabase
      .from("leave_requests")
      .select("agent_email")
      .eq("status", "approved")
      .eq("outage_reason", "Planned Leave")
      .lte("start_date", dateStr)
      .gte("end_date", dateStr);
    const plannedLeaveEmails = new Set<string>();
    leaves?.forEach(l => plannedLeaveEmails.add(l.agent_email.toLowerCase()));

    // Aggregate tickets (exclude Logistics/Team Lead/Technical Support)
    let totalEmail = 0, totalChat = 0, totalCall = 0;
    const tixByAgent = new Map<string, number>();
    tickets?.forEach(t => {
      const em = t.agent_email?.toLowerCase();
      if (!em || ticketExcludedEmails.has(em)) return;
      tixByAgent.set(em, (tixByAgent.get(em) || 0) + 1);
      const tt = t.ticket_type?.toLowerCase();
      if (tt === "email") totalEmail++; else if (tt === "chat") totalChat++; else if (tt === "call") totalCall++;
    });

    // Aggregate gaps
    const gapMap = new Map<string, number>();
    gaps?.forEach(g => { if (g.agent_email && g.avg_gap_seconds !== null) gapMap.set(g.agent_email.toLowerCase(), g.avg_gap_seconds); });

    // Aggregate incidents
    const incByAgent = new Set<string>();
    const incBreakdown: Record<string, number> = {};
    incidents?.forEach(i => { incByAgent.add(i.agent_email.toLowerCase()); incBreakdown[i.incident_type] = (incBreakdown[i.incident_type] || 0) + 1; });

    // Helper functions
    const parseTime = (t: string): number | null => {
      const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!m) return null;
      let h = parseInt(m[1], 10); const mins = parseInt(m[2], 10); const p = m[3].toUpperCase();
      if (p === "PM" && h !== 12) h += 12; else if (p === "AM" && h === 12) h = 0;
      return h * 60 + mins;
    };
    const parseSched = (s: string) => { const p = s.split("-"); if (p.length !== 2) return null; const st = parseTime(p[0]), en = parseTime(p[1]); return st !== null && en !== null ? { st, en } : null; };
    const getSched = (d: any) => { const k = ["sun_schedule", "mon_schedule", "tue_schedule", "wed_schedule", "thu_schedule", "fri_schedule", "sat_schedule"][dow]; return d?.[k] || null; };
    const isDayOff = (d: any) => (d?.day_off || []).some((x: string) => x.toLowerCase() === dayName.toLowerCase());
    const getQuota = (p: any) => { const posArr: string[] = p.position || []; const qe = p.quota_email || 0, qc = p.quota_chat || 0, qp = p.quota_phone || 0; const hasEmail = posArr.includes('Email'), hasChat = posArr.includes('Chat'), hasPhone = posArr.includes('Phone'); if (hasEmail && hasChat && hasPhone) return qe + qc + qp; if (hasEmail && hasChat) return qe + qc; if (hasEmail && hasPhone) return qe + qp; return qe; };

    let scheduled = 0, active = 0, onTime = 0, fullShift = 0, quotaAgents = 0, quotaMet = 0, loggedHrs = 0, reqHrs = 0, hrsAgents = 0;
    let totalQuotaEmail = 0, totalQuotaChat = 0, totalQuotaCall = 0;
    let actualQuotaEmail = 0, actualQuotaChat = 0, actualQuotaCall = 0;
    let onLeave = 0;

    // Track per-agent ticket breakdown for quota
    const tixByAgentByType = new Map<string, { email: number; chat: number; call: number }>();
    tickets?.forEach(t => {
      const em = t.agent_email?.toLowerCase();
      if (!em || ticketExcludedEmails.has(em)) return;
      if (!tixByAgentByType.has(em)) tixByAgentByType.set(em, { email: 0, chat: 0, call: 0 });
      const entry = tixByAgentByType.get(em)!;
      const tt = t.ticket_type?.toLowerCase();
      if (tt === "email") entry.email++; else if (tt === "chat") entry.chat++; else if (tt === "call") entry.call++;
    });

    for (const p of profiles) {
      const dir = dirMap.get(p.email.toLowerCase());
      if (isDayOff(dir)) continue;
      const sched = getSched(dir);
      if (!sched) continue;
      const parsed = parseSched(sched);
      if (!parsed) continue;

      // Skip agents on Planned Leave from scheduled count
      if (plannedLeaveEmails.has(p.email.toLowerCase())) { onLeave++; continue; }

      scheduled++;
      let reqMins = parsed.en - parsed.st; if (reqMins < 0) reqMins += 1440;
      reqHrs += reqMins / 60;

      const pEvents = (events || []).filter((e: any) => e.profile_id === p.id);
      const logins = pEvents.filter((e: any) => e.event_type === "LOGIN");
      const logouts = pEvents.filter((e: any) => e.event_type === "LOGOUT");

      if (logins.length > 0) {
        active++;
        const fl = new Date(logins[0].created_at);
        const loginMins = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false }).format(fl)) * 60 + parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", minute: "2-digit" }).format(fl));
        if (loginMins <= parsed.st + 10) onTime++;
        if (logouts.length > 0) {
          const ll = new Date(logouts[logouts.length - 1].created_at);
          const logoutMins = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false }).format(ll)) * 60 + parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", minute: "2-digit" }).format(ll));
          if (logoutMins >= parsed.en) fullShift++;
          loggedHrs += (ll.getTime() - fl.getTime()) / 3600000; hrsAgents++;
        }
      }

      // Skip ticket-excluded positions (Logistics) for quota calculation
      if (ticketExcludedEmails.has(p.email.toLowerCase())) continue;
      const posArr: string[] = p.position || [];
      const qe = p.quota_email || 0, qc = p.quota_chat || 0, qp = p.quota_phone || 0;
      const hasEmail = posArr.includes('Email'), hasChat = posArr.includes('Chat'), hasPhone = posArr.includes('Phone');
      
      // Determine which quotas apply based on position array
      let agentQuotaEmail = 0, agentQuotaChat = 0, agentQuotaCall = 0;
      if (hasEmail && hasChat && hasPhone) { agentQuotaEmail = qe; agentQuotaChat = qc; agentQuotaCall = qp; }
      else if (hasEmail && hasChat) { agentQuotaEmail = qe; agentQuotaChat = qc; }
      else if (hasEmail && hasPhone) { agentQuotaEmail = qe; agentQuotaCall = qp; }
      else { agentQuotaEmail = qe; }

      const totalAgentQuota = agentQuotaEmail + agentQuotaChat + agentQuotaCall;
      if (totalAgentQuota > 0) {
        quotaAgents++;
        totalQuotaEmail += agentQuotaEmail;
        totalQuotaChat += agentQuotaChat;
        totalQuotaCall += agentQuotaCall;
        
        const agentTix = tixByAgentByType.get(p.email.toLowerCase());
        if (agentTix) {
          actualQuotaEmail += Math.min(agentTix.email, agentQuotaEmail);
          actualQuotaChat += Math.min(agentTix.chat, agentQuotaChat);
          actualQuotaCall += Math.min(agentTix.call, agentQuotaCall);
        }
        
        if ((tixByAgent.get(p.email.toLowerCase()) || 0) >= totalAgentQuota) quotaMet++;
      }
    }

    const avgGap = gapMap.size > 0 ? Array.from(gapMap.values()).reduce((a, b) => a + b, 0) / gapMap.size / 60 : null;
    const zeroViolations = scheduled - incByAgent.size;

    const a = {
      date: dateStr,
      attendance: { active, scheduled, onTime, onTimeRate: scheduled > 0 ? (onTime / scheduled) * 100 : 0, fullShift, fullShiftRate: scheduled > 0 ? (fullShift / scheduled) * 100 : 0, onLeave },
      productivity: { total: totalEmail + totalChat + totalCall, email: totalEmail, chat: totalChat, call: totalCall, quotaAgents, quotaMet, quotaRate: quotaAgents > 0 ? (quotaMet / quotaAgents) * 100 : 0, avgGap, totalQuotaEmail, totalQuotaChat, totalQuotaCall, actualQuotaEmail, actualQuotaChat, actualQuotaCall },
      time: { avgLogged: hrsAgents > 0 ? loggedHrs / hrsAgents : null, avgRequired: scheduled > 0 ? reqHrs / scheduled : null },
      compliance: { clean: zeroViolations, cleanRate: scheduled > 0 ? (zeroViolations / scheduled) * 100 : 0, incidents: incidents?.length || 0, breakdown: incBreakdown },
    };

    // Determine status
    let warn = 0, crit = 0; const details: string[] = [];
    if (a.attendance.onTimeRate < THRESHOLDS.onTimeLogin - 10) { crit++; details.push(`On-Time Login critically low: ${a.attendance.onTimeRate.toFixed(0)}%`); }
    else if (a.attendance.onTimeRate < THRESHOLDS.onTimeLogin) { warn++; details.push(`On-Time Login below target: ${a.attendance.onTimeRate.toFixed(0)}%`); }
    if (a.attendance.fullShiftRate < THRESHOLDS.shiftComplete - 10) { crit++; details.push(`Shift Completion critically low: ${a.attendance.fullShiftRate.toFixed(0)}%`); }
    else if (a.attendance.fullShiftRate < THRESHOLDS.shiftComplete) { warn++; details.push(`Shift Completion below target: ${a.attendance.fullShiftRate.toFixed(0)}%`); }
    if (a.productivity.quotaRate < THRESHOLDS.quota - 15) { crit++; details.push(`Quota Achievement critically low: ${a.productivity.quotaRate.toFixed(0)}%`); }
    else if (a.productivity.quotaRate < THRESHOLDS.quota) { warn++; details.push(`Quota Achievement below target: ${a.productivity.quotaRate.toFixed(0)}%`); }
    if (a.compliance.cleanRate < THRESHOLDS.violations - 15) { crit++; details.push(`Zero Violations Rate critically low: ${a.compliance.cleanRate.toFixed(0)}%`); }
    else if (a.compliance.cleanRate < THRESHOLDS.violations) { warn++; details.push(`Zero Violations Rate below target: ${a.compliance.cleanRate.toFixed(0)}%`); }
    if (a.productivity.avgGap !== null && a.productivity.avgGap > THRESHOLDS.gap * 2) { crit++; details.push(`Avg Ticket Gap critically high: ${a.productivity.avgGap.toFixed(1)} min`); }
    else if (a.productivity.avgGap !== null && a.productivity.avgGap > THRESHOLDS.gap) { warn++; details.push(`Avg Ticket Gap above target: ${a.productivity.avgGap.toFixed(1)} min`); }

    const status = crit >= 2 ? "critical" : crit >= 1 || warn >= 3 ? "warning" : warn >= 1 ? "warning" : "good";
    if (status === "good") details.push("All metrics within acceptable thresholds");

    const analytics = { ...a, status, details };
    console.log("EOD Analytics:", JSON.stringify(analytics));

    // Notifications - only send when NOT in silent mode (scheduled runs only)
    if (!silent) {
      // Fetch admin/HR/super_admin roles for notifications
      const { data: admins } = await supabase
        .from("user_roles")
        .select("email")
        .in("role", ["admin", "hr", "super_admin"]);

      const adminEmails = [...new Set(admins?.map(x => x.email.toLowerCase()) || [])];
      const title = `📊 EOD Team Analytics: ${dateStr}`;
      const statusEmoji = status === "good" ? "✅" : status === "warning" ? "⚠️" : "🚨";
      const msg = `${statusEmoji} ${status.toUpperCase()}: ${a.attendance.active} active, ${a.productivity.total} tickets, ${a.compliance.cleanRate.toFixed(0)}% clean`;

      // In-app notifications for admins only
      const notifs = adminEmails.map(email => ({ user_email: email, title, message: msg, type: "eod_analytics", reference_type: "agent_reports", reference_id: null }));
      if (notifs.length > 0) await supabase.from("notifications").insert(notifs);

      // Email to admin/HR/super_admin only
      if (adminEmails.length > 0) {
        const fmtH = (h: number) => { const hrs = Math.floor(h), mins = Math.round((h - hrs) * 60); return hrs === 0 ? `${mins}m` : mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`; };
        const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8fafc;"><div style="background:#fff;border-radius:12px;padding:24px;"><h1 style="text-align:center;font-size:24px;">📊 EOD Team Analytics</h1><p style="text-align:center;color:#64748b;">${dateStr}</p><div style="background:${status === "good" ? "#10b981" : status === "warning" ? "#f59e0b" : "#ef4444"}15;border-left:4px solid ${status === "good" ? "#10b981" : status === "warning" ? "#f59e0b" : "#ef4444"};padding:16px;border-radius:8px;margin-bottom:24px;"><strong>${statusEmoji} ${status.toUpperCase()}</strong>${details.map(d => `<div style="font-size:13px;margin-top:4px;">${d}</div>`).join("")}</div><div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:16px;"><strong>👥 Attendance</strong> (${a.attendance.active} active)<br>On-Time: ${a.attendance.onTimeRate.toFixed(0)}% | Shift Complete: ${a.attendance.fullShiftRate.toFixed(0)}%</div><div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:16px;"><strong>📈 Productivity</strong><br>Tickets: ${a.productivity.total} | Quota Met: ${a.productivity.quotaRate.toFixed(0)}% | Gap: ${a.productivity.avgGap?.toFixed(1) ?? "--"} min</div><div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:16px;"><strong>⏱️ Time</strong><br>Avg Hours: ${a.time.avgLogged !== null ? fmtH(a.time.avgLogged) : "--"} / ${a.time.avgRequired !== null ? fmtH(a.time.avgRequired) : "--"} required</div><div style="background:#f1f5f9;padding:16px;border-radius:8px;"><strong>✅ Compliance</strong><br>Clean: ${a.compliance.cleanRate.toFixed(0)}% | Incidents: ${a.compliance.incidents}</div></div></body></html>`;
        try { await sendEmail({ to: adminEmails, subject: `${title} - ${status.toUpperCase()}`, html }); console.log("Email sent to admin roles"); } catch (e) { console.error("Email error:", e); }
      }

      // Slack to a_agent_reports channel
      if (slackBotToken) {
        const slackMsg = `📊 *EOD Team Analytics - ${dateStr}*\n\n${statusEmoji} *${status.toUpperCase()}*\n\n👥 Attendance: ${a.attendance.active} active | On-Time: ${a.attendance.onTimeRate.toFixed(0)}% | Complete: ${a.attendance.fullShiftRate.toFixed(0)}%\n📈 Productivity: ${a.productivity.total} tickets | Quota: ${a.productivity.quotaRate.toFixed(0)}% | Gap: ${a.productivity.avgGap?.toFixed(1) ?? "--"} min\n✅ Compliance: Clean ${a.compliance.cleanRate.toFixed(0)}% | Incidents: ${a.compliance.incidents}`;
        try { await fetch("https://slack.com/api/chat.postMessage", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${slackBotToken}` }, body: JSON.stringify({ channel: "a_agent_reports", text: slackMsg, mrkdwn: true }) }); console.log("Slack sent to a_agent_reports"); } catch (e) { console.error("Slack error:", e); }
      }
    }

    // Write audit log
    await supabase.from("portal_audit_log").insert({
      area: "Agent Reports",
      action_type: "created",
      entity_label: `EOD Analytics - ${dateStr}`,
      changed_by: "system",
      metadata: { type: "eod_analytics", date: dateStr, status, active_agents: a.attendance.active, total_tickets: a.productivity.total, silent },
    });

    return new Response(JSON.stringify({ success: true, date: dateStr, analytics }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
