import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRequest {
  agentEmail: string;
  agentName: string;
  alertType: 'EXCESSIVE_RESTART' | 'BIO_OVERUSE';
  details: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AlertRequest = await req.json();
    const { agentEmail, agentName, alertType, details } = body;

    if (!agentEmail || !agentName || !alertType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: agentEmail, agentName, alertType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const formattedTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(now);
    const formattedDate = now.toISOString().split('T')[0];

    // Determine alert message and severity
    let title: string;
    let message: string;
    let incidentType: string;
    let severity: string;

    if (alertType === 'EXCESSIVE_RESTART') {
      title = `⚠️ Excessive Device Restart: ${agentName}`;
      message = `${agentName} has exceeded the 5-minute device restart limit at ${formattedTime} EST.`;
      incidentType = 'EXCESSIVE_RESTARTS';
      severity = 'medium';
    } else if (alertType === 'BIO_OVERUSE') {
      title = `⚠️ Bio Break Overuse: ${agentName}`;
      message = `${agentName} has exceeded their bio break allowance at ${formattedTime} EST.`;
      incidentType = 'BIO_OVERUSE';
      severity = 'low';
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown alert type: ${alertType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get agent's profile_id for the report
    const { data: agentProfile } = await supabase
      .from('agent_profiles')
      .select('id')
      .eq('email', agentEmail.toLowerCase())
      .single();

    // 1. Create agent_report record
    const { error: reportError } = await supabase.from('agent_reports').insert({
      agent_email: agentEmail.toLowerCase(),
      agent_name: agentName,
      profile_id: agentProfile?.id || null,
      incident_date: formattedDate,
      incident_type: incidentType,
      severity,
      details,
      status: 'open',
    });

    if (reportError) {
      console.error('Failed to create agent report:', reportError);
    }

    // 2. Fetch all admins/HR/super_admins for notifications
    const { data: admins } = await supabase
      .from('user_roles')
      .select('email')
      .in('role', ['admin', 'hr', 'super_admin']);

    const recipientEmails = new Set<string>();
    admins?.forEach((a) => recipientEmails.add(a.email.toLowerCase()));
    recipientEmails.delete(agentEmail.toLowerCase()); // Don't notify the agent

    // 3. Create in-app notifications
    if (recipientEmails.size > 0) {
      const notifications = Array.from(recipientEmails).map((email) => ({
        user_email: email,
        title,
        message,
        type: 'status_alert',
        reference_type: 'agent_report',
        reference_id: agentProfile?.id || null,
      }));

      const { error: notifError } = await supabase.from('notifications').insert(notifications);
      if (notifError) {
        console.error('Failed to create notifications:', notifError);
      }
    }

    // 4. Send email via Resend (if configured)
    if (resendApiKey && recipientEmails.size > 0) {
      const emailRecipients = Array.from(recipientEmails);
      
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'VFS Updates Hub <noreply@vfsoperations.online>',
            to: emailRecipients,
            subject: title,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f59e0b;">${title}</h2>
                <p>${message}</p>
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 14px;">
                  Agent: ${agentName}<br>
                  Email: ${agentEmail}<br>
                  Time: ${formattedTime} EST<br>
                  Date: ${formattedDate}
                </p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                  This alert was automatically generated by VFS Updates Hub.
                </p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error('Resend email failed:', errorText);
        }
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
      }
    }

    // 5. Send Slack notification (if configured)
    if (slackWebhookUrl) {
      try {
        const slackPayload = {
          text: title,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: title,
                emoji: true,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: message,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `*Agent:* ${agentName} | *Email:* ${agentEmail} | *Time:* ${formattedTime} EST`,
                },
              ],
            },
          ],
        };

        const slackResponse = await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        });

        if (!slackResponse.ok) {
          const slackError = await slackResponse.text();
          console.error('Slack notification failed:', slackError);
        }
      } catch (slackErr) {
        console.error('Slack send error:', slackErr);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Alert sent for ${alertType}`,
        recipientCount: recipientEmails.size,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in send-status-alert-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
