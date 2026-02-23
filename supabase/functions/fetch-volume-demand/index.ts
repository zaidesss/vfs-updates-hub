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

/**
 * Count total results for a Zendesk search query.
 */
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

/**
 * Find the oldest ticket matching a query (sorted by created asc, limit 1).
 */
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

    // Base query: unresolved tickets (status < solved) created in date range
    const baseQuery = `type:ticket status<solved created>=${startDate} created<=${endDate}`;

    // Build all queries in parallel:
    // 1) Total + channel counts (4 queries)
    // 2) Per-status counts (4 queries)
    // 3) Per-status oldest ticket (4 queries)
    const promises: Promise<any>[] = [
      // Original channel queries
      countSearchResults(config, baseQuery),                        // 0: total
      countSearchResults(config, `${baseQuery} tags:emails`),       // 1: email
      countSearchResults(config, `${baseQuery} tags:chat`),         // 2: chat
      countSearchResults(config, `${baseQuery} tags:voice`),        // 3: call
    ];

    // Status count queries (no date filter — we want ALL unresolved per status)
    for (const status of STATUS_KEYS) {
      promises.push(countSearchResults(config, `type:ticket status:${status} created>=${startDate} created<=${endDate}`));
    }

    // Oldest ticket per status (no date filter — oldest across all time for that status)
    for (const status of STATUS_KEYS) {
      promises.push(findOldestTicket(config, `type:ticket status:${status}`));
    }

    const results = await Promise.all(promises);

    const statuses: Record<string, { count: number; oldest: OldestTicket | null }> = {};
    STATUS_KEYS.forEach((status, i) => {
      statuses[status] = {
        count: results[4 + i] as number,
        oldest: results[8 + i] as OldestTicket | null,
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
