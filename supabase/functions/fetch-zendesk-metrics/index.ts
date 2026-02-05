import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const MINIMUM_DATE = new Date('2025-01-26');
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 5000;
const REQUEST_DELAY_MS = 500;
const INCREMENTAL_API_DELAY_MS = 6000; // 10 req/min = 6s between requests
const CHAT_CONCURRENT_LIMIT = 5;

interface MetricsRequest {
  scheduled?: boolean;
  weekStart?: string;
  weekEnd?: string;
  agentEmails?: string[];
}

interface AgentMetrics {
  agentEmail: string;
  callAhtSeconds: number | null;
  chatAhtSeconds: number | null;
  chatFrtSeconds: number | null;
  totalCalls: number;
  totalChats: number;
}

interface ZendeskConfig {
  subdomain: string;
  token: string;
  email: string;
}

interface LegRecord {
  id: string | number;
  call_id: string | number;  // Parent call ID
  agent_id: string | number;
  talk_time: number;
  wrap_up_time: number;
  type: string;  // "customer", "agent", "external", "supervisor"
  completion_status?: string;  // "completed", "agent_missed", "agent_declined", etc.
  updated_at?: string;
  created_at?: string;
}

// Interface for Ticket Metric Events API (used for Chat AHT)
interface TicketMetricEvent {
  id: number;
  ticket_id: number;
  metric: string;  // "agent_work_time", "reply_time", etc.
  type: string;    // "activate", "pause", "fulfill", "update_status"
  time: string;
  status?: {
    calendar: number;  // seconds
    business: number;
  };
}

// Excluded statuses for Explore-aligned Avg Talk Time calculation
const EXCLUDED_COMPLETION_STATUSES = ['agent_missed', 'agent_declined', 'agent_transfer_declined'];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Calculate previous week's Monday-Sunday range
function getPreviousWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days since last Monday
  const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
  
  // Get last Monday (start of current week) then go back 7 days for previous week's Monday
  const previousMonday = new Date(now);
  previousMonday.setDate(now.getDate() - daysSinceMonday - 7);
  previousMonday.setHours(0, 0, 0, 0);
  
  // Previous Sunday is 6 days after previous Monday
  const previousSunday = new Date(previousMonday);
  previousSunday.setDate(previousMonday.getDate() + 6);
  previousSunday.setHours(23, 59, 59, 999);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  return {
    weekStart: formatDate(previousMonday),
    weekEnd: formatDate(previousSunday),
  };
}

// Check if a date falls within the week range
function isWithinWeek(dateStr: string | undefined, weekStart: string, weekEnd: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const start = new Date(weekStart);
  const end = new Date(weekEnd + 'T23:59:59.999Z');
  return date >= start && date <= end;
}

// Paginate through Zendesk Incremental Legs API using end_time cursor
async function paginateIncrementalLegs(
  config: ZendeskConfig,
  startEpoch: number,
  endEpoch: number
): Promise<LegRecord[]> {
  const allLegs: LegRecord[] = [];
  let currentStartTime = startEpoch;
  let pageCount = 0;
  const maxPages = 20; // Safety limit

  while (pageCount < maxPages) {
    pageCount++;
    const url = `https://${config.subdomain}.zendesk.com/api/v2/channels/voice/stats/incremental/legs.json?start_time=${currentStartTime}`;
    console.log(`Fetching incremental legs page ${pageCount}: start_time=${currentStartTime}`);

    try {
      const response: Response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Incremental legs API failed: ${response.status} ${response.statusText}`);
        break;
      }

      const data: { legs?: LegRecord[]; end_time?: number; count?: number } = await response.json();
      const legs = data.legs || [];
      allLegs.push(...legs);

      console.log(`Page ${pageCount}: fetched ${legs.length} legs, total: ${allLegs.length}, end_time: ${data.end_time}`);

      // Check if we've reached the end or passed our week boundary
      if (!data.end_time || data.end_time >= endEpoch) {
        console.log(`Reached end of data or past week boundary (end_time: ${data.end_time}, endEpoch: ${endEpoch})`);
        break;
      }

      // Check if no more data (count is 0 or legs empty)
      if (legs.length === 0) {
        console.log('No more legs in this page, stopping pagination');
        break;
      }

      // Use end_time as the start_time for next request
      currentStartTime = data.end_time;

      // Rate limiting: 10 requests/minute = 6 second delay
      console.log(`Rate limiting: waiting ${INCREMENTAL_API_DELAY_MS}ms before next page...`);
      await delay(INCREMENTAL_API_DELAY_MS);

    } catch (error) {
      console.error(`Error fetching incremental legs page ${pageCount}:`, error);
      break;
    }
  }

  console.log(`Total legs fetched from incremental API: ${allLegs.length}`);
  return allLegs;
}

// Fetch Call AHT using Talk Incremental Legs API
async function fetchCallMetrics(
  config: ZendeskConfig,
  zendeskUserId: string,
  weekStart: string,
  weekEnd: string
): Promise<{ ahtSeconds: number | null; totalCalls: number }> {
  try {
    // Convert weekStart and weekEnd to Unix epoch (seconds)
    const startEpoch = Math.floor(new Date(weekStart).getTime() / 1000);
    const endEpoch = Math.floor(new Date(weekEnd + 'T23:59:59Z').getTime() / 1000);
    console.log(`Fetching call metrics for User ID ${zendeskUserId}, week ${weekStart} to ${weekEnd}, startEpoch: ${startEpoch}, endEpoch: ${endEpoch}`);

    // Fetch all legs from the incremental API starting from weekStart
    const allLegs = await paginateIncrementalLegs(config, startEpoch, endEpoch);

    // Filter legs for this specific agent - Explore-aligned logic
    // Include ALL agent legs EXCEPT missed/declined calls
    // This matches Zendesk Explore's "Average Talk Time" per-leg calculation
    const agentLegs = allLegs.filter(leg => 
      String(leg.agent_id) === zendeskUserId && 
      leg.type === 'agent' &&
      !EXCLUDED_COMPLETION_STATUSES.includes(leg.completion_status || '')
    );

    console.log(`Found ${agentLegs.length} agent legs for ${zendeskUserId} out of ${allLegs.length} total legs`);

    // Filter legs within the exact week boundary
    const weekLegs = agentLegs.filter(leg => {
      const legDate = leg.updated_at || leg.created_at;
      return isWithinWeek(legDate, weekStart, weekEnd);
    });

    console.log(`Agent legs within week ${weekStart} - ${weekEnd}: ${weekLegs.length}`);

    if (weekLegs.length === 0) {
      return { ahtSeconds: null, totalCalls: 0 };
    }

    // Explore-aligned formula: AVG(leg.talk_time_seconds)
    // Total legs = all agent legs excluding missed/declined (per-leg granularity)
    const totalLegs = weekLegs.length;

    // Sum all talk_time values (including zero-duration answered legs)
    let totalTalkTime = 0;
    for (const leg of weekLegs) {
      totalTalkTime += leg.talk_time || 0;
    }

    // Avg Talk Time = Total Talk Time / Total Legs (per-leg average, Explore aligned)
    // Round only at the final step
    const avgTalkTimeSeconds = totalLegs > 0 ? Math.round(totalTalkTime / totalLegs) : null;
    console.log(`Avg Talk Time for ${zendeskUserId}: ${avgTalkTimeSeconds}s (${totalLegs} legs, total talk: ${totalTalkTime}s)`);

    return { ahtSeconds: avgTalkTimeSeconds, totalCalls: totalLegs };

  } catch (error) {
    console.error(`Error fetching call metrics for Zendesk User ID ${zendeskUserId}:`, error);
    return { ahtSeconds: null, totalCalls: 0 };
  }
}

// Batch fetch ticket metrics with Explore-aligned logic (ZD1 only)
// Uses Ticket Metric Events API for agent_work_time and ticket metrics for FRT in seconds
async function batchFetchTicketMetricsExploreAligned(
  config: ZendeskConfig,
  ticketIds: number[]
): Promise<Map<number, { frtSeconds: number | null; ahtSeconds: number | null }>> {
  const results = new Map<number, { frtSeconds: number | null; ahtSeconds: number | null }>();

  const authHeaders = {
    'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
    'Content-Type': 'application/json',
  };

  // Process in batches of CHAT_CONCURRENT_LIMIT
  for (let i = 0; i < ticketIds.length; i += CHAT_CONCURRENT_LIMIT) {
    const batch = ticketIds.slice(i, i + CHAT_CONCURRENT_LIMIT);

    const batchPromises = batch.map(async (ticketId) => {
      try {
        // Fetch standard ticket metrics (for FRT in seconds)
        const metricsUrl = `https://${config.subdomain}.zendesk.com/api/v2/tickets/${ticketId}/metrics.json`;
        const metricsResponse = await fetch(metricsUrl, { headers: authHeaders });
        
        // Fetch metric events (for agent_work_time - Chat AHT)
        const eventsUrl = `https://${config.subdomain}.zendesk.com/api/v2/tickets/${ticketId}/metric_events.json`;
        const eventsResponse = await fetch(eventsUrl, { headers: authHeaders });

        let frtSeconds: number | null = null;
        let ahtSeconds: number | null = null;

        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          const tm = metricsData.ticket_metric;
          
          // Log available metrics for debugging (full_resolution NOT used for AHT - includes queue/wait)
          console.log(`Ticket ${ticketId} metrics: reply_time=${tm?.reply_time_in_seconds?.calendar}s, full_resolution=${tm?.full_resolution_time_in_minutes?.calendar}min (NOT used for AHT)`);
          
          // FRT: Use reply_time_in_seconds for precision (Explore aligned)
          frtSeconds = tm?.reply_time_in_seconds?.calendar || null;
          
          // AHT: Do NOT use full_resolution_time - it includes queue and wait time
          // Will be fetched from agent_work_time metric events below
        }
        
        // PRIMARY: Use agent_work_time from metric events (handle time only, excludes queue/wait)
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          const events: TicketMetricEvent[] = eventsData.ticket_metric_events || [];
          
          const workTimeEvents = events.filter(
            (e) => e.metric === 'agent_work_time' && e.type === 'update_status'
          );
          
          if (workTimeEvents.length > 0) {
            const lastEvent = workTimeEvents[workTimeEvents.length - 1];
            ahtSeconds = lastEvent.status?.calendar || null;
            console.log(`Ticket ${ticketId} agent_work_time: ${ahtSeconds}s (handle time only)`);
          }
        }
        
        // If agent_work_time not available, leave as null (do NOT fall back to full_resolution_time)

        return { ticketId, frtSeconds, ahtSeconds };
      } catch (error) {
        console.log(`Error fetching Explore-aligned metrics for ticket ${ticketId}:`, error);
        return { ticketId, frtSeconds: null, ahtSeconds: null };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    for (const result of batchResults) {
      results.set(result.ticketId, { 
        frtSeconds: result.frtSeconds, 
        ahtSeconds: result.ahtSeconds 
      });
    }

    // Rate limiting delay between batches (increased for additional API call)
    if (i + CHAT_CONCURRENT_LIMIT < ticketIds.length) {
      await delay(200);
    }
  }

  return results;
}

// Fetch Chat AHT and FRT using Explore-aligned logic (ZD1 only)
// Uses created>= filter, excludes bot-only/abandoned, uses agent_work_time for AHT
async function fetchChatMetrics(
  config: ZendeskConfig,
  zendeskUserId: string,
  weekStart: string,
  weekEnd: string
): Promise<{ ahtSeconds: number | null; frtSeconds: number | null; totalChats: number }> {
  try {
    // Explore uses "Ticket solved - Date" for weekly reporting
    // Try without via filter first to see total ticket count, then filter by via in results
    const query = `type:ticket assignee_id:${zendeskUserId} solved>=${weekStart} solved<=${weekEnd}`;
    const searchUrl = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&sort_by=created_at&sort_order=desc&per_page=100`;

    console.log(`Searching chats (Explore aligned) for User ID ${zendeskUserId}: ${query}`);

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      console.log(`Chat search failed for User ID ${zendeskUserId}: ${searchResponse.status}`);
      return { ahtSeconds: null, frtSeconds: null, totalChats: 0 };
    }

    const searchData = await searchResponse.json();
    
    // Log raw search results for debugging
    const rawResults = searchData.results || [];
    console.log(`Raw search returned ${rawResults.length} tickets for User ID ${zendeskUserId}`);
    
    // Analyze via channel distribution
    const channelCounts: Record<string, number> = {};
    for (const t of rawResults) {
      const channel = t.via?.channel || 'unknown';
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    }
    console.log(`Channel distribution for User ID ${zendeskUserId}: ${JSON.stringify(channelCounts)}`);
    
    // Filter to messaging-like channels (Explore aligned)
    // Broadened to match Explore's "Messaging" definition which includes multiple channels
    const messagingChannels = ['native_messaging', 'web_messaging', 'mobile_sdk'];
    const messagingTickets = rawResults.filter((t: any) => 
      t.status !== 'deleted' && 
      messagingChannels.includes(t.via?.channel)
    );
    
    console.log(`Found ${messagingTickets.length} messaging tickets for User ID ${zendeskUserId} (from ${rawResults.length} total)`);

    // Use messaging tickets for Chat metrics
    const tickets = messagingTickets;

    if (tickets.length === 0) {
      return { ahtSeconds: null, frtSeconds: null, totalChats: 0 };
    }

    // Get ticket IDs for Explore-aligned batch metric fetching
    const ticketIds = tickets.map((t: any) => t.id as number);

    // Use Explore-aligned batch fetch (uses agent_work_time for AHT, reply_time_in_seconds for FRT)
    const metricsMap = await batchFetchTicketMetricsExploreAligned(config, ticketIds);

    // Calculate per-conversation averages (Explore aligned)
    // Formula: AVG(metric_seconds) - round only at final step
    let totalFrt = 0;
    let frtCount = 0;
    let totalAht = 0;
    let ahtCount = 0;

    for (const [_, metrics] of metricsMap) {
      if (metrics.frtSeconds !== null) {
        totalFrt += metrics.frtSeconds;
        frtCount++;
      }
      if (metrics.ahtSeconds !== null) {
        totalAht += metrics.ahtSeconds;
        ahtCount++;
      }
    }

    // AVG per conversation - round only at final step
    const avgFrt = frtCount > 0 ? Math.round(totalFrt / frtCount) : null;
    const avgAht = ahtCount > 0 ? Math.round(totalAht / ahtCount) : null;

    console.log(`Chat metrics (Explore aligned) for User ID ${zendeskUserId}: AHT=${avgAht}s (${ahtCount} conversations), FRT=${avgFrt}s (${frtCount} conversations), total=${tickets.length}`);

    return { 
      ahtSeconds: avgAht, 
      frtSeconds: avgFrt, 
      totalChats: tickets.length 
    };

  } catch (error) {
    console.error(`Error fetching chat metrics for Zendesk User ID ${zendeskUserId}:`, error);
    return { ahtSeconds: null, frtSeconds: null, totalChats: 0 };
  }
}

// Process agents in batches
async function processAgentsInBatches(
  supabase: any,
  agents: { email: string; zendesk_instance: string | null; support_account: string | null; zendesk_user_id: string | null }[],
  weekStart: string,
  weekEnd: string,
  zd1Config: ZendeskConfig | null,
  zd2Config: ZendeskConfig | null
): Promise<AgentMetrics[]> {
  const results: AgentMetrics[] = [];

  for (let i = 0; i < agents.length; i += BATCH_SIZE) {
    const batch = agents.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(agents.length / BATCH_SIZE)}`);

    for (const agent of batch) {
      const config = agent.zendesk_instance === 'ZD1' ? zd1Config : 
                     agent.zendesk_instance === 'ZD2' ? zd2Config : null;

      if (!config) {
        console.log(`Skipping ${agent.email}: no Zendesk config for instance ${agent.zendesk_instance}`);
        continue;
      }

      // Use Zendesk User ID directly - skip agents without it
      if (!agent.zendesk_user_id) {
        console.log(`Skipping ${agent.email}: no zendesk_user_id configured`);
        continue;
      }

      console.log(`Fetching metrics for ${agent.email} using Zendesk User ID ${agent.zendesk_user_id} (${agent.zendesk_instance})`);

      const [callMetrics, chatMetrics] = await Promise.all([
        fetchCallMetrics(config, agent.zendesk_user_id, weekStart, weekEnd),
        fetchChatMetrics(config, agent.zendesk_user_id, weekStart, weekEnd),
      ]);

      const metrics: AgentMetrics = {
        agentEmail: agent.email.toLowerCase(),
        callAhtSeconds: callMetrics.ahtSeconds,
        chatAhtSeconds: chatMetrics.ahtSeconds,
        chatFrtSeconds: chatMetrics.frtSeconds,
        totalCalls: callMetrics.totalCalls,
        totalChats: chatMetrics.totalChats,
      };

      results.push(metrics);
      await delay(REQUEST_DELAY_MS);
    }

    // Delay between batches
    if (i + BATCH_SIZE < agents.length) {
      console.log(`Batch complete, waiting ${BATCH_DELAY_MS}ms before next batch...`);
      await delay(BATCH_DELAY_MS);
    }
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json() as MetricsRequest;
    let { weekStart, weekEnd, agentEmails } = body;

    // Handle scheduled mode - calculate previous week automatically
    if (body.scheduled) {
      const range = getPreviousWeekRange();
      weekStart = range.weekStart;
      weekEnd = range.weekEnd;
      console.log(`Scheduled run: computing metrics for week ${weekStart} to ${weekEnd}`);
    }

    if (!weekStart || !weekEnd) {
      return new Response(
        JSON.stringify({ error: 'weekStart and weekEnd are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Minimum date check
    const weekStartDate = new Date(weekStart);
    if (weekStartDate < MINIMUM_DATE) {
      console.log(`Skipping: Week ${weekStart} is before minimum date (Jan 26, 2026)`);
      return new Response(
        JSON.stringify({ 
          skipped: true, 
          reason: 'before_minimum_date',
          message: `Week starting ${weekStart} is before the minimum date of Jan 26, 2026`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For non-scheduled requests, check for fresh cached data first
    if (!body.scheduled) {
      let query = supabase
        .from('zendesk_agent_metrics')
        .select('*')
        .eq('week_start', weekStart)
        .eq('week_end', weekEnd);

      if (agentEmails && agentEmails.length > 0) {
        query = query.in('agent_email', agentEmails.map(e => e.toLowerCase()));
      }

      const { data: cachedData, error: cacheError } = await query;

      if (cacheError) {
        console.error('Error fetching cached data:', cacheError);
      }

      // Check if cached data is fresh (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const freshCache = cachedData?.filter(d => d.fetched_at > oneHourAgo) || [];

      if (freshCache.length > 0) {
        const metrics: AgentMetrics[] = freshCache.map(d => ({
          agentEmail: d.agent_email,
          callAhtSeconds: d.call_aht_seconds,
          chatAhtSeconds: d.chat_aht_seconds,
          chatFrtSeconds: d.chat_frt_seconds,
          totalCalls: d.total_calls || 0,
          totalChats: d.total_chats || 0,
        }));

        return new Response(
          JSON.stringify({ metrics, source: 'cache' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get Zendesk credentials
    const zd1Token = Deno.env.get('ZENDESK_API_TOKEN_ZD1');
    const zd2Token = Deno.env.get('ZENDESK_API_TOKEN_ZD2');
    const zendeskEmail = Deno.env.get('ZENDESK_ADMIN_EMAIL');

    if (!zendeskEmail) {
      console.error('ZENDESK_ADMIN_EMAIL not configured');
      return new Response(
        JSON.stringify({ error: 'Zendesk credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const zd1Config: ZendeskConfig | null = zd1Token ? {
      subdomain: 'customerserviceadvocates',
      token: zd1Token,
      email: zendeskEmail,
    } : null;

    const zd2Config: ZendeskConfig | null = zd2Token ? {
      subdomain: 'customerserviceadvocateshelp',
      token: zd2Token,
      email: zendeskEmail,
    } : null;

    // Fetch agents to process
    let agentsQuery = supabase
      .from('agent_profiles')
      .select('email, zendesk_instance, support_account, zendesk_user_id')
      .not('employment_status', 'eq', 'Terminated')
      .not('zendesk_instance', 'is', null);

    if (agentEmails && agentEmails.length > 0) {
      agentsQuery = agentsQuery.in('email', agentEmails.map(e => e.toLowerCase()));
    }

    const { data: agents, error: agentsError } = await agentsQuery;

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch agents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!agents || agents.length === 0) {
      console.log('No agents to process');
      return new Response(
        JSON.stringify({ metrics: [], message: 'No agents to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${agents.length} agents for week ${weekStart} to ${weekEnd}`);

    // Process agents in batches
    const metrics = await processAgentsInBatches(
      supabase,
      agents,
      weekStart,
      weekEnd,
      zd1Config,
      zd2Config
    );

    // Upsert results to cache table
    const now = new Date().toISOString();
    const upsertData = metrics.map(m => ({
      agent_email: m.agentEmail,
      week_start: weekStart,
      week_end: weekEnd,
      call_aht_seconds: m.callAhtSeconds,
      chat_aht_seconds: m.chatAhtSeconds,
      chat_frt_seconds: m.chatFrtSeconds,
      total_calls: m.totalCalls,
      total_chats: m.totalChats,
      fetched_at: now,
    }));

    if (upsertData.length > 0) {
      const { error: upsertError } = await supabase
        .from('zendesk_agent_metrics')
        .upsert(upsertData, { 
          onConflict: 'agent_email,week_start,week_end',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Error upserting metrics:', upsertError);
      } else {
        console.log(`Successfully cached metrics for ${upsertData.length} agents`);
      }
    }

    return new Response(
      JSON.stringify({ 
        metrics,
        processed: metrics.length,
        weekStart,
        weekEnd,
        source: 'zendesk_api'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-zendesk-metrics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
