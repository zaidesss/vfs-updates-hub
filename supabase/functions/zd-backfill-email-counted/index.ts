import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZD2_SUBDOMAIN = "customerserviceadvocateshelp";

interface BackfillRequest {
  zendesk_instance_name?: string;
  mode: "email_only" | "messaging_convert_optional";
  start_time_unix: number;
  max_pages?: number;
  per_page?: number;
  dry_run?: boolean;
  job_id?: string;
  resume?: boolean;
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

    const body: BackfillRequest = await req.json();
    const {
      mode,
      start_time_unix,
      max_pages = 5,
      per_page = 100,
      dry_run = false,
      job_id,
      resume = false,
    } = body;

    // Only ZD2
    const subdomain = ZD2_SUBDOMAIN;
    const instanceName = "customerserviceadvocateshelp";

    const zdToken = Deno.env.get("ZENDESK_API_TOKEN_ZD2");
    const zdEmail = Deno.env.get("ZENDESK_ADMIN_EMAIL");
    if (!zdToken || !zdEmail) {
      return new Response(
        JSON.stringify({ error: "Missing Zendesk credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = "Basic " + btoa(`${zdEmail}/token:${zdToken}`);

    // Resume or create job
    let currentJobId = job_id;
    let cursorUnix = start_time_unix;
    let cursorToken: string | null = null;
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let lastTicketId: number | null = null;

    if (resume && job_id) {
      // Fetch existing job
      const { data: existingJob, error: jobErr } = await supabaseAdmin
        .from("zd_backfill_jobs")
        .select("*")
        .eq("id", job_id)
        .single();

      if (jobErr || !existingJob) {
        return new Response(
          JSON.stringify({ error: "Job not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      cursorUnix = existingJob.cursor_unix || start_time_unix;
      cursorToken = existingJob.cursor_token;
      processed = existingJob.processed || 0;
      updated = existingJob.updated || 0;
      skipped = existingJob.skipped || 0;
      errors = existingJob.errors || 0;
      lastTicketId = existingJob.last_ticket_id;

      // Update status back to Running
      await supabaseAdmin
        .from("zd_backfill_jobs")
        .update({ status: "Running", error: null })
        .eq("id", job_id);
    } else {
      // Create new job
      const { data: newJob, error: createErr } = await supabaseAdmin
        .from("zd_backfill_jobs")
        .insert({
          zendesk_instance_name: instanceName,
          job_type: mode,
          status: "Running",
          cursor_unix: start_time_unix,
          dry_run,
        })
        .select()
        .single();

      if (createErr || !newJob) {
        return new Response(
          JSON.stringify({ error: "Failed to create job: " + (createErr?.message || "unknown") }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      currentJobId = newJob.id;
    }

    // Incremental export cursor loop
    let afterUrl = cursorToken 
      ? `https://${subdomain}.zendesk.com/api/v2/incremental/tickets/cursor.json?cursor=${cursorToken}&per_page=${per_page}`
      : `https://${subdomain}.zendesk.com/api/v2/incremental/tickets/cursor.json?start_time=${cursorUnix}&per_page=${per_page}`;
    let pagesProcessed = 0;
    let hasMore = true;
    const userRoleCache = new Map<number, string>();

    while (pagesProcessed < max_pages && hasMore) {
      // Fetch page with rate limit handling
      let response: Response;
      let retries = 0;
      while (true) {
        response = await fetch(afterUrl, {
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
        });

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("Retry-After") || "10");
          console.log(`Rate limited, waiting ${retryAfter}s`);
          await sleep(retryAfter * 1000);
          continue;
        }

        if (response.status >= 500) {
          retries++;
          if (retries > 3) {
            throw new Error(`Zendesk API returned ${response.status} after ${retries} retries`);
          }
          await sleep(Math.pow(2, retries) * 1000);
          continue;
        }

        break;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Zendesk API error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const tickets = data.tickets || [];
      hasMore = !data.end_of_stream;

      for (const ticket of tickets) {
        processed++;

        // Skip solved/closed
        if (ticket.status === "solved" || ticket.status === "closed") {
          skipped++;
          continue;
        }

        const channel = ticket.via?.channel;
        const tags: string[] = ticket.tags || [];

        if (mode === "email_only") {
          if (channel === "email" && !tags.includes("email_counted")) {
            if (!dry_run) {
              const tagResult = await addTagsToTicket(
                subdomain,
                authHeader,
                ticket.id,
                ["email_counted"]
              );
              if (tagResult.success) {
                updated++;
                await logItem(supabaseAdmin, currentJobId!, ticket.id, "updated", "Added email_counted");
              } else {
                errors++;
                await logItem(supabaseAdmin, currentJobId!, ticket.id, "error", tagResult.error || "Unknown error");
              }
            } else {
              updated++;
              await logItem(supabaseAdmin, currentJobId!, ticket.id, "updated", "[DRY RUN] Would add email_counted");
            }
          } else {
            skipped++;
          }
        } else if (mode === "messaging_convert_optional") {
          if (
            (channel === "messaging" || channel === "chat") &&
            !tags.includes("email_counted")
          ) {
            // Check for 2+ public agent replies
            const agentReplyCount = await countPublicAgentReplies(
              subdomain,
              authHeader,
              ticket.id,
              userRoleCache
            );

            if (agentReplyCount >= 2) {
              if (!dry_run) {
                const tagResult = await addTagsToTicket(
                  subdomain,
                  authHeader,
                  ticket.id,
                  ["email_converted", "email_counted"]
                );
                if (tagResult.success) {
                  updated++;
                  await logItem(supabaseAdmin, currentJobId!, ticket.id, "updated", "Added email_converted + email_counted");
                } else {
                  errors++;
                  await logItem(supabaseAdmin, currentJobId!, ticket.id, "error", tagResult.error || "Unknown error");
                }
              } else {
                updated++;
                await logItem(supabaseAdmin, currentJobId!, ticket.id, "updated", "[DRY RUN] Would add email_converted + email_counted");
              }
            } else {
              skipped++;
            }
          } else {
            skipped++;
          }
        }

        lastTicketId = ticket.id;
      }

      // Extract cursor for next page
      if (data.after_url) {
        afterUrl = data.after_url;
        // Store the opaque cursor token
        if (data.after_cursor) {
          cursorToken = data.after_cursor;
        }
      }

      // Checkpoint after each page
      await supabaseAdmin
        .from("zd_backfill_jobs")
        .update({
          cursor_unix: cursorUnix,
          cursor_token: cursorToken,
          processed,
          updated,
          skipped,
          errors,
          last_ticket_id: lastTicketId,
        })
        .eq("id", currentJobId);

      pagesProcessed++;
    }

    // Finalize
    const finalStatus = hasMore ? "Paused" : "Completed";
    await supabaseAdmin
      .from("zd_backfill_jobs")
      .update({
        status: finalStatus,
        finished_at: hasMore ? null : new Date().toISOString(),
        cursor_unix: cursorUnix,
        cursor_token: cursorToken,
        processed,
        updated,
        skipped,
        errors,
        last_ticket_id: lastTicketId,
      })
      .eq("id", currentJobId);

    return new Response(
      JSON.stringify({
        job_id: currentJobId,
        status: finalStatus,
        processed,
        updated,
        skipped,
        errors,
        has_more: hasMore,
        cursor_unix: cursorUnix,
        cursor_token: cursorToken,
        dry_run,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Backfill error:", err);

    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function addTagsToTicket(
  subdomain: string,
  authHeader: string,
  ticketId: number,
  tags: string[]
): Promise<{ success: boolean; error?: string }> {
  let retries = 0;
  while (retries < 3) {
    const resp = await fetch(
      `https://${subdomain}.zendesk.com/api/v2/tickets/${ticketId}.json`,
      {
        method: "PUT",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticket: { additional_tags: tags } }),
      }
    );

    if (resp.status === 429) {
      const retryAfter = parseInt(resp.headers.get("Retry-After") || "10");
      await sleep(retryAfter * 1000);
      continue;
    }

    if (resp.status >= 500) {
      retries++;
      await sleep(Math.pow(2, retries) * 1000);
      continue;
    }

    if (!resp.ok) {
      const errText = await resp.text();
      return { success: false, error: `HTTP ${resp.status}: ${errText}` };
    }

    return { success: true };
  }
  return { success: false, error: "Max retries exceeded" };
}

async function countPublicAgentReplies(
  subdomain: string,
  authHeader: string,
  ticketId: number,
  userRoleCache: Map<number, string>
): Promise<number> {
  let count = 0;
  let url = `https://${subdomain}.zendesk.com/api/v2/tickets/${ticketId}/audits.json?per_page=100`;

  while (url) {
    const resp = await fetch(url, {
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
    });

    if (resp.status === 429) {
      const retryAfter = parseInt(resp.headers.get("Retry-After") || "10");
      await sleep(retryAfter * 1000);
      continue;
    }

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

  const resp = await fetch(
    `https://${subdomain}.zendesk.com/api/v2/users/${userId}.json`,
    { headers: { Authorization: authHeader } }
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
