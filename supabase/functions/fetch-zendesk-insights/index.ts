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

interface InsightsRequest {
  weekStart: string;
  weekEnd: string;
  zdInstance: 'ZD1' | 'ZD2';
  forceRefresh?: boolean;
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

// Fetch ticket metrics for a batch of tickets
async function fetchTicketMetricsBatch(
  config: ZendeskConfig,
  ticketIds: number[]
): Promise<Map<number, { fullResolutionMinutes: number | null; agentWorkTimeSeconds: number | null; frtSeconds: number | null }>> {
  const results = new Map<number, { fullResolutionMinutes: number | null; agentWorkTimeSeconds: number | null; frtSeconds: number | null }>();
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

        return { ticketId, fullResolutionMinutes, agentWorkTimeSeconds, frtSeconds };
      } catch (err) {
        console.error(`Error fetching metrics for ticket ${ticketId}:`, err);
        return { ticketId, fullResolutionMinutes: null, agentWorkTimeSeconds: null, frtSeconds: null };
      }
    });

    const batchResults = await Promise.all(promises);
    for (const r of batchResults) {
      results.set(r.ticketId, {
        fullResolutionMinutes: r.fullResolutionMinutes,
        agentWorkTimeSeconds: r.agentWorkTimeSeconds,
        frtSeconds: r.frtSeconds,
      });
    }

    if (i + batchSize < ticketIds.length) await delay(300);
  }

  return results;
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
    const { weekStart, weekEnd, zdInstance, forceRefresh } = await req.json() as InsightsRequest;

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

    // Check cache first (unless forceRefresh)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('zendesk_insights_cache')
        .select('*')
        .eq('zd_instance', zdInstance)
        .eq('week_start', weekStart)
        .maybeSingle();

      if (cached) {
        // For current week: check if cache is older than 30 minutes
        const now = new Date();
        const weekEndDate = new Date(weekEnd + 'T23:59:59Z');
        const isCurrentWeek = weekEndDate >= now;
        const cacheAge = now.getTime() - new Date(cached.fetched_at).getTime();
        const thirtyMinutes = 30 * 60 * 1000;

        if (!isCurrentWeek || cacheAge < thirtyMinutes) {
          console.log(`Returning cached data for ${zdInstance} week ${weekStart} (age: ${Math.round(cacheAge / 1000)}s)`);
          return new Response(
            JSON.stringify({
              zdInstance,
              weekStart,
              weekEnd,
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

    console.log(`Fetching LIVE insights for ${zdInstance}, week ${weekStart} to ${weekEnd}`);

    // Search all solved tickets in the week
    const query = `type:ticket solved>=${weekStart} solved<=${weekEnd}`;
    const tickets = await searchAllTickets(config, query);
    const validTickets = tickets.filter((t: any) => t.status !== 'deleted');
    const ticketIds = validTickets.map((t: any) => t.id as number);

    console.log(`Found ${validTickets.length} solved tickets for ${zdInstance}`);

    // Fetch metrics and CSAT in parallel
    const [metricsMap, csat] = await Promise.all([
      ticketIds.length > 0 ? fetchTicketMetricsBatch(config, ticketIds) : Promise.resolve(new Map()),
      fetchCSAT(config, weekStart, weekEnd),
    ]);

    // Calculate team-wide averages
    let totalFullRes = 0, fullResCount = 0;
    let totalAgentWork = 0, agentWorkCount = 0;
    let totalFrt = 0, frtCount = 0;

    for (const [_, m] of metricsMap) {
      if (m.fullResolutionMinutes !== null) {
        totalFullRes += m.fullResolutionMinutes;
        fullResCount++;
      }
      if (m.agentWorkTimeSeconds !== null) {
        totalAgentWork += m.agentWorkTimeSeconds;
        agentWorkCount++;
      }
      if (m.frtSeconds !== null) {
        totalFrt += m.frtSeconds;
        frtCount++;
      }
    }

    const avgResolutionTimeSeconds = agentWorkCount > 0 ? Math.round(totalAgentWork / agentWorkCount) : null;
    const fullResolutionTimeMinutes = fullResCount > 0 ? Math.round(totalFullRes / fullResCount) : null;
    const avgFrtSeconds = frtCount > 0 ? Math.round(totalFrt / frtCount) : null;

    console.log(`${zdInstance} results: ART=${avgResolutionTimeSeconds}s, FRT=${fullResolutionTimeMinutes}min, FRT_sec=${avgFrtSeconds}s, CSAT=${csat.score}%, tickets=${validTickets.length}`);

    // Save to cache (upsert by zd_instance + week_start)
    const { error: cacheError } = await supabase
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

    if (cacheError) {
      console.error('Failed to cache insights:', cacheError);
    } else {
      console.log(`Cached insights for ${zdInstance} week ${weekStart}`);
    }

    return new Response(
      JSON.stringify({
        zdInstance,
        weekStart,
        weekEnd,
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
