import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InactivePeriod {
  start: number;
  end: number;
}

/**
 * Calculate how much of an inactive period overlaps with a gap between two timestamps
 */
function calculateOverlap(gapStart: number, gapEnd: number, period: InactivePeriod): number {
  const overlapStart = Math.max(gapStart, period.start);
  const overlapEnd = Math.min(gapEnd, period.end);
  
  if (overlapStart < overlapEnd) {
    return overlapEnd - overlapStart;
  }
  return 0;
}

/**
 * Calculate total inactive time (breaks, coaching, restart) that overlaps with a gap
 */
function getInactiveTimeInGap(gapStart: number, gapEnd: number, inactivePeriods: InactivePeriod[]): number {
  let totalInactive = 0;
  for (const period of inactivePeriods) {
    totalInactive += calculateOverlap(gapStart, gapEnd, period);
  }
  return totalInactive;
}

/**
 * Check if there's a logout between two timestamps
 */
function hasLogoutBetween(ticketA: number, ticketB: number, logoutTimestamps: number[]): boolean {
  return logoutTimestamps.some(logout => logout > ticketA && logout < ticketB);
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

    // Fetch agent_directory to map agent_tag → email
    const { data: agentDir } = await supabase
      .from('agent_directory')
      .select('agent_tag, email')

    const tagToEmail: Record<string, string> = {}
    for (const agent of agentDir || []) {
      if (agent.agent_tag && agent.email) {
        tagToEmail[agent.agent_tag.toLowerCase()] = agent.email.toLowerCase()
      }
    }

    // Fetch agent_profiles to get profile IDs
    const { data: profiles } = await supabase
      .from('agent_profiles')
      .select('id, email')

    const emailToProfileId: Record<string, string> = {}
    for (const p of profiles || []) {
      if (p.email) {
        emailToProfileId[p.email.toLowerCase()] = p.id
      }
    }

    // Fetch profile_status to get current login status
    const { data: statusData } = await supabase
      .from('profile_status')
      .select('profile_id, current_status')

    const profileIdToStatus: Record<string, string> = {}
    for (const s of statusData || []) {
      profileIdToStatus[s.profile_id] = s.current_status
    }

    // Fetch all profile_events for the day to identify break/coaching/restart periods
    const { data: profileEvents } = await supabase
      .from('profile_events')
      .select('profile_id, event_type, created_at')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: true })

    // Build a map of inactive periods per profile_id
    const profileInactivePeriods: Record<string, InactivePeriod[]> = {}
    const profileLogouts: Record<string, number[]> = {}
    
    // Track open periods (started but not ended)
    const openPeriods: Record<string, { type: string; start: number }> = {}

    for (const event of profileEvents || []) {
      const profileId = event.profile_id
      const eventTime = new Date(event.created_at).getTime()
      
      if (!profileInactivePeriods[profileId]) {
        profileInactivePeriods[profileId] = []
        profileLogouts[profileId] = []
      }

      // Track logout events for session boundary detection
      if (event.event_type === 'LOGOUT') {
        profileLogouts[profileId].push(eventTime)
      }

      // Handle break/coaching/restart start events
      if (event.event_type === 'BREAK_IN' || 
          event.event_type === 'COACHING_START' || 
          event.event_type === 'DEVICE_RESTART_START') {
        openPeriods[profileId] = { type: event.event_type, start: eventTime }
      }

      // Handle break/coaching/restart end events
      if (event.event_type === 'BREAK_OUT' && openPeriods[profileId]?.type === 'BREAK_IN') {
        profileInactivePeriods[profileId].push({
          start: openPeriods[profileId].start,
          end: eventTime
        })
        delete openPeriods[profileId]
      }
      if (event.event_type === 'COACHING_END' && openPeriods[profileId]?.type === 'COACHING_START') {
        profileInactivePeriods[profileId].push({
          start: openPeriods[profileId].start,
          end: eventTime
        })
        delete openPeriods[profileId]
      }
      if (event.event_type === 'DEVICE_RESTART_END' && openPeriods[profileId]?.type === 'DEVICE_RESTART_START') {
        profileInactivePeriods[profileId].push({
          start: openPeriods[profileId].start,
          end: eventTime
        })
        delete openPeriods[profileId]
      }
    }

    // Group tickets by agent
    const agentTickets: Record<string, { email: string | null; timestamps: number[] }> = {}
    
    for (const log of ticketLogs) {
      if (!agentTickets[log.agent_name]) {
        agentTickets[log.agent_name] = { email: log.agent_email, timestamps: [] }
      }
      agentTickets[log.agent_name].timestamps.push(new Date(log.timestamp).getTime())
    }

    const results: { agent: string; gaps: number; excluded: number }[] = []

    // Calculate gaps for each agent
    for (const [agentName, data] of Object.entries(agentTickets)) {
      // Get profile ID for this agent
      const agentEmail = tagToEmail[agentName.toLowerCase()]
      const profileId = agentEmail ? emailToProfileId[agentEmail] : null
      const currentStatus = profileId ? profileIdToStatus[profileId] : null
      
      // Only calculate gaps for currently LOGGED_IN agents
      if (currentStatus !== 'LOGGED_IN') {
        console.log(`Skipping gap calculation for agent not logged in: ${agentName} (status: ${currentStatus || 'unknown'})`)
        continue
      }

      const timestamps = data.timestamps.sort((a, b) => a - b)
      const ticketCount = timestamps.length

      // Get inactive periods and logout times for this agent
      const inactivePeriods = profileId ? (profileInactivePeriods[profileId] || []) : []
      const logoutTimes = profileId ? (profileLogouts[profileId] || []) : []

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
        results.push({ agent: agentName, gaps: 0, excluded: 0 })
        continue
      }

      // Calculate gaps between consecutive tickets
      const gaps: number[] = []
      let excludedGaps = 0
      
      for (let i = 1; i < timestamps.length; i++) {
        const ticketA = timestamps[i - 1]
        const ticketB = timestamps[i]
        
        // If there's a logout between these tickets, skip this gap (session boundary)
        if (hasLogoutBetween(ticketA, ticketB, logoutTimes)) {
          excludedGaps++
          console.log(`Excluding gap between tickets due to logout boundary for ${agentName}`)
          continue
        }
        
        // Calculate raw gap
        let gapMs = ticketB - ticketA
        
        // Subtract inactive time (breaks, coaching, restart)
        const inactiveMs = getInactiveTimeInGap(ticketA, ticketB, inactivePeriods)
        gapMs = Math.max(0, gapMs - inactiveMs)
        
        const gapSeconds = Math.floor(gapMs / 1000)
        gaps.push(gapSeconds)
      }

      if (gaps.length === 0) {
        // All gaps were excluded (e.g., session boundaries)
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
        results.push({ agent: agentName, gaps: 0, excluded: excludedGaps })
        continue
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
        results.push({ agent: agentName, gaps: gaps.length, excluded: excludedGaps })
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
