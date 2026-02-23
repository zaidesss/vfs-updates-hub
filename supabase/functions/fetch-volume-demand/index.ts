const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ZendeskConfig {
  subdomain: string;
  token: string;
  email: string;
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

/**
 * Count total results for a Zendesk search query by paginating through all pages.
 * We only need the count, not individual ticket data.
 */
async function countSearchResults(config: ZendeskConfig, query: string): Promise<number> {
  // First page gives us the total count directly
  const url = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&per_page=1&page=1`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Search failed: ${response.status} - ${errorText}`);
    throw new Error(`Zendesk search failed: ${response.status}`);
  }

  const data = await response.json();
  // Zendesk search returns a "count" field with the total number of results
  const total = data.count ?? 0;
  console.log(`Query: "${query}" => count: ${total}`);
  return total;
}

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

    // Run 4 queries in parallel: total, email (tag:emails), chat (tag:chat), call (tag:voice)
    const [total, emailCount, chatCount, callCount] = await Promise.all([
      countSearchResults(config, baseQuery),
      countSearchResults(config, `${baseQuery} tags:emails`),
      countSearchResults(config, `${baseQuery} tags:chat`),
      countSearchResults(config, `${baseQuery} tags:voice`),
    ]);

    return new Response(
      JSON.stringify({
        zdInstance,
        total,
        email: emailCount,
        chat: chatCount,
        call: callCount,
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
