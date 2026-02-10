import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TicketPayload {
  zd_instance: string
  ticket_id: string
  status: string
  timestamp: string
  ticket_type: string
  agent_name: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const secretZD2 = Deno.env.get('ZENDESK_WEBHOOK_SECRET')
    const secretZD1 = Deno.env.get('ZENDESK_WEBHOOK_SECRET_ZD1')
    
    const receivedToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const isValidToken = receivedToken && (receivedToken === secretZD2 || receivedToken === secretZD1)
    
    if (!isValidToken) {
      console.error('Unauthorized: Invalid or missing Bearer token')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: TicketPayload = await req.json()
    console.log('Received ticket webhook:', JSON.stringify(payload))

    if (!payload.zd_instance || !payload.ticket_id || !payload.status || !payload.timestamp || !payload.ticket_type || !payload.agent_name) {
      console.error('Missing required fields in payload')
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Look up agent via agent_directory using agent_tag (single query for email)
    const { data: agentData } = await supabase
      .from('agent_directory')
      .select('email')
      .ilike('agent_tag', payload.agent_name)
      .maybeSingle()

    const agentEmail = agentData?.email || null

    // Check OT status via agent_profiles -> profile_status using agent_tag directly
    // This works even if agent_email lookup failed above
    let isOt = false
    const { data: profileData } = await supabase
      .from('agent_profiles')
      .select('id')
      .ilike('agent_tag', payload.agent_name)
      .maybeSingle()

    if (profileData?.id) {
      const { data: statusData } = await supabase
        .from('profile_status')
        .select('current_status')
        .eq('profile_id', profileData.id)
        .maybeSingle()

      if (statusData?.current_status === 'ON_OT') {
        isOt = true
        console.log(`Agent ${payload.agent_name} is ON_OT, marking ticket as OT`)
      }
    }

    // Normalize ticket_type
    let normalizedType = 'Email'
    const ticketTypeLower = payload.ticket_type.toLowerCase()
    if (ticketTypeLower.includes('chat') || ticketTypeLower.includes('messaging')) {
      normalizedType = 'Chat'
    } else if (ticketTypeLower.includes('phone') || ticketTypeLower.includes('call') || ticketTypeLower.includes('voice')) {
      normalizedType = 'Call'
    } else if (ticketTypeLower.includes('mail') || ticketTypeLower.includes('email') || ticketTypeLower.includes('web')) {
      normalizedType = 'Email'
    }

    const { data, error } = await supabase
      .from('ticket_logs')
      .insert({
        zd_instance: payload.zd_instance,
        ticket_id: payload.ticket_id,
        status: payload.status,
        timestamp: payload.timestamp,
        ticket_type: normalizedType,
        agent_name: payload.agent_name,
        agent_email: agentEmail,
        is_ot: isOt,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to insert ticket log:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to insert ticket log', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Ticket log inserted successfully:', data.id, isOt ? '(OT)' : '')

    return new Response(
      JSON.stringify({ success: true, id: data.id, is_ot: isOt }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
