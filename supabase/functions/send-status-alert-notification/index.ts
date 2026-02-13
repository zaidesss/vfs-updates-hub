import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/gmail-sender.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRequest {
  agentEmail: string;
  agentName: string;
  alertType: 'EXCESSIVE_RESTART' | 'BIO_OVERUSE' | 'LATE_LOGIN' | 'EARLY_OUT' | 'NO_LOGOUT' | 'OVERBREAK' | 'TIME_NOT_MET' | 'QUOTA_NOT_MET' | 'HIGH_GAP';
  details: Record<string, any>;
}

// Alert type configurations
const ALERT_CONFIGS: Record<string, { emoji: string; label: string; defaultSeverity: string }> = {
  EXCESSIVE_RESTART: { emoji: '🔄', label: 'Excessive Restart', defaultSeverity: 'medium' },
  BIO_OVERUSE: { emoji: '🚿', label: 'Bio Break Overuse', defaultSeverity: 'low' },
  LATE_LOGIN: { emoji: '🕐', label: 'Late Login', defaultSeverity: 'low' },
  EARLY_OUT: { emoji: '🚪', label: 'Early Out', defaultSeverity: 'medium' },
  NO_LOGOUT: { emoji: '🔴', label: 'No Logout', defaultSeverity: 'high' },
  OVERBREAK: { emoji: '☕', label: 'Overbreak', defaultSeverity: 'low' },
  TIME_NOT_MET: { emoji: '⏱️', label: 'Hours Not Met', defaultSeverity: 'medium' },
  QUOTA_NOT_MET: { emoji: '📊', label: 'Quota Not Met', defaultSeverity: 'medium' },
  HIGH_GAP: { emoji: '⏳', label: 'High Ticket Gap', defaultSeverity: 'medium' },
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const slackBotToken = Deno.env.get('SLACK_BOT_TOKEN');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AlertRequest = await req.json();
    const { agentEmail, agentName, alertType, details } = body;

    if (!agentEmail || !agentName || !alertType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: agentEmail, agentName, alertType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if alert type is supported
    const alertConfig = ALERT_CONFIGS[alertType];
    if (!alertConfig) {
      return new Response(
        JSON.stringify({ error: `Unknown alert type: ${alertType}` }),
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

    // Determine alert message and severity based on type
    const { emoji, label, defaultSeverity } = alertConfig;
    const severity = details.severity || defaultSeverity;
    
    let title: string;
    let message: string;
    let incidentType: string = alertType === 'EXCESSIVE_RESTART' ? 'EXCESSIVE_RESTARTS' : alertType;

    switch (alertType) {
      case 'EXCESSIVE_RESTART':
        title = `⚠️ Excessive Device Restart: ${agentName}`;
        message = `${agentName} has exceeded the 5-minute device restart limit at ${formattedTime} EST.`;
        break;
      case 'BIO_OVERUSE':
        title = `⚠️ Bio Break Overuse: ${agentName}`;
        message = `${agentName} has exceeded their bio break allowance at ${formattedTime} EST.`;
        break;
      case 'LATE_LOGIN':
        const lateMinutes = details.lateByMinutes || 0;
        title = `⚠️ Late Login: ${agentName}`;
        message = `${agentName} logged in ${lateMinutes} minutes late at ${formattedTime} EST.`;
        break;
      case 'EARLY_OUT':
        const earlyMinutes = details.earlyByMinutes || 0;
        title = `⚠️ Early Out: ${agentName}`;
        message = `${agentName} logged out ${earlyMinutes} minutes early at ${formattedTime} EST.`;
        break;
      case 'NO_LOGOUT':
        const lastDate = details.lastStatusDate || 'previous session';
        title = `⚠️ No Logout: ${agentName}`;
        message = `${agentName} did not log out from ${lastDate}.`;
        break;
      case 'OVERBREAK':
        const overageMinutes = details.overageMinutes || 0;
        title = `⚠️ Overbreak: ${agentName}`;
        message = `${agentName} exceeded their break by ${overageMinutes} minutes at ${formattedTime} EST.`;
        break;
      case 'TIME_NOT_MET':
        const loggedHours = details.loggedHours || 0;
        const requiredHours = details.requiredHours || 0;
        title = `⚠️ Hours Not Met: ${agentName}`;
        message = `${agentName} logged ${loggedHours.toFixed(1)}h of ${requiredHours.toFixed(1)}h required.`;
        break;
      case 'QUOTA_NOT_MET':
        const expectedQuota = details.expectedQuota || 0;
        const actualTotal = details.actualTotal || 0;
        const shortfall = details.shortfall || 0;
        title = `⚠️ Quota Not Met: ${agentName}`;
        message = `${agentName} completed ${actualTotal} of ${expectedQuota} tickets (${shortfall} short).`;
        break;
      case 'HIGH_GAP':
        const avgGapMinutes = details.avgGapMinutes || 0;
        title = `⚠️ High Ticket Gap: ${agentName}`;
        message = `${agentName} had an average ticket gap of ${avgGapMinutes.toFixed(1)} minutes.`;
        break;
      default:
        title = `⚠️ ${label}: ${agentName}`;
        message = `${agentName} triggered ${label} alert at ${formattedTime} EST.`;
    }

    // Get agent's profile_id for notifications
    const { data: agentProfile } = await supabase
      .from('agent_profiles')
      .select('id')
      .eq('email', agentEmail.toLowerCase())
      .single();

    // NOTE: Report creation is handled client-side (agentDashboardApi.ts) and by the
    // batch job (generate-agent-reports), which have full schedule context for detailed fields.
    // This edge function only handles notifications (Slack, email, in-app).

    // 1. Fetch all admins/HR/super_admins for notifications
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

    // 4. Send email via Gmail API (if configured)
    if (recipientEmails.size > 0) {
      const emailRecipients = Array.from(recipientEmails);
      
      const html = `
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
      `;
      
      const result = await sendEmail({
        to: emailRecipients,
        subject: title,
        html,
      });
      
      if (!result.success) {
        console.error('Gmail email failed:', result.error);
      }
    }

    // 5. Send Slack notification to a_pb_mgt channel (if configured)
    if (slackBotToken) {
      try {
        // Build subtle, creative message with hyperlink
        const agentReportsUrl = 'https://vfs-updates-hub.lovable.app/team-performance/agent-reports';
        let slackMessage: string;
        
        switch (alertType) {
          case 'BIO_OVERUSE':
            slackMessage = `${emoji} *${label}* • ${agentName} has exceeded their bio break allowance (${severity} severity). <${agentReportsUrl}|Review in Agent Reports>`;
            break;
          case 'EXCESSIVE_RESTART':
            slackMessage = `${emoji} *${label}* • ${agentName} has exceeded the 5-min restart limit (${severity} severity). <${agentReportsUrl}|Review in Agent Reports>`;
            break;
          case 'LATE_LOGIN':
            slackMessage = `${emoji} *${label}* • ${agentName} logged in ${details.lateByMinutes || 0} mins late (${severity} severity). <${agentReportsUrl}|Review in Agent Reports>`;
            break;
          case 'EARLY_OUT':
            slackMessage = `${emoji} *${label}* • ${agentName} logged out ${details.earlyByMinutes || 0} mins early (${severity} severity). <${agentReportsUrl}|Review in Agent Reports>`;
            break;
          case 'NO_LOGOUT':
            slackMessage = `${emoji} *${label}* • ${agentName} did not log out from previous session (${severity} severity). <${agentReportsUrl}|Review in Agent Reports>`;
            break;
          case 'OVERBREAK':
            slackMessage = `${emoji} *${label}* • ${agentName} exceeded break by ${details.overageMinutes || 0} mins (${severity} severity). <${agentReportsUrl}|Review in Agent Reports>`;
            break;
          case 'TIME_NOT_MET':
            slackMessage = `${emoji} *${label}* • ${agentName} logged ${(details.loggedHours || 0).toFixed(1)}h/${(details.requiredHours || 0).toFixed(1)}h required (${severity} severity). <${agentReportsUrl}|Review in Agent Reports>`;
            break;
          case 'QUOTA_NOT_MET':
            slackMessage = `${emoji} *${label}* • ${agentName} completed ${details.actualTotal || 0}/${details.expectedQuota || 0} tickets (${details.shortfall || 0} short, ${severity} severity). <${agentReportsUrl}|Review in Agent Reports>`;
            break;
          case 'HIGH_GAP':
            slackMessage = `${emoji} *${label}* • ${agentName} avg ticket gap ${(details.avgGapMinutes || 0).toFixed(1)} mins (${severity} severity). <${agentReportsUrl}|Review in Agent Reports>`;
            break;
          default:
            slackMessage = `${emoji} *${label}* • ${agentName} - ${message} (${severity} severity). <${agentReportsUrl}|Review in Agent Reports>`;
        }

        const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${slackBotToken}`,
          },
          body: JSON.stringify({
            channel: 'a_agent_reports',
            text: slackMessage,
          }),
        });

        const slackResult = await slackResponse.json();
        if (!slackResult.ok) {
          console.error('Slack notification failed:', slackResult.error);
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
