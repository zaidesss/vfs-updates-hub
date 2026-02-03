import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ZENDESK_API_TOKEN = Deno.env.get("ZENDESK_API_TOKEN");
const ZENDESK_ADMIN_EMAIL = Deno.env.get("ZENDESK_ADMIN_EMAIL");

// ZD1 subdomain
const ZD1_SUBDOMAIN = "customerserviceadvocates";

// Lock retry configuration
const LOCK_RETRY_DELAY_MS = 2000;
const LOCK_MAX_RETRIES = 3;
const LOCK_EXPIRY_SECONDS = 60;

interface AssignmentResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  ticketsAssigned?: number;
  ticketIds?: string[];
  viewName?: string;
  error?: string;
}

interface AgentConfig {
  email: string;
  full_name: string | null;
  zendesk_instance: string | null;
  ticket_assignment_enabled: boolean;
  support_type: string | null;
  agent_tag: string | null;
  wd_ticket_assign: string | null;
  we_ticket_assign: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { agentEmail, profileId } = await req.json();

    if (!agentEmail || !profileId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing agentEmail or profileId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await processTicketAssignment(supabase, agentEmail, profileId);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Ticket assignment error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processTicketAssignment(
  supabase: any,
  agentEmail: string,
  profileId: string
): Promise<AssignmentResult> {
  const email = agentEmail.toLowerCase();

  // Step 1: Fetch agent configuration
  const agentConfig = await fetchAgentConfig(supabase, email);
  if (!agentConfig) {
    await logAssignment(supabase, email, null, null, null, null, 0, 0, [], "skipped", "Agent config not found");
    return { success: true, skipped: true, reason: "Agent configuration not found" };
  }

  // Step 2: Check if ZD1 only
  if (agentConfig.zendesk_instance !== "ZD1") {
    await logAssignment(supabase, email, agentConfig.full_name, agentConfig.zendesk_instance, null, null, 0, 0, [], "skipped", "ZD2 ticket assignment disabled");
    return { success: true, skipped: true, reason: "Ticket assignment not enabled for ZD2" };
  }

  // Step 3: Check if ticket assignment is enabled
  if (!agentConfig.ticket_assignment_enabled) {
    await logAssignment(supabase, email, agentConfig.full_name, agentConfig.zendesk_instance, null, null, 0, 0, [], "skipped", "Ticket assignment disabled for agent");
    return { success: true, skipped: true, reason: "Ticket assignment is disabled for this agent" };
  }

  // Step 4: Determine ticket count based on day of week
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  const ticketCountStr = isWeekend ? agentConfig.we_ticket_assign : agentConfig.wd_ticket_assign;
  const ticketCount = parseInt(ticketCountStr || "0", 10);

  if (!ticketCount || ticketCount <= 0) {
    await logAssignment(supabase, email, agentConfig.full_name, agentConfig.zendesk_instance, null, null, 0, 0, [], "skipped", `No tickets to assign (${isWeekend ? "WE" : "WD"} = ${ticketCountStr})`);
    return { success: true, skipped: true, reason: `No tickets configured for ${isWeekend ? "weekend" : "weekday"}` };
  }

  // Step 5: Determine View based on support_type
  const viewConfig = await getViewConfig(supabase, agentConfig.zendesk_instance, agentConfig.support_type);
  if (!viewConfig || !viewConfig.is_enabled || !viewConfig.view_id || viewConfig.view_id === "PENDING_VIEW_ID") {
    await logAssignment(supabase, email, agentConfig.full_name, agentConfig.zendesk_instance, null, null, ticketCount, 0, [], "skipped", "View not configured or disabled");
    return { success: true, skipped: true, reason: "Ticket assignment view not configured" };
  }

  const { view_id: viewId, view_name: viewName } = viewConfig;

  // Step 6: Check agent_tag
  if (!agentConfig.agent_tag) {
    await logAssignment(supabase, email, agentConfig.full_name, agentConfig.zendesk_instance, viewId, viewName, ticketCount, 0, [], "failed", "No agent_tag configured");
    return { success: false, error: "No agent_tag configured for this agent" };
  }

  // Step 7: Acquire lock
  const lockAcquired = await acquireLock(supabase, viewId, email);
  if (!lockAcquired) {
    await logAssignment(supabase, email, agentConfig.full_name, agentConfig.zendesk_instance, viewId, viewName, ticketCount, 0, [], "failed", "Could not acquire lock - queue busy");
    return { success: false, error: "Queue busy, please try again shortly" };
  }

  try {
    // Step 8: Fetch tickets from Zendesk View
    const tickets = await fetchTicketsFromView(viewId, ticketCount);
    
    if (!tickets || tickets.length === 0) {
      await releaseLock(supabase, viewId);
      await logAssignment(supabase, email, agentConfig.full_name, agentConfig.zendesk_instance, viewId, viewName, ticketCount, 0, [], "success", "View is empty");
      return { success: true, ticketsAssigned: 0, ticketIds: [], viewName };
    }

    // Step 9: Assign tickets (add agent_tag)
    const assignedTicketIds: string[] = [];
    for (const ticket of tickets) {
      const assigned = await assignTicketToAgent(ticket.id, ticket.tags || [], agentConfig.agent_tag!);
      if (!assigned) {
        // Retry once
        const retryAssigned = await assignTicketToAgent(ticket.id, ticket.tags || [], agentConfig.agent_tag!);
        if (!retryAssigned) {
          // Failure - abort all, notify admin
          await releaseLock(supabase, viewId);
          await logAssignment(supabase, email, agentConfig.full_name, agentConfig.zendesk_instance, viewId, viewName, ticketCount, assignedTicketIds.length, assignedTicketIds, "failed", `Failed to assign ticket ${ticket.id}`);
          await sendFailureEmail(agentConfig.full_name || email, email, agentConfig.zendesk_instance!, viewId, viewName!, ticketCount, `Failed to assign ticket ${ticket.id}`);
          return { success: false, error: "Failed to assign tickets - admin notified", ticketsAssigned: 0 };
        }
      }
      assignedTicketIds.push(String(ticket.id));
    }

    // Step 10: Success - release lock and log
    await releaseLock(supabase, viewId);
    await logAssignment(supabase, email, agentConfig.full_name, agentConfig.zendesk_instance, viewId, viewName, ticketCount, assignedTicketIds.length, assignedTicketIds, "success", null);

    return {
      success: true,
      ticketsAssigned: assignedTicketIds.length,
      ticketIds: assignedTicketIds,
      viewName,
    };
  } catch (error: any) {
    // Release lock on any error
    await releaseLock(supabase, viewId);
    await logAssignment(supabase, email, agentConfig.full_name, agentConfig.zendesk_instance, viewId, viewName, ticketCount, 0, [], "failed", error.message);
    await sendFailureEmail(agentConfig.full_name || email, email, agentConfig.zendesk_instance!, viewId, viewName!, ticketCount, error.message);
    throw error;
  }
}

async function fetchAgentConfig(supabase: any, email: string): Promise<AgentConfig | null> {
  // Fetch from agent_profiles (source of truth for ticket_assignment_enabled)
  const { data: profile, error: profileError } = await supabase
    .from("agent_profiles")
    .select("email, full_name, zendesk_instance, support_account, support_type, agent_tag, ticket_assignment_enabled")
    .eq("email", email)
    .single();

  if (profileError || !profile) {
    console.log("Profile not found for", email);
    return null;
  }

  // Fetch from agent_directory (for wd/we ticket assign values)
  const { data: directory } = await supabase
    .from("agent_directory")
    .select("wd_ticket_assign, we_ticket_assign")
    .eq("email", email)
    .maybeSingle();

  // Convert support_type array to string for matching
  const supportTypeStr = Array.isArray(profile.support_type) 
    ? profile.support_type.join(", ") 
    : profile.support_type;

  return {
    email: profile.email,
    full_name: profile.full_name,
    zendesk_instance: profile.zendesk_instance,
    ticket_assignment_enabled: profile.ticket_assignment_enabled || false,
    support_type: supportTypeStr,
    agent_tag: profile.agent_tag,
    wd_ticket_assign: directory?.wd_ticket_assign || null,
    we_ticket_assign: directory?.we_ticket_assign || null,
  };
}

async function getViewConfig(
  supabase: any,
  zendeskInstance: string,
  supportType: string | null
): Promise<{ view_id: string; view_name: string; is_enabled: boolean } | null> {
  // Determine pattern based on support_type content
  // If contains "Email" or "Hybrid" → email_hybrid (OpenAssign)
  // If contains "Chat" or "Phone" → chat_phone (NewAssign)
  let pattern = "email_hybrid"; // default
  if (supportType) {
    const lowerType = supportType.toLowerCase();
    if (lowerType.includes("chat") || lowerType.includes("phone")) {
      // Only use chat_phone if NOT also containing email/hybrid
      if (!lowerType.includes("email") && !lowerType.includes("hybrid")) {
        pattern = "chat_phone";
      }
    }
  }

  const { data, error } = await supabase
    .from("ticket_assignment_view_config")
    .select("view_id, view_name, is_enabled")
    .eq("zendesk_instance", zendeskInstance)
    .eq("support_type_pattern", pattern)
    .single();

  if (error || !data) {
    console.log("View config not found for", zendeskInstance, pattern);
    return null;
  }

  return data;
}

async function acquireLock(supabase: any, viewId: string, lockedBy: string): Promise<boolean> {
  for (let attempt = 0; attempt < LOCK_MAX_RETRIES; attempt++) {
    // First, clean up expired locks
    await supabase
      .from("ticket_assignment_locks")
      .delete()
      .lt("expires_at", new Date().toISOString());

    // Try to insert a new lock
    const expiresAt = new Date(Date.now() + LOCK_EXPIRY_SECONDS * 1000).toISOString();
    const { error } = await supabase
      .from("ticket_assignment_locks")
      .insert({
        view_id: viewId,
        locked_by: lockedBy,
        locked_at: new Date().toISOString(),
        expires_at: expiresAt,
      });

    if (!error) {
      console.log(`Lock acquired for view ${viewId} by ${lockedBy}`);
      return true;
    }

    // Lock exists, wait and retry
    console.log(`Lock busy for view ${viewId}, attempt ${attempt + 1}/${LOCK_MAX_RETRIES}`);
    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_DELAY_MS));
  }

  console.log(`Failed to acquire lock for view ${viewId} after ${LOCK_MAX_RETRIES} attempts`);
  return false;
}

async function releaseLock(supabase: any, viewId: string): Promise<void> {
  await supabase.from("ticket_assignment_locks").delete().eq("view_id", viewId);
  console.log(`Lock released for view ${viewId}`);
}

async function fetchTicketsFromView(viewId: string, count: number): Promise<any[]> {
  if (!ZENDESK_API_TOKEN || !ZENDESK_ADMIN_EMAIL) {
    throw new Error("Zendesk API credentials not configured");
  }

  const url = `https://${ZD1_SUBDOMAIN}.zendesk.com/api/v2/views/${viewId}/tickets.json?per_page=${count}`;
  const auth = btoa(`${ZENDESK_ADMIN_EMAIL}/token:${ZENDESK_API_TOKEN}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Zendesk API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.tickets || [];
}

async function assignTicketToAgent(ticketId: number, existingTags: string[], agentTag: string): Promise<boolean> {
  if (!ZENDESK_API_TOKEN || !ZENDESK_ADMIN_EMAIL) {
    throw new Error("Zendesk API credentials not configured");
  }

  // Add agent_tag to existing tags (avoid duplicates)
  const newTags = [...new Set([...existingTags, agentTag])];

  const url = `https://${ZD1_SUBDOMAIN}.zendesk.com/api/v2/tickets/${ticketId}.json`;
  const auth = btoa(`${ZENDESK_ADMIN_EMAIL}/token:${ZENDESK_API_TOKEN}`);

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticket: {
          tags: newTags,
        },
      }),
    });

    if (!response.ok) {
      console.error(`Failed to assign ticket ${ticketId}: ${response.status}`);
      return false;
    }

    console.log(`Ticket ${ticketId} assigned with tag ${agentTag}`);
    return true;
  } catch (error) {
    console.error(`Error assigning ticket ${ticketId}:`, error);
    return false;
  }
}

async function logAssignment(
  supabase: any,
  agentEmail: string,
  agentName: string | null,
  zendeskInstance: string | null,
  viewId: string | null,
  viewName: string | null,
  ticketsRequested: number,
  ticketsAssigned: number,
  ticketIds: string[],
  status: string,
  errorMessage: string | null
): Promise<void> {
  await supabase.from("ticket_assignment_logs").insert({
    agent_email: agentEmail,
    agent_name: agentName,
    zendesk_instance: zendeskInstance,
    view_id: viewId,
    view_name: viewName,
    tickets_requested: ticketsRequested,
    tickets_assigned: ticketsAssigned,
    ticket_ids: ticketIds,
    status,
    error_message: errorMessage,
  });
}

async function sendFailureEmail(
  agentName: string,
  agentEmail: string,
  zendeskInstance: string,
  viewId: string,
  viewName: string,
  ticketsRequested: number,
  errorMessage: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured, cannot send failure email");
    return;
  }

  const resend = new Resend(RESEND_API_KEY);
  const now = new Date().toISOString();

  try {
    await resend.emails.send({
      from: "VFS Portal <no-reply@vfs-services.com>",
      to: ["malcom@persistbrands.com"],
      subject: `Ticket Assignment Failed - ${agentName}`,
      html: `
        <h2>Ticket Assignment Failed</h2>
        <p><strong>Agent:</strong> ${agentName} (${agentEmail})</p>
        <p><strong>Time:</strong> ${now}</p>
        <p><strong>Instance:</strong> ${zendeskInstance}</p>
        <p><strong>View:</strong> ${viewName} (${viewId})</p>
        <p><strong>Tickets Requested:</strong> ${ticketsRequested}</p>
        <p><strong>Error:</strong> ${errorMessage}</p>
        <br/>
        <p>Please check the <code>ticket_assignment_logs</code> table for more details.</p>
      `,
    });
    console.log("Failure notification email sent");
  } catch (err) {
    console.error("Failed to send failure email:", err);
  }
}
