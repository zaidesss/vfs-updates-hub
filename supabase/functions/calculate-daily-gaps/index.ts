import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get yesterday's date (or a specific date from request)
    const body = await req.json().catch(() => ({}))
    const targetDate = body.date || new Date(Date.now() - 86400000).toISOString().split('T')[0]

    console.log('Calculating gaps for date:', targetDate)

    // Get all unique agents with tickets on that date
    const startOfDay = `${targetDate}T00:00:00.000Z`
    const endOfDay = `${targetDate}T23:59:59.999Z`

    const { data: ticketLogs, error: logsError } = await supabase
      .from('ticket_logs')
      .select('agent_name, agent_email, timestamp')
      .gte('timestamp', startOfDay)
      .lte('timestamp', endOfDay)
      .order('agent_name')
      .order('timestamp', { ascending: true })

    if (logsError) {
      console.error('Error fetching ticket logs:', logsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch ticket logs', details: logsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!ticketLogs || ticketLogs.length === 0) {
      console.log('No tickets found for date:', targetDate)
      return new Response(
        JSON.stringify({ success: true, message: 'No tickets to process', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get active agents from agent_profiles
    const { data: activeProfiles } = await supabase
      .from('agent_profiles')
      .select('email, employment_status')
      .eq('employment_status', 'Active')

    const activeEmails = new Set((activeProfiles || []).map(p => p.email?.toLowerCase()))

    // Group tickets by agent
    const agentTickets: Record<string, { email: string | null; timestamps: number[] }> = {}
    
    for (const log of ticketLogs) {
      if (!agentTickets[log.agent_name]) {
        agentTickets[log.agent_name] = { email: log.agent_email, timestamps: [] }
      }
      agentTickets[log.agent_name].timestamps.push(new Date(log.timestamp).getTime())
    }

    const results: { agent: string; gaps: number }[] = []

    // Calculate gaps for each agent
    for (const [agentName, data] of Object.entries(agentTickets)) {
      // Check if agent is active (by matching email)
      const agentEmail = data.email?.toLowerCase()
      if (agentEmail && !activeEmails.has(agentEmail)) {
        console.log(`Skipping gap calculation for inactive agent: ${agentName}`)
        continue
      }

      const timestamps = data.timestamps.sort((a, b) => a - b)
      const ticketCount = timestamps.length

      if (ticketCount < 2) {
        // Not enough tickets to calculate gaps
        const { error } = await supabase
          .from('ticket_gap_daily')
          .upsert({
            date: targetDate,
            agent_name: agentName,
            agent_email: data.email,
            ticket_count: ticketCount,
            total_gap_seconds: 0,
            avg_gap_seconds: 0,
            min_gap_seconds: null,
            max_gap_seconds: null,
          }, { onConflict: 'date,agent_name' })

        if (error) console.error(`Error upserting gap for ${agentName}:`, error)
        results.push({ agent: agentName, gaps: 0 })
        continue
      }

      // Calculate gaps between consecutive tickets
      const gaps: number[] = []
      for (let i = 1; i < timestamps.length; i++) {
        const gapSeconds = Math.floor((timestamps[i] - timestamps[i - 1]) / 1000)
        gaps.push(gapSeconds)
      }

      const totalGapSeconds = gaps.reduce((sum, g) => sum + g, 0)
      const avgGapSeconds = Math.floor(totalGapSeconds / gaps.length)
      const minGapSeconds = Math.min(...gaps)
      const maxGapSeconds = Math.max(...gaps)

      // Upsert gap record
      const { error } = await supabase
        .from('ticket_gap_daily')
        .upsert({
          date: targetDate,
          agent_name: agentName,
          agent_email: data.email,
          ticket_count: ticketCount,
          total_gap_seconds: totalGapSeconds,
          avg_gap_seconds: avgGapSeconds,
          min_gap_seconds: minGapSeconds,
          max_gap_seconds: maxGapSeconds,
        }, { onConflict: 'date,agent_name' })

      if (error) {
        console.error(`Error upserting gap for ${agentName}:`, error)
      } else {
        results.push({ agent: agentName, gaps: gaps.length })
      }
    }

    console.log(`Processed ${results.length} agents for date ${targetDate}`)

    return new Response(
      JSON.stringify({ success: true, processed: results.length, date: targetDate, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Gap calculation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
