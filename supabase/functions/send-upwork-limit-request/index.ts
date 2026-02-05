import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface UpworkLimitRequest {
  agentName: string;
  agentEmail: string;
  currentTotalHours: number;
  requestedLimit: number;
  teamLead: string;
  reason?: string;
  requestedBy: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      agentName,
      agentEmail,
      currentTotalHours,
      requestedLimit,
      teamLead,
      reason,
      requestedBy,
    }: UpworkLimitRequest = await req.json();

    // Validate required fields
    if (!agentName || !agentEmail || currentTotalHours === undefined || !requestedLimit || !requestedBy) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fixed recipients
    const fixedRecipients = [
      'hr@virtualfreelancesolutions.com',
      'cherry@virtualfreelancesolutions.com',
    ];

    // Fetch all Super Admins from user_roles
    const { data: superAdmins, error: saError } = await supabase
      .from('user_roles')
      .select('email')
      .eq('role', 'super_admin');

    if (saError) {
      console.error('Error fetching super admins:', saError);
    }

    // Combine and deduplicate recipients
    const allRecipients = new Set<string>(fixedRecipients.map(e => e.toLowerCase()));
    (superAdmins || []).forEach((sa: { email: string }) => {
      allRecipients.add(sa.email.toLowerCase());
    });

    const recipientList = Array.from(allRecipients);
    console.log(`Sending Upwork limit request to ${recipientList.length} recipients`);

    // Build email content
    const previewUrl = 'https://vfs-updates-hub.lovable.app';
    const subject = `Upwork Limit Adjustment Request - ${agentName}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">🕐 Upwork Limit Adjustment Request</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong>Agent:</strong> ${agentName} (${agentEmail})</p>
          <p style="margin: 8px 0;"><strong>Current Total Hours:</strong> ${currentTotalHours.toFixed(1)} hours</p>
          <p style="margin: 8px 0;"><strong>Requested New Limit:</strong> ${requestedLimit} hours</p>
          <p style="margin: 8px 0;"><strong>Team Lead:</strong> ${teamLead}</p>
          <p style="margin: 8px 0;"><strong>Requested By:</strong> ${requestedBy}</p>
          ${reason ? `<p style="margin: 16px 0 8px 0;"><strong>Reason:</strong></p><p style="margin: 0; padding: 10px; background: #fff; border-radius: 4px; border: 1px solid #ddd;">${reason}</p>` : ''}
        </div>
        
        <a href="${previewUrl}/manage-profiles" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Profile</a>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated notification from the VFS Agent Portal.</p>
      </div>
    `;

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'VFS Agent Portal <noreply@updates.virtualfreelancesolutions.com>',
        to: recipientList,
        subject,
        html: htmlContent,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Failed to send email:', errText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent successfully');

    // Create in-app notifications for all recipients
    const notificationRecords = recipientList.map(email => ({
      user_email: email,
      title: 'Upwork Limit Adjustment Request',
      message: `${agentName} - New limit: ${requestedLimit} hours (from ${currentTotalHours.toFixed(1)}h)`,
      type: 'system',
      reference_type: 'upwork_adjustment',
      reference_id: agentEmail,
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notificationRecords);

    if (notifError) {
      console.error('Error creating in-app notifications:', notifError);
      // Don't fail the request for notification errors
    } else {
      console.log(`Created ${notificationRecords.length} in-app notifications`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Request sent to ${recipientList.length} recipients` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-upwork-limit-request:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
