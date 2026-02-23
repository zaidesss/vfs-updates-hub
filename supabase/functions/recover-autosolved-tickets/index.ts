import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ZD_INSTANCES = [
  {
    key: 'customerserviceadvocates',
    subdomain: 'customerserviceadvocates',
    tokenEnv: 'ZENDESK_API_TOKEN_ZD1',
    agentFieldId: 14923047306265,
  },
  {
    key: 'customerserviceadvocateshelp',
    subdomain: 'customerserviceadvocateshelp',
    tokenEnv: 'ZENDESK_API_TOKEN_ZD2',
    agentFieldId: 44524282221593,
  },
]

interface ZendeskTicket {
  id: number
  updated_at: string
  custom_fields: { id: number; value: string | null }[]
  tags: string[]
}

async function searchZendesk(
  subdomain: string,
  authHeader: string,
  query: string,
): Promise<ZendeskTicket[]> {
  const allTickets: ZendeskTicket[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const url = `https://${subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&page=${page}&per_page=100`
    console.log(`Fetching page ${page} from ${subdomain}...`)

    const res = await fetch(url, {
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`Zendesk search error (${subdomain} p${page}): ${res.status} ${errText}`)
      // If rate limited, wait and retry
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '10', 10)
        console.log(`Rate limited. Waiting ${retryAfter}s...`)
        await new Promise((r) => setTimeout(r, retryAfter * 1000))
        continue
      }
      throw new Error(`Zendesk API error: ${res.status}`)
    }

    const data = await res.json()
    const results = (data.results || []) as ZendeskTicket[]
    allTickets.push(...results)
    console.log(`Page ${page}: got ${results.length} tickets (total so far: ${allTickets.length})`)

    // Zendesk search paginates up to 1000 results max
    if (results.length < 100 || allTickets.length >= (data.count || 0)) {
      hasMore = false
    } else {
      page++
      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  return allTickets
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const adminEmail = Deno.env.get('ZENDESK_ADMIN_EMAIL')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (!adminEmail) {
      return new Response(JSON.stringify({ error: 'Missing ZENDESK_ADMIN_EMAIL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Pre-load agent directory for email lookups
    const { data: agentDir } = await supabase
      .from('agent_directory')
      .select('agent_tag, email')
    const agentMap = new Map<string, string>()
    for (const a of agentDir || []) {
      if (a.agent_tag) agentMap.set(a.agent_tag.toLowerCase(), a.email)
    }
    console.log(`Loaded ${agentMap.size} agents from directory`)

    const summary = {
      totalFound: 0,
      inserted: 0,
      skippedDuplicate: 0,
      skippedNoAgent: 0,
      errors: 0,
      byInstance: {} as Record<string, { found: number; inserted: number }>,
    }

    for (const instance of ZD_INSTANCES) {
      const apiToken = Deno.env.get(instance.tokenEnv)
      if (!apiToken) {
        console.error(`Missing token for ${instance.key}, skipping`)
        continue
      }

      const authHeader = 'Basic ' + btoa(`${adminEmail}/token:${apiToken}`)
      const query = 'type:ticket tags:chat_autosolved created>2025-02-09'

      console.log(`\n=== Searching ${instance.key} ===`)
      const tickets = await searchZendesk(instance.subdomain, authHeader, query)
      console.log(`Found ${tickets.length} auto-solved tickets in ${instance.key}`)

      summary.totalFound += tickets.length
      summary.byInstance[instance.key] = { found: tickets.length, inserted: 0 }

      // Process in batches of 50
      const batchSize = 50
      for (let i = 0; i < tickets.length; i += batchSize) {
        const batch = tickets.slice(i, i + batchSize)
        const rows = []

        for (const ticket of batch) {
          // Extract agent tag from custom field
          const agentField = ticket.custom_fields?.find((f) => f.id === instance.agentFieldId)
          const agentTag = agentField?.value || null

          if (!agentTag) {
            summary.skippedNoAgent++
            continue
          }

          // Look up email
          const agentEmail = agentMap.get(agentTag.toLowerCase()) || null

          rows.push({
            zd_instance: instance.key,
            ticket_id: String(ticket.id),
            status: 'solved',
            timestamp: ticket.updated_at,
            ticket_type: 'Chat',
            agent_name: agentTag,
            agent_email: agentEmail,
            is_ot: false,
            is_autosolved: true,
          })
        }

        if (rows.length === 0) continue

        // Check for existing tickets to skip duplicates
        const ticketIds = rows.map((r) => r.ticket_id)
        const { data: existing } = await supabase
          .from('ticket_logs')
          .select('ticket_id')
          .eq('zd_instance', instance.key)
          .eq('ticket_type', 'Chat')
          .in('ticket_id', ticketIds)

        const existingSet = new Set((existing || []).map((e: any) => e.ticket_id))
        const newRows = rows.filter((r) => !existingSet.has(r.ticket_id))
        const dupes = rows.length - newRows.length
        summary.skippedDuplicate += dupes

        if (newRows.length > 0) {
          const { error } = await supabase.from('ticket_logs').insert(newRows)
          if (error) {
            console.error(`Insert error batch ${i}: ${error.message}`)
            summary.errors += newRows.length
          } else {
            summary.inserted += newRows.length
            summary.byInstance[instance.key].inserted += newRows.length
          }
        }

        console.log(`Batch ${i}-${i + batchSize}: ${newRows.length} inserted, ${dupes} dupes skipped`)
      }
    }

    console.log('\n=== RECOVERY COMPLETE ===')
    console.log(JSON.stringify(summary, null, 2))

    return new Response(JSON.stringify({ success: true, summary }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Recovery error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
