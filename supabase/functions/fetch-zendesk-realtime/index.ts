import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface ConversationAssignee {
  name: string;
  count: number;
}

interface MessagingStats {
  agentsOnline: number;
  activeConversations: number;
  conversationsInQueue: number;
  assignees: ConversationAssignee[];
}

interface InstanceStats {
  talk: TalkStats;
  messaging: MessagingStats;
}

// ZD1 = customerserviceadvocates, ZD2 = customerserviceadvocates2
const ZD_CONFIGS = [
  { key: 'ZD1', subdomain: 'customerserviceadvocates' },
  { key: 'ZD2', subdomain: 'customerserviceadvocates2' },
];

async function fetchTalkStats(subdomain: string, token: string, email: string): Promise<TalkStats> {
  const headers = {
    'Authorization': `Basic ${btoa(`${email}/token:${token}`)}`,
    'Content-Type': 'application/json',
  };

  const [agentsRes, queueRes] = await Promise.all([
    fetch(`https://${subdomain}.zendesk.com/api/v2/channels/voice/stats/agents_activity.json`, { headers }),
    fetch(`https://${subdomain}.zendesk.com/api/v2/channels/voice/stats/current_queue_activity.json`, { headers }),
  ]);

  let agentsOnline = 0;
  let ongoingCalls = 0;
  if (agentsRes.ok) {
    const data = await agentsRes.json();
    const agents = data.agents_activity || [];
    agentsOnline = agents.filter((a: any) => a.available === true || a.via === 'phone').length;
    ongoingCalls = agents.filter((a: any) => a.via === 'phone' && a.call_status === 'on_call').length;
  } else {
    console.error(`Talk agents_activity failed for ${subdomain}: ${agentsRes.status}`);
    await agentsRes.text(); // consume body
  }

  let callsInQueue = 0;
  let callbacksInQueue = 0;
  if (queueRes.ok) {
    const data = await queueRes.json();
    const queue = data.current_queue_activity || {};
    callsInQueue = queue.calls_waiting || 0;
    callbacksInQueue = queue.callbacks_waiting || 0;
  } else {
    console.error(`Talk queue failed for ${subdomain}: ${queueRes.status}`);
    await queueRes.text();
  }

  return { agentsOnline, ongoingCalls, callsInQueue, callbacksInQueue };
}

async function fetchMessagingStats(
  keyId: string, keySecret: string, appId: string, subdomain: string
): Promise<MessagingStats> {
  const auth = btoa(`${keyId}:${keySecret}`);
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  };

  // Try Zendesk-hosted Sunshine Conversations API first, fall back to smooch.io
  const urls = [
    `https://${subdomain}.zendesk.com/sc/v2/apps/${appId}/conversations?filter[status]=open&page[size]=100`,
    `https://api.smooch.io/v2/apps/${appId}/conversations?filter[status]=open&page[size]=100`,
  ];

  let res: Response | null = null;
  for (const url of urls) {
    console.log(`Trying Sunshine URL: ${url}`);
    res = await fetch(url, { headers });
    if (res.ok) break;
    const errText = await res.text();
    console.error(`Sunshine API failed for ${url}: ${res.status} - ${errText}`);
  }

  if (!res || !res.ok) {
    return { agentsOnline: 0, activeConversations: 0, conversationsInQueue: 0, assignees: [] };
  }

  const data = await res.json();
  const conversations = data.conversations || [];

  // Count per assignee and unassigned (queue)
  const assigneeMap = new Map<string, number>();
  let unassigned = 0;

  for (const conv of conversations) {
    // Check for assignee in participants or metadata
    const assignee = conv.metadata?.assignee || conv.metadata?.agent_name;
    if (assignee) {
      assigneeMap.set(assignee, (assigneeMap.get(assignee) || 0) + 1);
    } else {
      // Check participants for agent type
      const agentParticipant = (conv.participants || []).find(
        (p: any) => p.userExternalId && p.userExternalId !== 'system'
      );
      if (agentParticipant) {
        const name = agentParticipant.userExternalId || 'Unknown';
        assigneeMap.set(name, (assigneeMap.get(name) || 0) + 1);
      } else {
        unassigned++;
      }
    }
  }

  const assignees: ConversationAssignee[] = Array.from(assigneeMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    agentsOnline: assigneeMap.size,
    activeConversations: conversations.length,
    conversationsInQueue: unassigned,
    assignees,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const email = (Deno.env.get('ZENDESK_ADMIN_EMAIL') || '').trim();
    const tokenZD1 = (Deno.env.get('ZENDESK_API_TOKEN_ZD1') || '').trim();

    const sunshineKeyIdZD1 = (Deno.env.get('SUNSHINE_KEY_ID_ZD1') || '').trim();
    const sunshineSecretZD1 = (Deno.env.get('SUNSHINE_KEY_SECRET_ZD1') || '').trim();
    const sunshineAppIdZD1 = (Deno.env.get('SUNSHINE_APP_ID_ZD1') || '').trim();

    const sunshineKeyIdZD2 = (Deno.env.get('SUNSHINE_KEY_ID_ZD2') || '').trim();
    const sunshineSecretZD2 = (Deno.env.get('SUNSHINE_KEY_SECRET_ZD2') || '').trim();
    const sunshineAppIdZD2 = (Deno.env.get('SUNSHINE_APP_ID_ZD2') || '').trim();

    // Debug: log key ID info (length + first/last 4 chars) to diagnose auth issues
    console.log(`SUNSHINE_KEY_ID_ZD1: len=${sunshineKeyIdZD1.length}, start="${sunshineKeyIdZD1.slice(0, 4)}", end="${sunshineKeyIdZD1.slice(-4)}"`);
    console.log(`SUNSHINE_KEY_ID_ZD2: len=${sunshineKeyIdZD2.length}, start="${sunshineKeyIdZD2.slice(0, 4)}", end="${sunshineKeyIdZD2.slice(-4)}"`);
    console.log(`SUNSHINE_APP_ID_ZD1: "${sunshineAppIdZD1}"`);
    console.log(`SUNSHINE_APP_ID_ZD2: "${sunshineAppIdZD2}"`);

    // ZD2 does not have Talk — skip Talk API calls for ZD2
    const talkZD2: TalkStats = { agentsOnline: 0, ongoingCalls: 0, callsInQueue: 0, callbacksInQueue: 0 };

    // Fetch all data in parallel (Talk only for ZD1)
    const [talkZD1, msgZD1, msgZD2] = await Promise.all([
      fetchTalkStats('customerserviceadvocates', tokenZD1, email),
      fetchMessagingStats(sunshineKeyIdZD1, sunshineSecretZD1, sunshineAppIdZD1, 'customerserviceadvocates'),
      fetchMessagingStats(sunshineKeyIdZD2, sunshineSecretZD2, sunshineAppIdZD2, 'customerserviceadvocates2'),
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
