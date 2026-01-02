import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = 'https://vfs-updates-hub.lovable.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const { updateTitle, isEdit, referenceNumber } = await req.json();

    const notificationType = isEdit ? 'Updated' : 'New';
    const refDisplay = referenceNumber ? ` (${referenceNumber})` : '';
    console.log(`Sending notifications for ${notificationType.toLowerCase()} update: ${updateTitle}${refDisplay}`);

    // Get all users (admins and regular users) from user_roles
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: users, error: usersError } = await supabase
      .from('user_roles')
      .select('email');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw new Error('Failed to fetch users');
    }

    const emails = users?.map(u => u.email) || [];
    console.log(`Found ${emails.length} users to notify`);

    const results = {
      slack: false,
      email: false,
      emailCount: 0,
    };

    // Send Slack notification
    if (slackWebhookUrl) {
      try {
        const emoji = isEdit ? '✏️' : '📢';
        const slackResponse = await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `${emoji} *${notificationType} Update${refDisplay}: ${updateTitle}*\n\nThere's ${isEdit ? 'an updated' : 'a new'} update. Go to ${APP_URL} to ${isEdit ? 'review the changes and' : ''} acknowledge the update.`,
          }),
        });

        if (slackResponse.ok) {
          results.slack = true;
          console.log('Slack notification sent successfully');
        } else {
          console.error('Slack notification failed:', await slackResponse.text());
        }
      } catch (slackError) {
        console.error('Slack error:', slackError);
      }
    } else {
      console.log('No Slack webhook URL configured');
    }

    // Send email notifications
    if (resendApiKey && emails.length > 0) {
      try {
        const resend = new Resend(resendApiKey);
        
        // Send to all users (Resend supports up to 50 recipients per call)
        const emoji = isEdit ? '✏️' : '📢';
        // Use verified domain email - must match domain verified in Resend
        const emailResponse = await resend.emails.send({
          from: 'VFS Updates Hub <noreply@updates.virtualfreelancesolutions.com>',
          to: emails,
          subject: `${notificationType} Update${refDisplay}: ${updateTitle}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">${emoji} ${notificationType} Update Available</h1>
              ${referenceNumber ? `<p style="color: #888; font-family: monospace; font-size: 14px; margin-bottom: 8px;">${referenceNumber}</p>` : ''}
              <h2 style="color: #555;">${updateTitle}</h2>
              <p style="color: #666; font-size: 16px;">
                ${isEdit 
                  ? 'An existing update has been modified. Please review the changes and acknowledge it.' 
                  : 'There\'s a new update. Please review and acknowledge it.'}
              </p>
              <a href="${APP_URL}" 
                 style="display: inline-block; background-color: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
                View Update
              </a>
              <p style="color: #999; font-size: 14px; margin-top: 24px;">
                — VFS Updates Hub
              </p>
            </div>
          `,
        });

        console.log('Email sent successfully:', emailResponse);
        results.email = true;
        results.emailCount = emails.length;
      } catch (emailError) {
        console.error('Email error:', emailError);
      }
    } else {
      console.log('No Resend API key configured or no users to notify');
    }

    // Create in-app notifications for all users
    if (emails.length > 0) {
      try {
        const notificationType = isEdit ? 'Updated' : 'New';
        const notificationRecords = emails.map(email => ({
          user_email: email.toLowerCase(),
          title: `${notificationType} Update: ${updateTitle}`,
          message: referenceNumber 
            ? `[${referenceNumber}] ${isEdit ? 'An update has been modified' : 'A new update has been posted'}. Please review and acknowledge.`
            : `${isEdit ? 'An update has been modified' : 'A new update has been posted'}. Please review and acknowledge.`,
          type: 'new_update',
          reference_id: referenceNumber || null,
          reference_type: 'update',
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notificationRecords);

        if (notifError) {
          console.error('Error creating in-app notifications:', notifError);
        } else {
          console.log(`Created ${notificationRecords.length} in-app notifications`);
        }
      } catch (notifError) {
        console.error('Error creating in-app notifications:', notifError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      message: `Notifications sent: Slack=${results.slack}, Email=${results.emailCount} recipients`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error sending notifications:', err);
    return new Response(JSON.stringify({ error: 'Failed to send notifications' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});