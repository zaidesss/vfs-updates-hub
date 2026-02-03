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
    const channel = (eventType === 'LOGIN' || eventType === 'LOGOUT')
      ? LOGIN_LOGOUT_CHANNEL
      : OTHER_STATUS_CHANNEL;

    // Build subtle message
    const message = `${agentName} ${label} at ${formattedTime} EST`;

    // Post to Slack using Bot Token
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${slackBotToken}`,
      },
      body: JSON.stringify({
        channel,
        text: message,
      }),
    });

    const slackResult = await slackResponse.json();

    if (!slackResult.ok) {
      console.error('Slack API error:', slackResult.error);
      return new Response(
        JSON.stringify({ success: false, error: slackResult.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Posted to ${channel}: ${message}`);

    return new Response(
      JSON.stringify({ success: true, channel, message }),
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
