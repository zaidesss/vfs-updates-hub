import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pre-approvers and final approver config
const PRE_APPROVERS = [
  { email: 'jaeransanchez@gmail.com', name: 'Jaeran' },
  { email: 'dzaydee06@gmail.com', name: 'Juno' },
  { email: 'joanargao@gmail.com', name: 'Kristin' },
  { email: 'mjesguerraiman@gmail.com', name: 'Meryl' },
];
const FINAL_APPROVER = { email: 'patrickargao@gmail.com', name: 'Patrick' };
const HR_EMAIL = 'hr@virtualfreelancesolutions.com';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId } = await req.json();
    console.log("Checking approval status for request:", requestId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the request
    const { data: request, error: requestError } = await supabase
      .from("article_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      console.error("Error fetching request:", requestError);
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all approvals for this request
    const { data: approvals, error: approvalsError } = await supabase
      .from("request_approvals")
      .select("*")
      .eq("request_id", requestId);

    if (approvalsError) {
      console.error("Error fetching approvals:", approvalsError);
      return new Response(JSON.stringify({ error: approvalsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Separate pre-approvals (stage 1) and final approval (stage 2)
    const preApprovals = approvals?.filter(a => a.stage === 1) || [];
    const finalApproval = approvals?.find(a => a.stage === 2);

    const preApprovalCount = preApprovals.filter(a => a.approved).length;
    const allPreApproved = preApprovalCount === PRE_APPROVERS.length;

    console.log(`Pre-approvals: ${preApprovalCount}/${PRE_APPROVERS.length}, All pre-approved: ${allPreApproved}`);

    // CASE 1: Request is pending and all pre-approvers have approved
    if (request.status === 'pending' && allPreApproved) {
      console.log("All pre-approvers approved. Moving to pending_final_review.");

      // Update request status to pending_final_review
      const { error: updateError } = await supabase
        .from("article_requests")
        .update({ status: "pending_final_review" })
        .eq("id", requestId);

      if (updateError) {
        console.error("Error updating request status:", updateError);
      }

      // Create or activate Patrick's approval record (stage 2)
      if (!finalApproval) {
        const { error: insertError } = await supabase
          .from("request_approvals")
          .insert({
            request_id: requestId,
            approver_email: FINAL_APPROVER.email,
            approver_name: FINAL_APPROVER.name,
            approved: false,
            stage: 2,
            active: true,
          });

        if (insertError) {
          console.error("Error creating final approver record:", insertError);
        }
      } else {
        // Activate existing record
        const { error: activateError } = await supabase
          .from("request_approvals")
          .update({ active: true })
          .eq("id", finalApproval.id);

        if (activateError) {
          console.error("Error activating final approver:", activateError);
        }
      }

      // Notify Patrick that it's ready for final review
      const html = `
        <h2>Article Request Ready for Final Review</h2>
        ${request.reference_number ? `<p><strong>Reference:</strong> ${request.reference_number}</p>` : ''}
        <p>All pre-approvers have approved the following request. Your final decision is needed.</p>
        <p><strong>Submitted by:</strong> ${request.submitted_by}</p>
        <p><strong>Type:</strong> ${request.request_type}</p>
        <p><strong>Category:</strong> ${request.category || 'Not specified'}</p>
        <p><strong>Priority:</strong> ${request.priority}</p>
        <p><strong>Description:</strong></p>
        <p>${request.description}</p>
        ${request.sample_ticket ? `<p><strong>Sample Ticket:</strong> ${request.sample_ticket}</p>` : ''}
        <p style="margin-top: 20px;">
          Please log in to the VFS Updates Hub to review and make your decision.
        </p>
      `;
      
      try {
        await sendEmail({
          to: [FINAL_APPROVER.email],
          subject: `[Final Review Required]${request.reference_number ? ` ${request.reference_number}:` : ''} Article Request Ready for Decision`,
          html,
        });
        console.log("Sent final review notification to Patrick");
      } catch (emailError) {
        console.error("Error sending notification to Patrick:", emailError);
      }

      return new Response(
        JSON.stringify({
          status: "pending_final_review",
          message: "All pre-approvers approved. Waiting for final review by Patrick.",
          preApprovalCount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CASE 2: Request is pending_final_review and Patrick has approved
    if (request.status === 'pending_final_review' && finalApproval?.approved) {
      console.log("Final approval complete. Marking as approved and notifying HR.");

      // Update request status to approved
      const { error: updateError } = await supabase
        .from("article_requests")
        .update({ status: "approved" })
        .eq("id", requestId);

      if (updateError) {
        console.error("Error updating request to approved:", updateError);
      }

      // Notify HR
      try {
        const emailHtml = `
          <h2>Article Request Fully Approved</h2>
          ${request.reference_number ? `<p><strong>Reference:</strong> ${request.reference_number}</p>` : ''}
          <p>The following request has been fully approved and is ready for action.</p>
          <p><strong>Submitted by:</strong> ${request.submitted_by}</p>
          <p><strong>Type:</strong> ${request.request_type}</p>
          <p><strong>Category:</strong> ${request.category || 'Not specified'}</p>
          <p><strong>Priority:</strong> ${request.priority}</p>
          <p><strong>Description:</strong></p>
          <p>${request.description}</p>
          ${request.sample_ticket ? `<p><strong>Sample Ticket:</strong> ${request.sample_ticket}</p>` : ''}
          <p><strong>Final Decision:</strong> ${request.final_decision || 'Approved'}</p>
          ${request.final_notes ? `<p><strong>Final Notes:</strong> ${request.final_notes}</p>` : ''}
        `;
        await sendEmail({
          to: [HR_EMAIL],
          subject: `[Approved]${request.reference_number ? ` ${request.reference_number}:` : ''} Article Request: ${request.request_type}`,
          html: emailHtml,
        });
        console.log("Sent approval notification to HR");
      } catch (emailError) {
        console.error("Error sending HR notification:", emailError);
      }

      return new Response(
        JSON.stringify({
          status: "approved",
          message: "Request fully approved. HR has been notified.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: Still pending
    return new Response(
      JSON.stringify({
        status: request.status,
        preApprovalCount,
        totalPreApprovers: PRE_APPROVERS.length,
        message: `Waiting for more approvals. ${preApprovalCount}/${PRE_APPROVERS.length} pre-approved.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in check-full-approval:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
