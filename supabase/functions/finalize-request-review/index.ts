import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FINAL_APPROVER_EMAIL = 'patrickargao@gmail.com';
const HR_EMAIL = 'hr@virtualfreelancesolutions.com';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, approverEmail, decision, notes } = await req.json();
    console.log("Finalize review:", { requestId, approverEmail, decision });

    // Verify the approver is Patrick
    if (approverEmail.toLowerCase() !== FINAL_APPROVER_EMAIL.toLowerCase()) {
      console.error("Unauthorized: Not the final approver");
      return new Response(
        JSON.stringify({ error: "Only the final approver can finalize requests" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate decision
    const validDecisions = ['create_new', 'update_existing', 'reject'];
    if (!validDecisions.includes(decision)) {
      return new Response(
        JSON.stringify({ error: "Invalid decision. Must be: create_new, update_existing, or reject" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify request exists and is in pending_final_review status
    const { data: request, error: requestError } = await supabase
      .from("article_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      console.error("Error fetching request:", requestError);
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (request.status !== 'pending_final_review') {
      return new Response(
        JSON.stringify({ error: "Request is not pending final review" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const finalStatus = decision === 'reject' ? 'rejected' : 'approved';

    // Update the request with final decision
    const { error: updateRequestError } = await supabase
      .from("article_requests")
      .update({
        status: finalStatus,
        final_decision: decision,
        final_notes: notes || null,
        final_reviewed_at: now,
        final_reviewed_by: approverEmail,
      })
      .eq("id", requestId);

    if (updateRequestError) {
      console.error("Error updating request:", updateRequestError);
      return new Response(
        JSON.stringify({ error: updateRequestError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark Patrick's approval as complete
    const { error: approvalError } = await supabase
      .from("request_approvals")
      .update({
        approved: true,
        approved_at: now,
      })
      .eq("request_id", requestId)
      .eq("approver_email", FINAL_APPROVER_EMAIL);

    if (approvalError) {
      console.error("Error updating approval:", approvalError);
    }

    // Send notification to HR
    if (resendApiKey) {
      const decisionLabels: Record<string, string> = {
        'create_new': 'Create New Article',
        'update_existing': 'Update Existing Article',
        'reject': 'Rejected',
      };

      const statusLabel = decision === 'reject' ? 'Rejected' : 'Approved';

      try {
        // Notify HR
        const hrEmailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: "VFS Updates Hub <onboarding@resend.dev>",
            to: [HR_EMAIL],
            subject: `[${statusLabel}] Article Request: ${decisionLabels[decision]}`,
            html: `
              <h2>Article Request ${statusLabel}</h2>
              <p>Patrick has completed the final review for the following request.</p>
              <p><strong>Decision:</strong> ${decisionLabels[decision]}</p>
              ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
              <hr style="margin: 20px 0;">
              <p><strong>Submitted by:</strong> ${request.submitted_by}</p>
              <p><strong>Request Type:</strong> ${request.request_type}</p>
              <p><strong>Category:</strong> ${request.category || 'Not specified'}</p>
              <p><strong>Priority:</strong> ${request.priority}</p>
              <p><strong>Description:</strong></p>
              <p>${request.description}</p>
              ${request.sample_ticket ? `<p><strong>Sample Ticket:</strong> ${request.sample_ticket}</p>` : ''}
            `,
          }),
        });
        if (hrEmailResponse.ok) {
          console.log("Sent final decision notification to HR");
        } else {
          console.error("Error sending HR notification:", await hrEmailResponse.text());
        }
      } catch (emailError) {
        console.error("Error sending HR notification:", emailError);
      }

      // Also notify the original submitter
      try {
        const submitterEmailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: "VFS Updates Hub <onboarding@resend.dev>",
            to: [request.submitted_by],
            subject: `Your Article Request has been ${statusLabel}`,
            html: `
              <h2>Your Request has been ${statusLabel}</h2>
              <p><strong>Decision:</strong> ${decisionLabels[decision]}</p>
              ${notes ? `<p><strong>Reviewer Notes:</strong> ${notes}</p>` : ''}
              <hr style="margin: 20px 0;">
              <p><strong>Your Original Request:</strong></p>
              <p>${request.description}</p>
            `,
          }),
        });
        if (submitterEmailResponse.ok) {
          console.log("Sent notification to submitter:", request.submitted_by);
        } else {
          console.error("Error sending submitter notification:", await submitterEmailResponse.text());
        }
      } catch (emailError) {
        console.error("Error sending submitter notification:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: finalStatus,
        decision,
        message: `Request ${finalStatus}. HR and submitter have been notified.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in finalize-request-review:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
