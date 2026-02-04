import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricsRequest {
  weekStart: string;
  weekEnd: string;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { weekStart, weekEnd, agentEmails } = await req.json() as MetricsRequest;

    if (!weekStart || !weekEnd) {
      return new Response(
        JSON.stringify({ error: 'weekStart and weekEnd are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for cached data first
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

    // TODO: Implement actual Zendesk API calls when needed
    // For now, return empty metrics indicating data needs to be fetched
    // The Zendesk Explore API or Talk Stats API would be called here
    
    // Example structure for future implementation:
    // const zendeskToken = Deno.env.get('ZENDESK_API_TOKEN_ZD1');
    // const zendeskEmail = Deno.env.get('ZENDESK_ADMIN_EMAIL');
    // 
    // Fetch from Zendesk Talk Stats API:
    // GET /api/v2/channels/voice/stats/agents
    // 
    // Fetch from Zendesk Chat API:
    // GET /api/v2/chats (with agent filter)

    console.log(`Zendesk metrics fetch requested for week ${weekStart} to ${weekEnd}`);
    console.log('Note: Actual Zendesk API integration pending');

    return new Response(
      JSON.stringify({ 
        metrics: [],
        message: 'Zendesk API integration pending. Metrics will be populated when API is configured.',
        source: 'pending'
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
