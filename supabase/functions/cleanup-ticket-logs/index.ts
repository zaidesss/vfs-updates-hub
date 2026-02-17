import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Calculate cutoff date: start of previous week (Monday)
function getArchiveCutoffDate(): Date {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon, etc.
  
  // Calculate Monday of current week
  // If today is Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const currentWeekMonday = new Date(today)
  currentWeekMonday.setDate(today.getDate() - daysFromMonday)
  currentWeekMonday.setHours(0, 0, 0, 0)
  
  // Previous week's Monday (7 days before current Monday)
  const previousWeekMonday = new Date(currentWeekMonday)
  previousWeekMonday.setDate(currentWeekMonday.getDate() - 7)
  
  return previousWeekMonday
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate cutoff: start of previous week (Monday)
    const cutoffDate = getArchiveCutoffDate()
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    console.log('Cleanup started. Cutoff date (start of previous week):', cutoffDateStr)

    // Fetch old ticket logs (before the previous week's Monday)
    const { data: oldLogs, error: fetchError } = await supabase
      .from('ticket_logs')
      .select('*')
      .lt('timestamp', cutoffDate.toISOString())
      .order('timestamp', { ascending: true })

    if (fetchError) {
      console.error('Error fetching old logs:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch old logs', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!oldLogs || oldLogs.length === 0) {
      console.log('No logs to archive')
      return new Response(
        JSON.stringify({ success: true, message: 'No logs to archive', archived: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${oldLogs.length} logs to archive`)

    // Create archive file
    const archiveDate = new Date().toISOString().split('T')[0]
    const fileName = `ticket-logs-archive-${archiveDate}.json`
    const archiveContent = JSON.stringify(oldLogs, null, 2)

    // Upload to storage bucket
    const { error: uploadError } = await supabase.storage
      .from('ticket-archives')
      .upload(fileName, archiveContent, {
        contentType: 'application/json',
        upsert: true,
      })

    if (uploadError) {
      console.error('Error uploading archive:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload archive', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Archive uploaded: ${fileName}`)

    // Delete archived logs
    const logIds = oldLogs.map(log => log.id)
    const { error: deleteError } = await supabase
      .from('ticket_logs')
      .delete()
      .in('id', logIds)

    if (deleteError) {
      console.error('Error deleting old logs:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete old logs', details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Also cleanup old gap daily records
    const { error: gapDeleteError } = await supabase
      .from('ticket_gap_daily')
      .delete()
      .lt('date', cutoffDateStr)

    if (gapDeleteError) {
      console.error('Error deleting old gap records:', gapDeleteError)
    }

    // Cleanup old call_count_daily records
    const { data: deletedCallCounts, error: callCountDeleteError } = await supabase
      .from('call_count_daily')
      .delete()
      .lt('date', cutoffDateStr)
      .select('id')

    const callCountsPurged = deletedCallCounts?.length || 0

    if (callCountDeleteError) {
      console.error('Error deleting old call count records:', callCountDeleteError)
    } else {
      console.log(`Purged ${callCountsPurged} old call_count_daily records`)
    }

    // Cleanup old profile_events (already captured in attendance_snapshots + event_snapshots)
    const { data: deletedEvents, error: profileEventsDeleteError } = await supabase
      .from('profile_events')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id')

    const profileEventsPurged = deletedEvents?.length || 0

    if (profileEventsDeleteError) {
      console.error('Error deleting old profile events:', profileEventsDeleteError)
    } else {
      console.log(`Purged ${profileEventsPurged} old profile_events records`)
    }

    console.log(`Cleanup complete. Archived and deleted ${oldLogs.length} ticket logs, purged ${profileEventsPurged} profile events, ${callCountsPurged} call counts`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        archived: oldLogs.length, 
        archiveFile: fileName,
        cutoffDate: cutoffDateStr,
        profileEventsPurged,
        callCountsPurged
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Cleanup error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
