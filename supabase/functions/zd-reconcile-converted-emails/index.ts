import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZD2_SUBDOMAIN = "customerserviceadvocateshelp";

interface ReconcileRequest {
  agent_name: string;
  agent_email: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  dry_run?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: ReconcileRequest = await req.json();
    const { agent_name, agent_email, start_date, end_date, dry_run = true } = body;

    if (!agent_name || !agent_email || !start_date || !end_date) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: agent_name, agent_email, start_date, end_date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const zdToken = Deno.env.get("ZENDESK_API_TOKEN_ZD2");
    const zdEmail = Deno.env.get("ZENDESK_ADMIN_EMAIL");
    if (!zdToken || !zdEmail) {
      return new Response(
        JSON.stringify({ error: "Missing Zendesk credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = "Basic " + btoa(`${zdEmail}/token:${zdToken}`);
    const instanceName = ZD2_SUBDOMAIN;

    // Create a job record for audit trail
    const { data: job, error: jobErr } = await supabaseAdmin
      .from("zd_backfill_jobs")
      .insert({
        zendesk_instance_name: instanceName,
        job_type: "reconcile_converted",
        status: "Running",
        cursor_unix: 0,
        dry_run,
      })
      .select()
      .single();

    if (jobErr || !job) {
      return new Response(
        JSON.stringify({ error: "Failed to create job: " + (jobErr?.message || "unknown") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jobId = job.id;
    let processed = 0;
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    const userRoleCache = new Map<number, string>();

    // Search for messaging/chat tickets assigned to this agent in the date range
    // Using Zendesk Search API with explicit dates
    const searchQuery = `type:ticket assignee:${agent_email} via:chat via:messaging created>=${start_date} created<=${end_date}`;
    let searchUrl = `https://${ZD2_SUBDOMAIN}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(searchQuery)}&per_page=100&sort_by=created_at&sort_order=asc`;
    let hasMore = true;

    while (hasMore && searchUrl) {
      const resp = await zdFetch(searchUrl, authHeader);
      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`Search API error: ${resp.status} - ${errText}`);
        // Try alternative search without via filters (search by channel after)
        break;
      }

      const data = await resp.json();
      const results = data.results || [];

      for (const ticket of results) {
        processed++;

        const channel = ticket.via?.channel;
        // Only process messaging/chat tickets
        if (channel !== "messaging" && channel !== "chat" && channel !== "native_messaging") {
          skipped++;
          continue;
        }

        // Check if already in ticket_logs as Email
        const { data: existingLogs } = await supabaseAdmin
          .from("ticket_logs")
          .select("id")
          .eq("ticket_id", String(ticket.id))
          .eq("zd_instance", instanceName)
          .eq("ticket_type", "Email")
          .limit(1);

        if (existingLogs && existingLogs.length > 0) {
          skipped++;
          await logItem(supabaseAdmin, jobId, ticket.id, "skipped", "Already has Email entry in ticket_logs");
          continue;
        }

        // Check for 2+ public agent replies
        const agentReplyCount = await countPublicAgentReplies(
          ZD2_SUBDOMAIN,
          authHeader,
          ticket.id,
          userRoleCache
        );

        if (agentReplyCount < 2) {
          skipped++;
          await logItem(supabaseAdmin, jobId, ticket.id, "skipped", `Only ${agentReplyCount} public agent replies`);
          continue;
        }

        // This ticket qualifies — insert into ticket_logs
        if (!dry_run) {
          const { error: insertErr } = await supabaseAdmin
            .from("ticket_logs")
            .insert({
              zd_instance: instanceName,
              ticket_id: String(ticket.id),
              ticket_type: "Email",
              status: ticket.status || "solved",
              agent_name: agent_name,
              agent_email: agent_email,
              timestamp: ticket.created_at || new Date().toISOString(),
              is_ot: false,
              is_autosolved: false,
            });

          if (insertErr) {
            errors++;
            await logItem(supabaseAdmin, jobId, ticket.id, "error", `Insert failed: ${insertErr.message}`);
          } else {
            inserted++;
            await logItem(supabaseAdmin, jobId, ticket.id, "inserted", `Inserted as Email (${agentReplyCount} agent replies, channel: ${channel})`);
          }
        } else {
          inserted++;
          await logItem(supabaseAdmin, jobId, ticket.id, "would_insert", `[DRY RUN] Would insert as Email (${agentReplyCount} agent replies, channel: ${channel})`);
        }
      }

      // Pagination
      if (data.next_page) {
        searchUrl = data.next_page;
      } else {
        hasMore = false;
      }
    }

    // Finalize job
    await supabaseAdmin
      .from("zd_backfill_jobs")
      .update({
        status: "Completed",
        finished_at: new Date().toISOString(),
        processed,
        updated: inserted,
        skipped,
        errors,
      })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({
        job_id: jobId,
        status: "Completed",
        processed,
        inserted,
        skipped,
        errors,
        dry_run,
        agent_name,
        start_date,
        end_date,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Reconciliation error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function zdFetch(url: string, authHeader: string): Promise<Response> {
  let retries = 0;
  while (true) {
    const resp = await fetch(url, {
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
    });

    if (resp.status === 429) {
      const retryAfter = parseInt(resp.headers.get("Retry-After") || "10");
      console.log(`Rate limited, waiting ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      continue;
    }

    if (resp.status >= 500) {
      retries++;
      if (retries > 3) return resp;
      await sleep(Math.pow(2, retries) * 1000);
      continue;
    }

    return resp;
  }
}

async function countPublicAgentReplies(
  subdomain: string,
  authHeader: string,
  ticketId: number,
  userRoleCache: Map<number, string>
): Promise<number> {
  let count = 0;
  let url: string | null = `https://${subdomain}.zendesk.com/api/v2/tickets/${ticketId}/audits.json?per_page=100`;

  while (url) {
    const resp = await zdFetch(url, authHeader);
    if (!resp.ok) break;

    const data = await resp.json();

    for (const audit of data.audits || []) {
      for (const event of audit.events || []) {
        if (event.type === "Comment" && event.public === true && event.author_id) {
          const role = await getUserRole(subdomain, authHeader, event.author_id, userRoleCache);
          if (role === "agent" || role === "admin") {
            count++;
          }
        }
      }
    }

    url = data.next_page || null;
  }

  return count;
}

async function getUserRole(
  subdomain: string,
  authHeader: string,
  userId: number,
  cache: Map<number, string>
): Promise<string> {
  if (cache.has(userId)) return cache.get(userId)!;

  const resp = await zdFetch(
    `https://${subdomain}.zendesk.com/api/v2/users/${userId}.json`,
    `${authHeader}`
  );

  if (!resp.ok) {
    cache.set(userId, "unknown");
    return "unknown";
  }

  const data = await resp.json();
  const role = data.user?.role || "unknown";
  cache.set(userId, role);
  return role;
}

async function logItem(
  supabase: any,
  jobId: string,
  ticketId: number,
  action: string,
  message: string
) {
  await supabase
    .from("zd_backfill_job_items")
    .upsert(
      { job_id: jobId, ticket_id: ticketId, action, message },
      { onConflict: "job_id,ticket_id" }
    );
}
