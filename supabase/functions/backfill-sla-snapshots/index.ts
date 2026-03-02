import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

function authHeaders(config: ZendeskConfig): Record<string, string> {
  return {
    'Authorization': `Basic ${btoa(`${config.email}/token:${config.token}`)}`,
    'Content-Type': 'application/json',
  };
}

async function searchCount(config: ZendeskConfig, query: string): Promise<number> {
  const url = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&per_page=1`;
  console.log(`Search: ${config.subdomain} query="${query}"`);
  const res = await fetch(url, { headers: authHeaders(config) });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Search failed [${config.subdomain}]: ${res.status} - ${errText}`);
    return 0;
  }
  const data = await res.json();
  console.log(`Search result: count=${data.count}`);
  return data.count ?? 0;
}

async function fetchResolutionForDay(config: ZendeskConfig, date: string, nextDate: string) {
  const query = `type:ticket status>=solved solved>=${date} solved<${nextDate}`;
  const url = `https://${config.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&per_page=100`;
  const res = await fetch(url, { headers: authHeaders(config) });
  if (!res.ok) { await res.text(); return { avg_first: null, avg_full: null, distribution: [] }; }

  const data = await res.json();
  let tickets = data.results || [];

  if (data.next_page && tickets.length >= 100) {
    const res2 = await fetch(data.next_page, { headers: authHeaders(config) });
    if (res2.ok) { const d2 = await res2.json(); tickets = tickets.concat(d2.results || []); }
  }

  if (tickets.length === 0) return { avg_first: null, avg_full: null, distribution: [] };

  const firstReplyTimes: number[] = [];
  const fullResTimes: number[] = [];
  const ticketIds = tickets.map((t: any) => t.id).slice(0, 200);

  for (let i = 0; i < ticketIds.length; i += 50) {
    const batch = ticketIds.slice(i, i + 50);
    const results = await Promise.all(batch.map(async (id: number) => {
      try {
        const mRes = await fetch(`https://${config.subdomain}.zendesk.com/api/v2/tickets/${id}/metrics.json`, { headers: authHeaders(config) });
        if (!mRes.ok) { await mRes.text(); return null; }
        return await mRes.json();
      } catch { return null; }
    }));
    for (const r of results) {
      if (!r?.ticket_metric) continue;
      const m = r.ticket_metric;
      if (m.reply_time_in_minutes?.calendar != null) firstReplyTimes.push(m.reply_time_in_minutes.calendar);
      if (m.full_resolution_time_in_minutes?.calendar != null) fullResTimes.push(m.full_resolution_time_in_minutes.calendar);
    }
    // Rate limit pause between batches
    if (i + 50 < ticketIds.length) await new Promise(r => setTimeout(r, 1000));
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
    for (let j = 0; j < buckets.length; j++) {
      if (mins < buckets[j].max || j === buckets.length - 1) { distribution[j].count++; break; }
    }
  }

  return { avg_first: avg(firstReplyTimes), avg_full: avg(fullResTimes), distribution };
}

async function backfillDay(config: ZendeskConfig, instance: string, date: string, nextDate: string, supabase: any): Promise<string> {
  const [totalNew, totalResponded, remaining] = await Promise.all([
    searchCount(config, `type:ticket created>=${date} created<${nextDate}`),
    searchCount(config, `type:ticket status>new created>=${date} created<${nextDate}`),
    searchCount(config, `type:ticket status:new created>=${date} created<${nextDate}`),
  ]);

  const resolution = await fetchResolutionForDay(config, date, nextDate);

  const { error } = await supabase.from('sla_daily_snapshots').upsert({
    date,
    zd_instance: instance,
    total_new: totalNew,
    total_responded: totalResponded,
    remaining_unanswered: remaining,
    avg_first_reply_minutes: resolution.avg_first,
    avg_full_resolution_minutes: resolution.avg_full,
    distribution: resolution.distribution,
  }, { onConflict: 'date,zd_instance' });

  if (error) console.error(`Insert error for ${instance} ${date}:`, error.message);
  return `${instance} ${date}: new=${totalNew} resp=${totalResponded} rem=${remaining}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function getESTToday(): string {
  const now = new Date();
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return `${est.getFullYear()}-${String(est.getMonth() + 1).padStart(2, '0')}-${String(est.getDate()).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const startDate = body.start_date || '2026-02-26';
    const todayEST = getESTToday();
    // Backfill up to yesterday
    const endDate = body.end_date || addDays(todayEST, -1);

    const configZD1 = getZdConfig('ZD1');
    const configZD2 = getZdConfig('ZD2');

    const logs: string[] = [];
    let current = startDate;

    while (current <= endDate) {
      const next = addDays(current, 1);
      console.log(`Backfilling ${current}...`);

      // Process both instances for this day
      const [log1, log2] = await Promise.all([
        backfillDay(configZD1, 'ZD1', current, next, supabase),
        backfillDay(configZD2, 'ZD2', current, next, supabase),
      ]);
      logs.push(log1, log2);

      current = next;
      // Rate limit: pause 2s between days
      if (current <= endDate) await new Promise(r => setTimeout(r, 2000));
    }

    return new Response(JSON.stringify({ success: true, days_processed: logs.length / 2, logs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
