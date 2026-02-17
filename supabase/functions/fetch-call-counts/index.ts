import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INCREMENTAL_API_DELAY_MS = 6000; // 10 req/min rate limit
const EXCLUDED_COMPLETION_STATUSES = ['agent_missed', 'agent_declined', 'agent_transfer_declined'];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface LegRecord {
  id: string | number;
  agent_id: string | number;
  talk_time: number;
  type: string;
  completion_status?: string;
  updated_at?: string;
  created_at?: string;
}

// Format a UTC timestamp as EST date string (YYYY-MM-DD)
function toESTDate(timestamp: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));
}

// Get current date in EST
function getESTToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Get rolling 2-week window start (previous week Monday)
function getRollingStartDate(): string {
  const now = new Date();
  const estDateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now);

  const parts: Record<string, string> = {};
  for (const p of estDateStr) parts[p.type] = p.value;

  const weekdayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };

  const today = new Date(parseInt(parts.year), parseInt(parts.month) - 1, parseInt(parts.day));
  const dow = weekdayMap[parts.weekday] || 0;
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysFromMonday);
  const prevMonday = new Date(currentMonday);
  prevMonday.setDate(currentMonday.getDate() - 7);

  const y = prevMonday.getFullYear();
  const m = String(prevMonday.getMonth() + 1).padStart(2, '0');
  const d = String(prevMonday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Paginate through Zendesk Talk Incremental Legs API
async function paginateIncrementalLegs(
  subdomain: string,
  token: string,
  email: string,
  startEpoch: number,
  endEpoch: number
): Promise<LegRecord[]> {
  const allLegs: LegRecord[] = [];
  let currentStartTime = startEpoch;
  let pageCount = 0;
  const maxPages = 30;
  let lastEndTime = -1;

  while (pageCount < maxPages) {
    pageCount++;
    const url = `https://${subdomain}.zendesk.com/api/v2/channels/voice/stats/incremental/legs.json?start_time=${currentStartTime}`;
    console.log(`Fetching legs page ${pageCount}: start_time=${currentStartTime}`);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${btoa(`${email}/token:${token}`)}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Legs API failed: ${response.status} ${response.statusText}`);
        break;
      }

      const data = await response.json();
      const legs = data.legs || [];
      allLegs.push(...legs);

      console.log(`Page ${pageCount}: ${legs.length} legs, total: ${allLegs.length}, end_time: ${data.end_time}`);

      if (!data.end_time || data.end_time >= endEpoch || legs.length === 0) {
        break;
      }

      // Detect stuck pagination (end_time not advancing)
      if (data.end_time === lastEndTime) {
        console.log(`Pagination stuck at end_time=${data.end_time}, breaking`);
        break;
      }
      lastEndTime = data.end_time;

      currentStartTime = data.end_time;
      await delay(INCREMENTAL_API_DELAY_MS);
    } catch (error) {
      console.error(`Error fetching legs page ${pageCount}:`, error);
      break;
    }
  }

  console.log(`Total legs fetched: ${allLegs.length}`);
  return allLegs;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let targetDate: string | null = null;
    let backfill = false;
    try {
      const body = await req.json();
      targetDate = body.date || null;
      backfill = body.backfill === true;
    } catch {
      // No body or invalid JSON, use defaults
    }

    const today = getESTToday();

    // Determine date range to fetch
    let startDate: string;
    let endDate: string;

    if (backfill) {
      // Backfill the entire rolling 2-week window
      startDate = getRollingStartDate();
      endDate = today;
      console.log(`Backfill mode: ${startDate} to ${endDate}`);
    } else if (targetDate) {
      startDate = targetDate;
      endDate = targetDate;
      console.log(`Single date mode: ${targetDate}`);
    } else {
      // Default: fetch today only
      startDate = today;
      endDate = today;
      console.log(`Default mode (today): ${today}`);
    }

    // Convert to epoch for the API
    // Start: midnight EST of startDate = startDate + T05:00:00Z (EST = UTC-5)
    const startEpoch = Math.floor(new Date(`${startDate}T05:00:00.000Z`).getTime() / 1000);
    // End: end of endDate in EST = next day T04:59:59Z
    const endDateObj = new Date(`${endDate}T05:00:00.000Z`);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const endEpoch = Math.floor(endDateObj.getTime() / 1000);

    console.log(`Epoch range: ${startEpoch} to ${endEpoch}`);

    // Fetch ZD1 agents with zendesk_user_id
    // agent_profiles stores 'ZD1', ticket_logs uses 'customerserviceadvocates'
    const { data: agents, error: agentsError } = await supabase
      .from('agent_profiles')
      .select('email, agent_tag, zendesk_user_id, zendesk_instance')
      .eq('zendesk_instance', 'ZD1')
      .not('zendesk_user_id', 'is', null)
      .not('agent_tag', 'is', null);

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch agents', details: agentsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!agents || agents.length === 0) {
      console.log('No ZD1 agents with zendesk_user_id found');
      return new Response(
        JSON.stringify({ success: true, message: 'No eligible agents', upserted: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${agents.length} ZD1 agents with zendesk_user_id`);

    // Build a map of zendesk_user_id -> agent info
    const agentMap = new Map<string, { email: string; agent_tag: string }>();
    for (const agent of agents) {
      agentMap.set(String(agent.zendesk_user_id), {
        email: agent.email,
        agent_tag: agent.agent_tag,
      });
    }

    // Fetch all legs from the Talk API (single pagination for all agents)
    const zd1Token = Deno.env.get('ZENDESK_API_TOKEN_ZD1')!;
    const zdEmail = Deno.env.get('ZENDESK_ADMIN_EMAIL')!;

    const allLegs = await paginateIncrementalLegs(
      'customerserviceadvocates',
      zd1Token,
      zdEmail,
      startEpoch,
      endEpoch
    );

    // Filter and group legs by agent + date (EST)
    // counts: { "agent_email::date" -> count }
    const counts = new Map<string, { email: string; agent_name: string; date: string; count: number }>();

    for (const leg of allLegs) {
      const agentIdStr = String(leg.agent_id);
      const agentInfo = agentMap.get(agentIdStr);
      if (!agentInfo) continue;

      // Only agent-type legs, excluding missed/declined
      if (leg.type !== 'agent') continue;
      if (EXCLUDED_COMPLETION_STATUSES.includes(leg.completion_status || '')) continue;

      // Determine date in EST
      const legTimestamp = leg.updated_at || leg.created_at;
      if (!legTimestamp) continue;

      const estDate = toESTDate(legTimestamp);

      // Only count if within our date range
      if (estDate < startDate || estDate > endDate) continue;

      const key = `${agentInfo.email}::${estDate}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        counts.set(key, {
          email: agentInfo.email,
          agent_name: agentInfo.agent_tag,
          date: estDate,
          count: 1,
        });
      }
    }

    console.log(`Grouped into ${counts.size} agent-date combinations`);

    // Also ensure agents with 0 calls for today get a record (so dashboard shows 0 not blank)
    if (!backfill) {
      for (const [_, agentInfo] of agentMap) {
        const key = `${agentInfo.email}::${startDate}`;
        if (!counts.has(key)) {
          counts.set(key, {
            email: agentInfo.email,
            agent_name: agentInfo.agent_tag,
            date: startDate,
            count: 0,
          });
        }
      }
    }

    // Upsert into call_count_daily
    const upsertRows = Array.from(counts.values()).map(c => ({
      agent_email: c.email,
      agent_name: c.agent_name,
      date: c.date,
      call_count: c.count,
      fetched_at: new Date().toISOString(),
    }));

    if (upsertRows.length > 0) {
      // Batch upsert in chunks of 100
      const CHUNK_SIZE = 100;
      let totalUpserted = 0;

      for (let i = 0; i < upsertRows.length; i += CHUNK_SIZE) {
        const chunk = upsertRows.slice(i, i + CHUNK_SIZE);
        const { error: upsertError } = await supabase
          .from('call_count_daily')
          .upsert(chunk, { onConflict: 'agent_email,date' });

        if (upsertError) {
          console.error(`Upsert error (chunk ${i}):`, upsertError);
        } else {
          totalUpserted += chunk.length;
        }
      }

      console.log(`Upserted ${totalUpserted} call count records`);

      return new Response(
        JSON.stringify({
          success: true,
          agentsProcessed: agents.length,
          totalLegs: allLegs.length,
          upserted: totalUpserted,
          dateRange: { start: startDate, end: endDate },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'No data to upsert', upserted: 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('fetch-call-counts error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
