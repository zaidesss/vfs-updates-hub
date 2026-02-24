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

async function countSearch(config: ZendeskConfig, query: string): Promise<number> {
  const url = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&per_page=1&page=1`;
  const data = await zdFetch(config, url);
  return data.count ?? 0;
}

interface WeekRange {
  startDate: string;
  endDate: string;
  label: string;
}

interface WeekResult {
  label: string;
  startDate: string;
  endDate: string;
  total: number;
  email: number;
  chat: number;
  call: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zdInstance, weeks } = await req.json() as { zdInstance: 'ZD1' | 'ZD2'; weeks: WeekRange[] };

    if (!zdInstance || !weeks || !Array.isArray(weeks) || weeks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'zdInstance and weeks[] are required' }),
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

    console.log(`Fetching volume comparison for ${zdInstance}, ${weeks.length} weeks`);

    // For each week, we need 4 queries: total, email, chat, voice
    // All tickets created in that week (any status including solved/closed)
    const promises: Promise<number>[] = [];

    for (const week of weeks) {
      const base = `type:ticket created>=${week.startDate} created<=${week.endDate}`;
      promises.push(
        countSearch(config, base),
        countSearch(config, `${base} tags:emails`),
        countSearch(config, `${base} tags:chat`),
        countSearch(config, `${base} tags:voice`),
      );
    }

    const results = await Promise.all(promises);

    const weekResults: WeekResult[] = weeks.map((week, i) => ({
      label: week.label,
      startDate: week.startDate,
      endDate: week.endDate,
      total: results[i * 4],
      email: results[i * 4 + 1],
      chat: results[i * 4 + 2],
      call: results[i * 4 + 3],
    }));

    return new Response(
      JSON.stringify({ zdInstance, weeks: weekResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-volume-comparison:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
