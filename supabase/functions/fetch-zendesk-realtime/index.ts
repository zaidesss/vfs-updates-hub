const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

interface InstanceStats {
  talk: TalkStats;
  messaging: MessagingStats;
}

interface ZendeskConfig {
  subdomain: string;
  token: string;
  email: string;
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
    // DEBUG: Log raw agent data to investigate 0-online issue
    console.log(`[Talk DEBUG ${config.subdomain}] Total agents in response: ${agents.length}`);
    if (agents.length > 0) {
      const statuses = agents.map((a: any) => ({
        name: a.agent_name || a.name,
        available: a.available,
        via: a.via,
        call_status: a.call_status,
        forwarding_number: a.forwarding_number,
      }));
      console.log(`[Talk DEBUG ${config.subdomain}] Agent statuses:`, JSON.stringify(statuses));
    }
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

  console.log(`[Messaging ${config.subdomain}] active=${active}, inQueue=${inQueue}`);

  return {
    activeConversations: active,
    conversationsInQueue: inQueue,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const configZD1 = getZdConfig('ZD1');
    const configZD2 = getZdConfig('ZD2');

    // ZD2 does not have Talk
    const talkZD2: TalkStats = { agentsOnline: 0, ongoingCalls: 0, callsInQueue: 0, callbacksInQueue: 0 };

    const [talkZD1, msgZD1, msgZD2] = await Promise.all([
      fetchTalkStats(configZD1),
      fetchMessagingStats(configZD1),
      fetchMessagingStats(configZD2),
    ]);

    const result = {
      zd1: { talk: talkZD1, messaging: msgZD1 },
      zd2: { talk: talkZD2, messaging: msgZD2 },
      fetchedAt: new Date().toISOString(),
    };

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
