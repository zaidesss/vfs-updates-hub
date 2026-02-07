import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch pending requests (both 'pending' and 'pending_final_review')
    const { data: pendingRequests, error: requestsError } = await supabase
      .from('article_requests')
      .select('*')
      .in('status', ['pending', 'pending_final_review']);

    if (requestsError) {
      console.error('Error fetching pending requests:', requestsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending requests' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      console.log('No pending requests');
      return new Response(
        JSON.stringify({ success: true, reminders: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let remindersSent = 0;

    for (const request of pendingRequests) {
      // Get only ACTIVE pending approvals for this request
      const { data: pendingApprovals, error: approvalsError } = await supabase
        .from('request_approvals')
        .select('*')
        .eq('request_id', request.id)
        .eq('approved', false)
        .eq('active', true);

      if (approvalsError) {
        console.error('Error fetching approvals for request:', request.id, approvalsError);
        continue;
      }

      if (!pendingApprovals || pendingApprovals.length === 0) {
        continue;
      }

      // Send reminders to pending active approvers
      for (const approval of pendingApprovals) {
        const isFinalReview = approval.stage === 2;
        const refLabel = request.reference_number ? ` (${request.reference_number})` : '';
        const subject = isFinalReview 
          ? `[Final Review Reminder]${refLabel} Article Request Awaiting Your Decision`
          : `⏰ Reminder:${refLabel} Article Request Awaiting Your Approval`;

        try {
          const emailResult = await sendEmail({
            to: [approval.approver_email],
            subject,
            html: `
              <h2>${isFinalReview ? 'Final Review Reminder' : 'Approval Reminder'}</h2>
              <p>Hi ${approval.approver_name || 'there'},</p>
              <p>This is a reminder that the following article request is waiting for your ${isFinalReview ? 'final decision' : 'approval'}.</p>
              
              <table style="border-collapse: collapse; margin: 20px 0;">
                ${request.reference_number ? `<tr>
                  <td style="padding: 8px; font-weight: bold;">Reference:</td>
                  <td style="padding: 8px;"><strong>${request.reference_number}</strong></td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Submitted By:</td>
                  <td style="padding: 8px;">${request.submitted_by}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Request Type:</td>
                  <td style="padding: 8px;">${request.request_type === 'new_article' ? 'New Article' : request.request_type === 'update_existing' ? 'Update Existing' : 'General'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Priority:</td>
                  <td style="padding: 8px;">${request.priority}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Submitted:</td>
                  <td style="padding: 8px;">${new Date(request.submitted_at).toLocaleDateString()}</td>
                </tr>
              </table>
              
              <h3>Description:</h3>
              <p style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${request.description}</p>
              
              <p style="margin-top: 20px;">
                <strong>Please log in to the VFS Updates Hub to ${isFinalReview ? 'review and make your decision' : 'approve this request'}.</strong>
              </p>
              
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                This is an automated daily reminder from VFS Updates Hub.
              </p>
            `,
          });
          
          if (emailResult.success) {
            remindersSent++;
            console.log(`Sent reminder to ${approval.approver_email} for request ${request.id}`);
          } else {
            console.error(`Error sending reminder to ${approval.approver_email}:`, emailResult.error);
          }
        } catch (emailError) {
          console.error(`Error sending reminder to ${approval.approver_email}:`, emailError);
        }
      }
    }

    console.log(`Sent ${remindersSent} reminders`);

    return new Response(
      JSON.stringify({ success: true, reminders: remindersSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-approval-reminders:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
