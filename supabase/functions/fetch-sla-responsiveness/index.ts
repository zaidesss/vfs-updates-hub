import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CACHE_KEY = 'sla_responsiveness';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ZendeskConfig {
  subdomain: string;
  token: string;
  email: string;
}

interface OldestTicket {
  id: number;
  created_at: string;
  subject: string;
  age_minutes: number;
}

interface ResolutionData {
  avgFirstReplyMinutes: number | null;
  avgFullResolutionMinutes: number | null;
  distribution: { bucket: string; count: number }[];
}

interface InstanceResult {
  lastHourNew: number;
  lastHourResponded: number;
  remainingYesterday: number;
  totalYesterday: number;
  workedYesterday: number;
  oldestNewTicket: OldestTicket | null;
  resolution: ResolutionData;
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

function authHeaders(config: ZendeskConfig): Record<string, string> {
  return {
    'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
    'Content-Type': 'application/json',
  };
}

async function searchCount(config: ZendeskConfig, query: string): Promise<number> {
  const url = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&per_page=1&page=1`;
  const res = await fetch(url, { headers: authHeaders(config) });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Search count failed [${config.subdomain}]: ${res.status} - ${errText}`);
    return 0;
  }
  const data = await res.json();
  return data.count ?? 0;
}

async function searchOldestNew(config: ZendeskConfig): Promise<OldestTicket | null> {
  const query = 'type:ticket status:new order_by:created_at sort:asc';
  const url = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&per_page=1&page=1`;
  const res = await fetch(url, { headers: authHeaders(config) });
  if (!res.ok) {
    console.error(`Oldest ticket search failed [${config.subdomain}]: ${res.status}`);
    await res.text();
    return null;
  }
  const data = await res.json();
  const results = data.results || [];
  if (results.length === 0) return null;

  const ticket = results[0];
  const createdAt = new Date(ticket.created_at);
  const ageMinutes = Math.round((Date.now() - createdAt.getTime()) / 60000);

  return {
    id: ticket.id,
    created_at: ticket.created_at,
    subject: ticket.subject || '(no subject)',
    age_minutes: ageMinutes,
  };
}

async function fetchResolutionMetrics(config: ZendeskConfig, todayEST?: string): Promise<ResolutionData> {
  const query = todayEST ? `type:ticket status:solved solved>=${todayEST}` : 'type:ticket status:solved solved>=today';
  const url = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&per_page=100&page=1`;
  const res = await fetch(url, { headers: authHeaders(config) });

  if (!res.ok) {
    console.error(`Resolution search failed [${config.subdomain}]: ${res.status}`);
    await res.text();
    return { avgFirstReplyMinutes: null, avgFullResolutionMinutes: null, distribution: [] };
  }

  const data = await res.json();
  let tickets = data.results || [];

  if (data.next_page && tickets.length >= 100) {
    const res2 = await fetch(data.next_page, { headers: authHeaders(config) });
    if (res2.ok) {
      const data2 = await res2.json();
      tickets = tickets.concat(data2.results || []);
    }
  }

  if (tickets.length === 0) {
    return { avgFirstReplyMinutes: null, avgFullResolutionMinutes: null, distribution: [] };
  }

  const ticketIds = tickets.map((t: any) => t.id).slice(0, 200);
  const firstReplyTimes: number[] = [];
  const fullResTimes: number[] = [];

  for (let i = 0; i < ticketIds.length; i += 50) {
    const batch = ticketIds.slice(i, i + 50);
    const metricsPromises = batch.map(async (id: number) => {
      try {
        const mRes = await fetch(
          `https://${config.subdomain}.zendesk.com/api/v2/tickets/${id}/metrics.json`,
          { headers: authHeaders(config) }
        );
        if (!mRes.ok) {
          await mRes.text();
          return null;
        }
        return await mRes.json();
      } catch {
        return null;
      }
    });

    const results = await Promise.all(metricsPromises);
    for (const r of results) {
      if (!r?.ticket_metric) continue;
      const m = r.ticket_metric;
      if (m.reply_time_in_minutes?.calendar != null) {
        firstReplyTimes.push(m.reply_time_in_minutes.calendar);
      }
      if (m.full_resolution_time_in_minutes?.calendar != null) {
        fullResTimes.push(m.full_resolution_time_in_minutes.calendar);
      }
    }
  }

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  const buckets = [
    { label: '<30m', max: 30 },
    { label: '30m–1h', max: 60 },
    { label: '1–2h', max: 120 },
    { label: '2–4h', max: 240 },
    { label: '4h+', max: Infinity },
  ];

  const distribution = buckets.map(b => ({ bucket: b.label, count: 0 }));
  for (const mins of fullResTimes) {
    for (let i = 0; i < buckets.length; i++) {
      if (mins < buckets[i].max || i === buckets.length - 1) {
        distribution[i].count++;
        break;
      }
    }
  }

  return {
    avgFirstReplyMinutes: avg(firstReplyTimes),
    avgFullResolutionMinutes: avg(fullResTimes),
    distribution,
  };
}

async function fetchInstanceData(config: ZendeskConfig, todayEST: string, yesterdayEST: string): Promise<InstanceResult> {
  const [lastHourNew, lastHourResponded, remainingYesterday, totalYesterday, workedYesterday, oldestNewTicket] = await Promise.all([
    searchCount(config, 'type:ticket status:new created>=1hour_ago'),
    searchCount(config, 'type:ticket status>new created>=1hour_ago'),
    searchCount(config, `type:ticket status:new created>=${yesterdayEST} created<${todayEST}`),
    searchCount(config, `type:ticket created>=${yesterdayEST} created<${todayEST}`),
    searchCount(config, `type:ticket status>new created>=${yesterdayEST} created<${todayEST}`),
    searchOldestNew(config),
  ]);

  const resolution = await fetchResolutionMetrics(config, todayEST);

  return {
    lastHourNew,
    lastHourResponded,
    remainingYesterday,
    totalYesterday,
    workedYesterday,
    oldestNewTicket,
    resolution,
  };
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
        console.log(`[sla] Serving from cache (age: ${Math.round(age / 1000)}s)`);
        return new Response(JSON.stringify(cached.data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Cache miss — fetch fresh
    const configZD1 = getZdConfig('ZD1');
    const configZD2 = getZdConfig('ZD2');

    const estNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const todayEST = `${estNow.getFullYear()}-${String(estNow.getMonth()+1).padStart(2,'0')}-${String(estNow.getDate()).padStart(2,'0')}`;
    const estYesterday = new Date(estNow);
    estYesterday.setDate(estYesterday.getDate() - 1);
    const yesterdayEST = `${estYesterday.getFullYear()}-${String(estYesterday.getMonth()+1).padStart(2,'0')}-${String(estYesterday.getDate()).padStart(2,'0')}`;

    const [zd1, zd2] = await Promise.all([
      fetchInstanceData(configZD1, todayEST, yesterdayEST),
      fetchInstanceData(configZD2, todayEST, yesterdayEST),
    ]);

    const result = {
      zd1,
      zd2,
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
    console.error('fetch-sla-responsiveness error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
