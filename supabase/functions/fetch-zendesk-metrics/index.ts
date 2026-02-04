import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const MINIMUM_DATE = new Date('2026-01-26');
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 5000;
const REQUEST_DELAY_MS = 500;

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

// Fetch Call AHT from Zendesk Talk API using User ID directly
async function fetchCallMetrics(
  config: ZendeskConfig,
  zendeskUserId: string,
  startDate: string,
  endDate: string
): Promise<{ ahtSeconds: number | null; totalCalls: number }> {
  try {
    const startTime = new Date(startDate).toISOString();
    const endTime = new Date(endDate + 'T23:59:59Z').toISOString();
    
    // Try agents_activity endpoint first
    const callsUrl = `https://${config.subdomain}.zendesk.com/api/v2/channels/voice/stats/agents_activity.json?start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`;
    
    const callsResponse = await fetch(callsUrl, {
      headers: {
        'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!callsResponse.ok) {
      console.log(`Talk stats endpoint failed: ${callsResponse.status}, trying calls endpoint...`);
      
      // Try alternative endpoint for call stats
      const altCallsUrl = `https://${config.subdomain}.zendesk.com/api/v2/channels/voice/calls.json?start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`;
      const altResponse = await fetch(altCallsUrl, {
        headers: {
          'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
          'Content-Type': 'application/json',
        },
      });

      if (!altResponse.ok) {
        console.log(`Alternative calls endpoint also failed: ${altResponse.status}`);
        return { ahtSeconds: null, totalCalls: 0 };
      }

      const altData = await altResponse.json();
      const agentCalls = (altData.calls || []).filter((call: any) => 
        String(call.agent_id) === zendeskUserId || String(call.agent?.id) === zendeskUserId
      );

      if (agentCalls.length === 0) {
        console.log(`No calls found for Zendesk User ID ${zendeskUserId}`);
        return { ahtSeconds: null, totalCalls: 0 };
      }

      // Calculate AHT: (talk_time + wrap_up_time) / call_count
      let totalTalkTime = 0;
      let totalWrapUpTime = 0;
      for (const call of agentCalls) {
        totalTalkTime += call.talk_time || call.duration || 0;
        totalWrapUpTime += call.wrap_up_time || 0;
      }

      const ahtSeconds = Math.round((totalTalkTime + totalWrapUpTime) / agentCalls.length);
      console.log(`Found ${agentCalls.length} calls for User ID ${zendeskUserId}, AHT: ${ahtSeconds}s`);
      return { ahtSeconds, totalCalls: agentCalls.length };
    }

    const statsData = await callsResponse.json();
    const agentStats = (statsData.agents_activity || []).find((a: any) => String(a.agent_id) === zendeskUserId);

    if (!agentStats || !agentStats.calls_count) {
      console.log(`No agent stats found for Zendesk User ID ${zendeskUserId}`);
      return { ahtSeconds: null, totalCalls: 0 };
    }

    // Calculate AHT from agent stats
    const avgHandleTime = agentStats.average_handle_time || agentStats.average_talk_time || null;
    console.log(`Found stats for User ID ${zendeskUserId}: ${agentStats.calls_count} calls, AHT: ${avgHandleTime}s`);
    return { 
      ahtSeconds: avgHandleTime ? Math.round(avgHandleTime) : null, 
      totalCalls: agentStats.calls_count || 0 
    };

  } catch (error) {
    console.error(`Error fetching call metrics for Zendesk User ID ${zendeskUserId}:`, error);
    return { ahtSeconds: null, totalCalls: 0 };
  }
}

// Fetch Chat AHT and FRT from Zendesk using User ID
async function fetchChatMetrics(
  config: ZendeskConfig,
  zendeskUserId: string,
  startDate: string,
  endDate: string
): Promise<{ ahtSeconds: number | null; frtSeconds: number | null; totalChats: number }> {
  try {
    // Search for chat tickets solved by this agent using assignee_id
    const query = `type:ticket channel:chat assignee_id:${zendeskUserId} solved>=${startDate} solved<=${endDate}`;
    const searchUrl = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&sort_by=created_at&sort_order=desc`;

    console.log(`Searching chats for User ID ${zendeskUserId}: ${query}`);

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
    const tickets = searchData.results || [];

    console.log(`Found ${tickets.length} chat tickets for User ID ${zendeskUserId}`);

    if (tickets.length === 0) {
      return { ahtSeconds: null, frtSeconds: null, totalChats: 0 };
    }

    let totalFrt = 0;
    let frtCount = 0;
    let totalHandleTime = 0;

    // For a sample of tickets (max 20 to avoid rate limits), fetch detailed metrics
    const sampleTickets = tickets.slice(0, 20);

    for (const ticket of sampleTickets) {
      await delay(100); // Small delay between requests

      try {
        // Fetch ticket metrics for FRT
        const metricsUrl = `https://${config.subdomain}.zendesk.com/api/v2/tickets/${ticket.id}/metrics.json`;
        const metricsResponse = await fetch(metricsUrl, {
          headers: {
            'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
            'Content-Type': 'application/json',
          },
        });

        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          const metrics = metricsData.ticket_metric;

          // First Reply Time
          if (metrics?.reply_time_in_minutes?.calendar) {
            totalFrt += metrics.reply_time_in_minutes.calendar * 60; // Convert to seconds
            frtCount++;
          }

          // Agent handle time (if available)
          if (metrics?.agent_wait_time_in_minutes?.calendar) {
            totalHandleTime += metrics.agent_wait_time_in_minutes.calendar * 60;
          }
        }
      } catch (err) {
        console.log(`Failed to fetch metrics for ticket ${ticket.id}`);
      }
    }

    const avgFrt = frtCount > 0 ? Math.round(totalFrt / frtCount) : null;
    const avgAht = sampleTickets.length > 0 ? Math.round(totalHandleTime / sampleTickets.length) : null;

    console.log(`Chat metrics for User ID ${zendeskUserId}: AHT=${avgAht}s, FRT=${avgFrt}s, total=${tickets.length}`);

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
