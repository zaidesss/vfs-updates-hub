import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HR_EMAIL = 'hr@virtualfreelancesolutions.com';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, approverEmail, decision, notes } = await req.json();
    console.log("Finalize review:", { requestId, approverEmail, decision });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the approver has Super Admin, Admin, or HR role
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("email", approverEmail.toLowerCase())
      .in("role", ["super_admin", "admin", "hr"]);

    if (rolesError || !roles || roles.length === 0) {
      console.error("Unauthorized: Not a Super Admin, Admin, or HR user");
      return new Response(
        JSON.stringify({ error: "Only Super Admins, Admins, or HR can finalize requests" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate decision
    const validDecisions = ['create_new', 'update_existing', 'reject', 'escalate_to_improvements'];
    if (!validDecisions.includes(decision)) {
      return new Response(
        JSON.stringify({ error: "Invalid decision. Must be: create_new, update_existing, reject, or escalate_to_improvements" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // If escalate_to_improvements, create an improvement entry
    if (decision === 'escalate_to_improvements') {
      const priorityMap: Record<string, string> = {
        'low': 'low',
        'normal': 'medium',
        'high': 'high',
        'urgent': 'high',
      };

      const { error: improvementError } = await supabase
        .from("improvements")
        .insert({
          category: request.category || 'Other',
          task: (request.description || '').substring(0, 200),
          description: request.description,
          priority: priorityMap[request.priority] || 'medium',
          status: 'not_started',
          requested_by_email: request.submitted_by,
          notes: request.reference_number
            ? `Escalated from Article Request ${request.reference_number}`
            : `Escalated from Article Request`,
        });

      if (improvementError) {
        console.error("Error creating improvement:", improvementError);
        // Don't fail the whole request, just log it
      } else {
        console.log("Created improvement entry from escalated request");
      }
    }

    // Send notification to HR
    const decisionLabels: Record<string, string> = {
      'create_new': 'Create New Article',
      'update_existing': 'Update Existing Article',
      'reject': 'Rejected',
      'escalate_to_improvements': 'Escalated to Improvements',
    };

    const statusLabel = decision === 'reject' ? 'Rejected' : 'Approved';

    try {
      const html = `
        <h2>Article Request ${statusLabel}</h2>
        ${request.reference_number ? `<p><strong>Reference:</strong> ${request.reference_number}</p>` : ''}
        <p>A final review has been completed for the following request.</p>
        <p><strong>Reviewed by:</strong> ${approverEmail}</p>
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
      `;
      
      await sendEmail({
        to: [HR_EMAIL],
        subject: `[${statusLabel}]${request.reference_number ? ` ${request.reference_number}:` : ''} Article Request: ${decisionLabels[decision]}`,
        html,
      });
      console.log("Sent final decision notification to HR");
    } catch (emailError) {
      console.error("Error sending HR notification:", emailError);
    }

    // Notify the original submitter
    try {
      const html = `
        <h2>Your Request has been ${statusLabel}</h2>
        ${request.reference_number ? `<p><strong>Reference:</strong> ${request.reference_number}</p>` : ''}
        <p><strong>Decision:</strong> ${decisionLabels[decision]}</p>
        ${notes ? `<p><strong>Reviewer Notes:</strong> ${notes}</p>` : ''}
        <hr style="margin: 20px 0;">
        <p><strong>Your Original Request:</strong></p>
        <p>${request.description}</p>
      `;
      
      await sendEmail({
        to: [request.submitted_by],
        subject: `Your Article Request${request.reference_number ? ` (${request.reference_number})` : ''} has been ${statusLabel}`,
        html,
      });
      console.log("Sent notification to submitter:", request.submitted_by);
    } catch (emailError) {
      console.error("Error sending submitter notification:", emailError);
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
