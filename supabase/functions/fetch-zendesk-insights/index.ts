import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ZendeskConfig {
  subdomain: string;
  token: string;
  email: string;
}

interface TicketMetricEvent {
  id: number;
  ticket_id: number;
  metric: string;
  type: string;
  time: string;
  status?: { calendar: number; business: number };
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getZdConfig(instance: 'ZD1' | 'ZD2'): ZendeskConfig | null {
  const token = Deno.env.get(instance === 'ZD1' ? 'ZENDESK_API_TOKEN_ZD1' : 'ZENDESK_API_TOKEN_ZD2');
  const email = Deno.env.get('ZENDESK_ADMIN_EMAIL');
  if (!token || !email) return null;

  return {
    subdomain: instance === 'ZD1' ? 'customerserviceadvocates' : 'customerserviceadvocateshelp',
    token,
    email,
  };
}

// Paginate Zendesk search results - NO LIMIT
async function searchAllTickets(config: ZendeskConfig, query: string): Promise<any[]> {
  const allResults: any[] = [];
  let page = 1;

  while (true) {
    const url = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&sort_by=created_at&sort_order=desc&per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Search failed page ${page}: ${response.status}`);
      break;
    }

    const data = await response.json();
    const results = data.results || [];
    allResults.push(...results);

    console.log(`Page ${page}: ${results.length} results (total so far: ${allResults.length})`);

    if (results.length < 100 || !data.next_page) break;
    page++;
    await delay(500);
  }

  return allResults;
}

// Fetch ticket metrics for a batch of ticket IDs (up to 500)
async function fetchTicketMetricsBatch(
  config: ZendeskConfig,
  ticketIds: number[]
): Promise<{ totalFullRes: number; fullResCount: number; totalAgentWork: number; agentWorkCount: number; totalFrt: number; frtCount: number }> {
  let totalFullRes = 0, fullResCount = 0;
  let totalAgentWork = 0, agentWorkCount = 0;
  let totalFrt = 0, frtCount = 0;

  const batchSize = 5;

  for (let i = 0; i < ticketIds.length; i += batchSize) {
    const batch = ticketIds.slice(i, i + batchSize);

    const promises = batch.map(async (ticketId) => {
      try {
        const authHeaders = {
          'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
          'Content-Type': 'application/json',
        };

        const [metricsRes, eventsRes] = await Promise.all([
          fetch(`https://${config.subdomain}.zendesk.com/api/v2/tickets/${ticketId}/metrics.json`, { headers: authHeaders }),
          fetch(`https://${config.subdomain}.zendesk.com/api/v2/tickets/${ticketId}/metric_events.json`, { headers: authHeaders }),
        ]);

        let fullResolutionMinutes: number | null = null;
        let agentWorkTimeSeconds: number | null = null;
        let frtSeconds: number | null = null;

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          const tm = data.ticket_metric;
          fullResolutionMinutes = tm?.full_resolution_time_in_minutes?.calendar ?? null;
          // Debug: log raw metric for first few tickets
          if (i === 0) {
            console.log(`DEBUG ticket ${ticketId} full_res:`, JSON.stringify(tm?.full_resolution_time_in_minutes));
            console.log(`DEBUG ticket ${ticketId} agent_work:`, JSON.stringify(tm?.agent_wait_time_in_minutes));
            console.log(`DEBUG ticket ${ticketId} reply_time:`, JSON.stringify(tm?.reply_time_in_minutes));
          }
        }

        if (eventsRes.ok) {
          const data = await eventsRes.json();
          const events: TicketMetricEvent[] = data.ticket_metric_events || [];

          const workTimeEvents = events.filter(e => e.metric === 'agent_work_time' && e.type === 'update_status');
          if (workTimeEvents.length > 0) {
            agentWorkTimeSeconds = workTimeEvents[workTimeEvents.length - 1].status?.calendar ?? null;
          }

          const replyActivate = events.find(e => e.metric === 'reply_time' && e.type === 'activate');
          const replyFulfill = events.find(e => e.metric === 'reply_time' && e.type === 'fulfill');
          if (replyActivate && replyFulfill) {
            frtSeconds = Math.round((new Date(replyFulfill.time).getTime() - new Date(replyActivate.time).getTime()) / 1000);
          } else if (replyFulfill?.status?.calendar !== undefined) {
            frtSeconds = replyFulfill.status.calendar;
          }
        }

        return { fullResolutionMinutes, agentWorkTimeSeconds, frtSeconds };
      } catch (err) {
        console.error(`Error fetching metrics for ticket ${ticketId}:`, err);
        return { fullResolutionMinutes: null, agentWorkTimeSeconds: null, frtSeconds: null };
      }
    });

    const batchResults = await Promise.all(promises);
    for (const r of batchResults) {
      if (r.fullResolutionMinutes !== null) {
        totalFullRes += r.fullResolutionMinutes;
        fullResCount++;
      }
      if (r.agentWorkTimeSeconds !== null) {
        totalAgentWork += r.agentWorkTimeSeconds;
        agentWorkCount++;
      }
      if (r.frtSeconds !== null) {
        totalFrt += r.frtSeconds;
        frtCount++;
      }
    }

    if (i + batchSize < ticketIds.length) await delay(300);
  }

  return { totalFullRes, fullResCount, totalAgentWork, agentWorkCount, totalFrt, frtCount };
}

// Fetch CSAT for the week
async function fetchCSAT(config: ZendeskConfig, weekStart: string, weekEnd: string): Promise<{ good: number; total: number; score: number | null }> {
  try {
    const startEpoch = Math.floor(new Date(weekStart).getTime() / 1000);
    const endEpoch = Math.floor(new Date(weekEnd + 'T23:59:59Z').getTime() / 1000);

    const url = `https://${config.subdomain}.zendesk.com/api/v2/satisfaction_ratings.json?start_time=${startEpoch}&end_time=${endEpoch}&sort_by=created_at&sort_order=desc`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`CSAT fetch failed: ${response.status}`);
      return { good: 0, total: 0, score: null };
    }

    const data = await response.json();
    const ratings = data.satisfaction_ratings || [];

    let good = 0;
    let total = 0;
    for (const r of ratings) {
      if (r.score === 'good' || r.score === 'bad') {
        total++;
        if (r.score === 'good') good++;
      }
    }

    return {
      good,
      total,
      score: total > 0 ? Math.round((good / total) * 100) : null,
    };
  } catch (err) {
    console.error('Error fetching CSAT:', err);
    return { good: 0, total: 0, score: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { weekStart, weekEnd, zdInstance, forceRefresh, mode } = body;

    if (!weekStart || !weekEnd || !zdInstance) {
      return new Response(
        JSON.stringify({ error: 'weekStart, weekEnd, and zdInstance are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for cache operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============ MODE: "cache" ============
    // Frontend sends final computed results to be saved
    if (mode === 'cache') {
      const { totalTickets, avgResolutionTimeSeconds, fullResolutionTimeMinutes, csatScore, csatGood, csatTotal, avgFrtSeconds } = body;

      const { error: cacheError } = await supabase
        .from('zendesk_insights_cache')
        .upsert({
          zd_instance: zdInstance,
          week_start: weekStart,
          week_end: weekEnd,
          total_tickets: totalTickets,
          avg_resolution_time_seconds: avgResolutionTimeSeconds,
          full_resolution_time_minutes: fullResolutionTimeMinutes,
          csat_score: csatScore,
          csat_good: csatGood,
          csat_total: csatTotal,
          avg_frt_seconds: avgFrtSeconds,
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'zd_instance,week_start' });

      if (cacheError) {
        console.error('Failed to cache insights:', cacheError);
        return new Response(
          JSON.stringify({ error: 'Failed to save cache', details: cacheError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ MODE: "metrics" ============
    // Frontend sends a chunk of ticket IDs, we fetch metrics and return raw totals
    if (mode === 'metrics') {
      const { ticketIds } = body as { ticketIds: number[] };

      if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'ticketIds array is required for metrics mode' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const config = getZdConfig(zdInstance);
      if (!config) {
        return new Response(
          JSON.stringify({ error: `Zendesk credentials not configured for ${zdInstance}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Fetching metrics for ${ticketIds.length} tickets (${zdInstance})`);
      const totals = await fetchTicketMetricsBatch(config, ticketIds);

      return new Response(
        JSON.stringify(totals),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ MODE: "search" (default / legacy) ============
    // Check cache first (unless forceRefresh)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('zendesk_insights_cache')
        .select('*')
        .eq('zd_instance', zdInstance)
        .eq('week_start', weekStart)
        .maybeSingle();

      if (cached) {
        const now = new Date();
        const weekEndDate = new Date(weekEnd + 'T23:59:59Z');
        const isCurrentWeek = weekEndDate >= now;
        const cacheAge = now.getTime() - new Date(cached.fetched_at).getTime();
        const thirtyMinutes = 30 * 60 * 1000;

        // Return cached data if valid AND it has metrics (not a partial cache)
        const hasMetrics = cached.avg_resolution_time_seconds !== null || cached.avg_frt_seconds !== null;
        if ((!isCurrentWeek || cacheAge < thirtyMinutes) && hasMetrics) {
          console.log(`Returning cached data for ${zdInstance} week ${weekStart}`);
          return new Response(
            JSON.stringify({
              zdInstance,
              totalTickets: cached.total_tickets,
              avgResolutionTimeSeconds: cached.avg_resolution_time_seconds,
              fullResolutionTimeMinutes: cached.full_resolution_time_minutes,
              csatScore: cached.csat_score,
              csatGood: cached.csat_good,
              csatTotal: cached.csat_total,
              avgFrtSeconds: cached.avg_frt_seconds,
              cached: true,
              cachedAt: cached.fetched_at,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const config = getZdConfig(zdInstance);
    if (!config) {
      return new Response(
        JSON.stringify({ error: `Zendesk credentials not configured for ${zdInstance}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching tickets for ${zdInstance}, week ${weekStart} to ${weekEnd}`);

    // Search all solved tickets in the week
    const query = `type:ticket solved>=${weekStart} solved<=${weekEnd}`;
    const tickets = await searchAllTickets(config, query);
    const validTickets = tickets.filter((t: any) => t.status !== 'deleted');
    const ticketIds = validTickets.map((t: any) => t.id as number);

    console.log(`Found ${validTickets.length} solved tickets for ${zdInstance}`);

    // Fetch CSAT
    const csat = await fetchCSAT(config, weekStart, weekEnd);

    // If mode is explicitly "search", return ticket IDs for chunked processing
    if (mode === 'search') {
      return new Response(
        JSON.stringify({
          zdInstance,
          totalTickets: validTickets.length,
          ticketIds,
          csatScore: csat.score,
          csatGood: csat.good,
          csatTotal: csat.total,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Legacy mode (no mode param): try to fetch everything in one go
    // This preserves backward compatibility but may timeout for large weeks
    const [metricsResult] = await Promise.all([
      ticketIds.length > 0 ? fetchTicketMetricsBatch(config, ticketIds) : Promise.resolve({ totalFullRes: 0, fullResCount: 0, totalAgentWork: 0, agentWorkCount: 0, totalFrt: 0, frtCount: 0 }),
    ]);

    const avgResolutionTimeSeconds = metricsResult.agentWorkCount > 0 ? Math.round(metricsResult.totalAgentWork / metricsResult.agentWorkCount) : null;
    const fullResolutionTimeMinutes = metricsResult.fullResCount > 0 ? Math.round(metricsResult.totalFullRes / metricsResult.fullResCount) : null;
    const avgFrtSeconds = metricsResult.frtCount > 0 ? Math.round(metricsResult.totalFrt / metricsResult.frtCount) : null;

    // Save to cache
    await supabase
      .from('zendesk_insights_cache')
      .upsert({
        zd_instance: zdInstance,
        week_start: weekStart,
        week_end: weekEnd,
        total_tickets: validTickets.length,
        avg_resolution_time_seconds: avgResolutionTimeSeconds,
        full_resolution_time_minutes: fullResolutionTimeMinutes,
        csat_score: csat.score,
        csat_good: csat.good,
        csat_total: csat.total,
        avg_frt_seconds: avgFrtSeconds,
        fetched_at: new Date().toISOString(),
      }, { onConflict: 'zd_instance,week_start' });

    return new Response(
      JSON.stringify({
        zdInstance,
        totalTickets: validTickets.length,
        avgResolutionTimeSeconds,
        fullResolutionTimeMinutes,
        csatScore: csat.score,
        csatGood: csat.good,
        csatTotal: csat.total,
        avgFrtSeconds,
        cached: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-zendesk-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
