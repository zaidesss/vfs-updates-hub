import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CACHE_KEY = 'realtime';
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

interface TalkStats {
  agentsOnline: number;
  ongoingCalls: number;
  callsInQueue: number;
  callbacksInQueue: number;
}

interface MessagingStats {
  activeConversations: number;
  conversationsInQueue: number;
}

interface ZendeskConfig {
  subdomain: string;
  token: string;
  email: string;
}

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

function getZdConfig(instance: 'ZD1' | 'ZD2'): ZendeskConfig {
  const token = (Deno.env.get(instance === 'ZD1' ? 'ZENDESK_API_TOKEN_ZD1' : 'ZENDESK_API_TOKEN_ZD2') || '').trim();
  const email = (Deno.env.get('ZENDESK_ADMIN_EMAIL') || '').trim();
  const subdomain = instance === 'ZD1' ? 'customerserviceadvocates' : 'customerserviceadvocateshelp';
  return { subdomain, token, email };
}

async function fetchTalkStats(config: ZendeskConfig): Promise<TalkStats> {
  const headers = {
    'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
    'Content-Type': 'application/json',
  };

  const [agentsRes, queueRes] = await Promise.all([
    fetch(`https://${config.subdomain}.zendesk.com/api/v2/channels/voice/stats/agents_activity.json`, { headers }),
    fetch(`https://${config.subdomain}.zendesk.com/api/v2/channels/voice/stats/current_queue_activity.json`, { headers }),
  ]);

  let agentsOnline = 0;
  let ongoingCalls = 0;
  if (agentsRes.ok) {
    const data = await agentsRes.json();
    const agents = data.agents_activity || [];
    agentsOnline = agents.filter((a: any) => a.available === true || a.via === 'phone').length;
    ongoingCalls = agents.filter((a: any) => a.via === 'phone' && a.call_status === 'on_call').length;
  } else {
    console.error(`Talk agents_activity failed for ${config.subdomain}: ${agentsRes.status}`);
    await agentsRes.text();
  }

  let callsInQueue = 0;
  let callbacksInQueue = 0;
  if (queueRes.ok) {
    const data = await queueRes.json();
    const queue = data.current_queue_activity || {};
    callsInQueue = queue.calls_waiting || 0;
    callbacksInQueue = queue.callbacks_waiting || 0;
  } else {
    console.error(`Talk queue failed for ${config.subdomain}: ${queueRes.status}`);
    await queueRes.text();
  }

  return { agentsOnline, ongoingCalls, callsInQueue, callbacksInQueue };
}

async function searchCount(config: ZendeskConfig, query: string): Promise<number> {
  const url = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&per_page=1&page=1`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Search failed for ${config.subdomain}: ${res.status} - ${errText}`);
    return 0;
  }
  const data = await res.json();
  return data.count ?? 0;
}

async function fetchMessagingStats(config: ZendeskConfig): Promise<MessagingStats> {
  const [active, inQueue] = await Promise.all([
    searchCount(config, 'type:ticket status<solved channel:messaging'),
    searchCount(config, 'type:ticket status:new channel:messaging'),
  ]);

  return {
    activeConversations: active,
    conversationsInQueue: inQueue,
  };
}

interface OpenTicketAgent {
  name: string;
  count: number;
}

interface OpenTicketsData {
  total: number;
  byAgent: OpenTicketAgent[];
}

async function fetchOpenTicketsFromView(
  config: ZendeskConfig,
  viewId: string,
  customFieldId: string
): Promise<OpenTicketsData> {
  const url = `https://${config.subdomain}.zendesk.com/api/v2/views/${viewId}/execute.json?per_page=100`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`View execute failed for ${config.subdomain} view ${viewId}: ${res.status} - ${errText}`);
    return { total: 0, byAgent: [] };
  }

  const data = await res.json();
  const rows = data.rows || [];
  const total = data.count ?? rows.length;

  // Group by agent name from custom field
  const agentMap = new Map<string, number>();
  for (const row of rows) {
    const ticket = row.ticket || row;
    const customFields = ticket.custom_fields || [];
    const field = customFields.find((f: any) => String(f.id) === customFieldId);
    const agentName = field?.value || 'Unassigned';
    agentMap.set(agentName, (agentMap.get(agentName) || 0) + 1);
  }

  const byAgent: OpenTicketAgent[] = Array.from(agentMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return { total, byAgent };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = getSupabaseClient();

    // Check cache first
    const { data: cached } = await sb
      .from('zendesk_cache')
      .select('data, fetched_at')
      .eq('cache_key', CACHE_KEY)
      .single();

    if (cached?.fetched_at) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age < CACHE_TTL_MS) {
        console.log(`[realtime] Serving from cache (age: ${Math.round(age / 1000)}s)`);
        return new Response(JSON.stringify(cached.data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Cache miss or stale — fetch fresh
    const configZD1 = getZdConfig('ZD1');
    const configZD2 = getZdConfig('ZD2');

    const estNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const todayEST = `${estNow.getFullYear()}-${String(estNow.getMonth()+1).padStart(2,'0')}-${String(estNow.getDate()).padStart(2,'0')}`;

    const talkZD2: TalkStats = { agentsOnline: 0, ongoingCalls: 0, callsInQueue: 0, callbacksInQueue: 0 };

    const [talkZD1, msgZD1, msgZD2, newTicketsZD1, newTicketsZD2, totalTodayZD1, totalTodayZD2, openZD1, openZD2] = await Promise.all([
      fetchTalkStats(configZD1),
      fetchMessagingStats(configZD1),
      fetchMessagingStats(configZD2),
      searchCount(configZD1, `type:ticket status:new created>=${todayEST}`),
      searchCount(configZD2, `type:ticket status:new created>=${todayEST}`),
      searchCount(configZD1, `type:ticket created>=${todayEST}`),
      searchCount(configZD2, `type:ticket created>=${todayEST}`),
      fetchOpenTicketsFromView(configZD1, '55735766685081', '14923047306265'),
      fetchOpenTicketsFromView(configZD2, '55551228002585', '44524282221593'),
    ]);

    const result = {
      zd1: { talk: talkZD1, messaging: msgZD1, newTickets: newTicketsZD1, totalTicketsToday: totalTodayZD1, openTickets: openZD1 },
      zd2: { talk: talkZD2, messaging: msgZD2, newTickets: newTicketsZD2, totalTicketsToday: totalTodayZD2, openTickets: openZD2 },
      fetchedAt: new Date().toISOString(),
    };

    // Upsert cache
    await sb.from('zendesk_cache').upsert({
      cache_key: CACHE_KEY,
      data: result,
      fetched_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('fetch-zendesk-realtime error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
