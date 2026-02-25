const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    throw new Error(`Zendesk search failed: ${res.status}`);
  }
  const data = await res.json();
  return data.count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zdInstance, date } = await req.json();

    if (!zdInstance || !date) {
      return new Response(
        JSON.stringify({ error: 'zdInstance and date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (zdInstance !== 'ZD1' && zdInstance !== 'ZD2') {
      return new Response(
        JSON.stringify({ error: 'zdInstance must be ZD1 or ZD2' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = getZdConfig(zdInstance);

    if (!config.token || !config.email) {
      return new Response(
        JSON.stringify({ error: `Zendesk credentials not configured for ${zdInstance}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query with NO status filter → includes solved + closed
    const query = `type:ticket tags:voice created:${date}`;
    console.log(`[zd-count-voice-tags] ${zdInstance} query: "${query}"`);

    const totalVoiceTagged = await searchCount(config, query);

    console.log(`[zd-count-voice-tags] ${zdInstance} ${date} → ${totalVoiceTagged} voice-tagged tickets`);

    return new Response(
      JSON.stringify({ zdInstance, date, totalVoiceTagged }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('zd-count-voice-tags error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
