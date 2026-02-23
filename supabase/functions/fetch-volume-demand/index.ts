const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ZendeskConfig {
  subdomain: string;
  token: string;
  email: string;
}

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

async function zdFetch(config: ZendeskConfig, url: string) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Zendesk API failed: ${response.status} - ${errorText}`);
    throw new Error(`Zendesk API failed: ${response.status}`);
  }
  return response.json();
}

async function countSearchResults(config: ZendeskConfig, query: string): Promise<number> {
  const url = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&per_page=1&page=1`;
  const data = await zdFetch(config, url);
  const total = data.count ?? 0;
  console.log(`Query: "${query}" => count: ${total}`);
  return total;
}

interface OldestTicket {
  id: number;
  created_at: string;
}

async function findOldestTicket(config: ZendeskConfig, query: string): Promise<OldestTicket | null> {
  const url = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&sort_by=created_at&sort_order=asc&per_page=1&page=1`;
  const data = await zdFetch(config, url);
  if (data.results && data.results.length > 0) {
    const ticket = data.results[0];
    return { id: ticket.id, created_at: ticket.created_at };
  }
  return null;
}

const STATUS_KEYS = ['new', 'open', 'pending', 'hold'] as const;
const CHANNEL_TAGS = ['emails', 'chat', 'voice'] as const;
const CHANNEL_NAMES = ['email', 'chat', 'call'] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zdInstance, startDate, endDate } = await req.json();

    if (!zdInstance || !startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: 'zdInstance, startDate, and endDate are required' }),
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

    console.log(`Fetching volume demand for ${zdInstance}, ${startDate} to ${endDate}`);

    const baseQuery = `type:ticket status<solved created>=${startDate} created<=${endDate}`;

    const promises: Promise<any>[] = [
      // [0-3] Total + channel counts
      countSearchResults(config, baseQuery),
      countSearchResults(config, `${baseQuery} tags:emails`),
      countSearchResults(config, `${baseQuery} tags:chat`),
      countSearchResults(config, `${baseQuery} tags:voice`),
    ];

    // [4-7] Per-status total counts
    for (const status of STATUS_KEYS) {
      promises.push(countSearchResults(config, `type:ticket status:${status} created>=${startDate} created<=${endDate}`));
    }

    // [8-19] Per-status per-channel counts (4×3)
    for (const status of STATUS_KEYS) {
      for (const tag of CHANNEL_TAGS) {
        promises.push(countSearchResults(config, `type:ticket status:${status} tags:${tag} created>=${startDate} created<=${endDate}`));
      }
    }

    // [20-31] Per-status per-channel oldest tickets (4×3)
    for (const status of STATUS_KEYS) {
      for (const tag of CHANNEL_TAGS) {
        promises.push(findOldestTicket(config, `type:ticket status:${status} tags:${tag}`));
      }
    }

    const results = await Promise.all(promises);

    const statuses: Record<string, any> = {};
    STATUS_KEYS.forEach((status, si) => {
      const countBase = 8 + si * 3;
      const oldestBase = 20 + si * 3;
      const channels: Record<string, any> = {};
      CHANNEL_NAMES.forEach((ch, ci) => {
        channels[ch] = {
          count: results[countBase + ci] as number,
          oldest: results[oldestBase + ci] as OldestTicket | null,
        };
      });
      statuses[status] = {
        count: results[4 + si] as number,
        channels,
      };
    });

    return new Response(
      JSON.stringify({
        zdInstance,
        total: results[0],
        email: results[1],
        chat: results[2],
        call: results[3],
        statuses,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-volume-demand:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
