import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusNotificationRequest {
  agentName: string;
  agentEmail: string;
  eventType: string;
  timestamp?: string;
}

// Event type to message label mapping
const EVENT_LABELS: Record<string, string> = {
  LOGIN: 'logged in',
  LOGOUT: 'logged out',
  BREAK_IN: 'started a break',
  BREAK_OUT: 'ended their break',
  COACHING_START: 'started coaching',
  COACHING_END: 'ended coaching',
  DEVICE_RESTART_START: 'is restarting device',
  DEVICE_RESTART_END: 'device restored',
  BIO_START: 'started bio break',
  BIO_END: 'ended bio break',
};

// Channel routing
const LOGIN_LOGOUT_CHANNEL = 'a_cyrus_li-lo';
const OTHER_STATUS_CHANNEL = 'a_cyrus_cs-all';

/**
 * Get today's date in EST as 'YYYY-MM-DD'.
 */
function getTodayEST(eventTime: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(eventTime);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const slackBotToken = Deno.env.get('SLACK_BOT_TOKEN');

    if (!slackBotToken) {
      console.log('SLACK_BOT_TOKEN not configured, skipping notification');
      return new Response(
        JSON.stringify({ success: true, message: 'Slack not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: StatusNotificationRequest = await req.json();
    const { agentName, agentEmail, eventType, timestamp } = body;

    if (!agentName || !eventType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: agentName, eventType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format time in EST
    const eventTime = timestamp ? new Date(timestamp) : new Date();
    const formattedTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(eventTime);

    // Get message label
    const label = EVENT_LABELS[eventType] || eventType.toLowerCase().replace(/_/g, ' ');

    // Determine channel based on event type
    const isLoginLogout = eventType === 'LOGIN' || eventType === 'LOGOUT';
    const channel = isLoginLogout ? LOGIN_LOGOUT_CHANNEL : OTHER_STATUS_CHANNEL;

    // Calculate today's EST date for thread grouping
    const todayEST = getTodayEST(eventTime);

    // Check for existing thread for this agent + channel + today
    const { data: existingThread } = await supabase
      .from('slack_threads')
      .select('thread_ts')
      .eq('agent_email', agentEmail.toLowerCase())
      .eq('channel', channel)
      .eq('date', todayEST)
      .maybeSingle();

    let message: string;
    const slackPayload: Record<string, unknown> = { channel };

    // Determine if this LOGOUT should skip thread creation on li-lo channel
    const isLogoutWithoutThread = isLoginLogout && eventType === 'LOGOUT' && !existingThread?.thread_ts;

    if (existingThread?.thread_ts) {
      // Reply in existing thread — shorter message (no agent name, no @channel)
      message = `${label} at ${formattedTime} EST`;
      slackPayload.text = message;
      slackPayload.thread_ts = existingThread.thread_ts;
    } else {
      // New top-level message
      const channelMention = isLoginLogout ? '' : '<!channel> ';
      message = `${channelMention}${agentName} ${label} at ${formattedTime} EST`;
      slackPayload.text = message;
    }

    // Post to Slack
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${slackBotToken}`,
      },
      body: JSON.stringify(slackPayload),
    });

    const slackResult = await slackResponse.json();

    if (!slackResult.ok) {
      console.error('Slack API error:', slackResult.error);
      return new Response(
        JSON.stringify({ success: false, error: slackResult.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If this was a new top-level message, save the thread_ts for future replies
    // BUT: skip saving thread_ts for LOGOUT on li-lo channel when no thread exists yet
    // This ensures LOGIN will become the parent thread instead
    if (!existingThread?.thread_ts && slackResult.ts && !isLogoutWithoutThread) {
      const { error: insertError } = await supabase
        .from('slack_threads')
        .insert({
          agent_email: agentEmail.toLowerCase(),
          channel,
          thread_ts: slackResult.ts,
          date: todayEST,
        });

      if (insertError) {
        console.error('Failed to save thread_ts:', insertError);
        // Non-fatal — the message was already sent
      }
    }

    const isReply = !!existingThread?.thread_ts;
    console.log(`Posted ${isReply ? 'reply' : 'new thread'} to ${channel}: ${message}`);

    return new Response(
      JSON.stringify({ success: true, channel, message, isReply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in send-profile-status-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
