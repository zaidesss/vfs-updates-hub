import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CustomActionRequest {
  evaluationId: string;
  customActions: { category: string; action: string }[];
  evaluatorEmail: string;
  evaluatorName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { evaluationId, customActions, evaluatorEmail, evaluatorName }: CustomActionRequest = await req.json();

    if (!evaluationId || !customActions || customActions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing evaluationId or customActions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch evaluation details
    const { data: evaluation, error: evalError } = await supabase
      .from('qa_evaluations')
      .select('reference_number, agent_name, agent_email, audit_date, ticket_id')
      .eq('id', evaluationId)
      .single();

    if (evalError || !evaluation) {
      console.error('Failed to fetch evaluation:', evalError);
      return new Response(
        JSON.stringify({ error: 'Evaluation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch super admins and HR for notification
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('email, name, role')
      .in('role', ['super_admin', 'hr']);

    const recipients = [...new Set(adminUsers?.map(u => u.email) || [])];
    
    if (recipients.length === 0) {
      console.log('No super admin/HR recipients found for custom action notification');
      return new Response(
        JSON.stringify({ success: true, message: 'No recipients configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const previewUrl = Deno.env.get('SITE_URL') || 'https://vfs-updates-hub.lovable.app';
    const evaluationUrl = `${previewUrl}/team-performance/qa-evaluations/${evaluationId}`;

    // Build custom actions list HTML
    const actionsListHtml = customActions.map(ca => 
      `<li><strong>${ca.category}:</strong> ${ca.action}</li>`
    ).join('');

    const subject = `New Custom Action Suggested - ${evaluation.reference_number}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">New Custom Action Plan Suggested</h2>
        <p>A QA evaluator has suggested a custom action plan that may need to be added to the standard list.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Evaluation:</strong> ${evaluation.reference_number}</p>
          <p><strong>Agent:</strong> ${evaluation.agent_name}</p>
          <p><strong>Ticket:</strong> #${evaluation.ticket_id}</p>
          <p><strong>Audit Date:</strong> ${evaluation.audit_date}</p>
          <p><strong>Suggested By:</strong> ${evaluatorName || evaluatorEmail}</p>
        </div>
        
        <h3 style="color: #1a1a2e;">Custom Action(s) Suggested:</h3>
        <ul style="background: #fffbeb; padding: 20px 30px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          ${actionsListHtml}
        </ul>
        
        <p>Please review if this custom action should be added to the standard action plans list.</p>
        
        <a href="${evaluationUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Evaluation</a>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated notification from the Agent Portal.</p>
      </div>
    `;

    const emailResult = await sendEmail({
      to: recipients,
      subject,
      html: htmlContent,
    });

    if (!emailResult.success) {
      console.error('Failed to send custom action notification:', emailResult.error);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailResult.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Custom action notification sent for evaluation ${evaluationId} to ${recipients.join(', ')}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-custom-action-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
