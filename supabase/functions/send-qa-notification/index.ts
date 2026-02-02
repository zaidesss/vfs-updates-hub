import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotificationRequest {
  evaluationId: string;
  type: 'new_evaluation' | 'acknowledgment';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { evaluationId, type }: NotificationRequest = await req.json();

    if (!evaluationId || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing evaluationId or type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch evaluation details
    const { data: evaluation, error: evalError } = await supabase
      .from('qa_evaluations')
      .select('*')
      .eq('id', evaluationId)
      .single();

    if (evalError || !evaluation) {
      console.error('Failed to fetch evaluation:', evalError);
      return new Response(
        JSON.stringify({ error: 'Evaluation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all admins, HR, and super admins for CC
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('email, name, role')
      .in('role', ['admin', 'hr', 'super_admin']);

    const ccEmails = [...new Set(adminUsers?.map(u => u.email) || [])];
    
    // Remove the agent email from CC if present
    const filteredCcEmails = ccEmails.filter(e => e !== evaluation.agent_email);

    const previewUrl = Deno.env.get('SITE_URL') || 'https://vfs-updates-hub.lovable.app';
    const evaluationUrl = `${previewUrl}/team-performance/qa-evaluations/${evaluationId}`;

    let subject: string;
    let htmlContent: string;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the verified subdomain from Resend
    const senderEmail = 'Agent Portal <noreply@updates.virtualfreelancesolutions.com>';

    if (type === 'new_evaluation') {
      subject = `QA Evaluation Completed - ${evaluation.audit_date} - Ticket #${evaluation.ticket_id}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">QA Evaluation Completed</h2>
          <p>Hello ${evaluation.agent_name},</p>
          <p>A new QA evaluation has been completed for your ticket handling.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Reference:</strong> ${evaluation.reference_number}</p>
            <p><strong>Audit Date:</strong> ${evaluation.audit_date}</p>
            <p><strong>Ticket:</strong> #${evaluation.ticket_id}</p>
            <p><strong>Evaluator:</strong> ${evaluation.evaluator_name || evaluation.evaluator_email}</p>
            <p><strong>Score:</strong> ${evaluation.total_score}/${evaluation.total_max} (${Number(evaluation.percentage).toFixed(1)}%)</p>
            <p><strong>Rating:</strong> <span style="color: ${evaluation.rating === 'Pass' ? '#22c55e' : '#ef4444'}; font-weight: bold;">${evaluation.rating}</span></p>
            ${evaluation.has_critical_fail ? '<p style="color: #ef4444; font-weight: bold;">⚠️ Critical Error Detected</p>' : ''}
          </div>
          
          <p>Please review the evaluation and acknowledge it at your earliest convenience.</p>
          
          <a href="${evaluationUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Evaluation</a>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated notification from the Agent Portal.</p>
        </div>
      `;

      // Send to agent using Resend API
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [evaluation.agent_email],
          cc: filteredCcEmails.length > 0 ? filteredCcEmails : undefined,
          subject,
          html: htmlContent,
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error('Failed to send new evaluation email:', errText);
        
        // Log failure event
        await supabase
          .from('qa_evaluation_events')
          .insert({
            evaluation_id: evaluationId,
            event_type: 'notification_failed',
            event_description: `Email failed to send to ${evaluation.agent_email}`,
            actor_email: evaluation.evaluator_email,
            actor_name: evaluation.evaluator_name,
            metadata: { error: errText, to: evaluation.agent_email },
          });
        
        // Return error so UI can show toast
        return new Response(
          JSON.stringify({ error: 'Failed to send email', details: errText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Log success event
      await supabase
        .from('qa_evaluation_events')
        .insert({
          evaluation_id: evaluationId,
          event_type: 'notification_sent',
          event_description: `Notification email sent to ${evaluation.agent_email}`,
          actor_email: evaluation.evaluator_email,
          actor_name: evaluation.evaluator_name,
          metadata: { to: evaluation.agent_email, cc: filteredCcEmails },
        });

      // Mark notification as sent only after success
      await supabase
        .from('qa_evaluations')
        .update({ notification_sent: true })
        .eq('id', evaluationId);

    } else if (type === 'acknowledgment') {
      subject = `QA Evaluation Acknowledged - ${evaluation.agent_name} - ${evaluation.audit_date}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">QA Evaluation Acknowledged</h2>
          <p>${evaluation.agent_name} has acknowledged their QA evaluation.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Reference:</strong> ${evaluation.reference_number}</p>
            <p><strong>Agent:</strong> ${evaluation.agent_name}</p>
            <p><strong>Audit Date:</strong> ${evaluation.audit_date}</p>
            <p><strong>Ticket:</strong> #${evaluation.ticket_id}</p>
            <p><strong>Score:</strong> ${evaluation.total_score}/${evaluation.total_max} (${Number(evaluation.percentage).toFixed(1)}%)</p>
            <p><strong>Acknowledged At:</strong> ${evaluation.acknowledged_at ? new Date(evaluation.acknowledged_at).toLocaleString() : 'N/A'}</p>
          </div>
          
          <a href="${evaluationUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Evaluation</a>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated notification from the Agent Portal.</p>
        </div>
      `;

      // Send to admins with agent in CC using Resend API
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: senderEmail,
          to: filteredCcEmails.length > 0 ? filteredCcEmails : [evaluation.agent_email],
          cc: filteredCcEmails.length > 0 ? [evaluation.agent_email] : undefined,
          subject,
          html: htmlContent,
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error('Failed to send acknowledgment email:', errText);
        
        // Log failure event
        await supabase
          .from('qa_evaluation_events')
          .insert({
            evaluation_id: evaluationId,
            event_type: 'notification_failed',
            event_description: `Acknowledgment email failed to send`,
            actor_email: evaluation.agent_email,
            actor_name: evaluation.agent_name,
            metadata: { error: errText },
          });
        
        return new Response(
          JSON.stringify({ error: 'Failed to send email', details: errText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Log success event
      await supabase
        .from('qa_evaluation_events')
        .insert({
          evaluation_id: evaluationId,
          event_type: 'acknowledgment_notification_sent',
          event_description: `Acknowledgment notification sent to admins`,
          actor_email: evaluation.agent_email,
          actor_name: evaluation.agent_name,
          metadata: { to: filteredCcEmails },
        });
    }

    console.log(`QA notification sent successfully: ${type} for ${evaluationId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-qa-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
