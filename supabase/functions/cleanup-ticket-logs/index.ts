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

    // Calculate 14 days ago
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const cutoffDate = fourteenDaysAgo.toISOString()

    console.log('Cleanup started. Cutoff date:', cutoffDate)

    // Fetch old ticket logs
    const { data: oldLogs, error: fetchError } = await supabase
      .from('ticket_logs')
      .select('*')
      .lt('timestamp', cutoffDate)
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
      .lt('date', cutoffDate.split('T')[0])

    if (gapDeleteError) {
      console.error('Error deleting old gap records:', gapDeleteError)
    }

    console.log(`Cleanup complete. Archived and deleted ${oldLogs.length} logs`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        archived: oldLogs.length, 
        archiveFile: fileName 
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
