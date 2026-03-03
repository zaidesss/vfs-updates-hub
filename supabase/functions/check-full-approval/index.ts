import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRE_APPROVERS = [
  { email: 'jaeransanchez@gmail.com', name: 'Jaeran' },
  { email: 'dzaydee06@gmail.com', name: 'Juno' },
  { email: 'joanargao@gmail.com', name: 'Kristin' },
  { email: 'mjesguerraiman@gmail.com', name: 'Meryl' },
];
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

    const preApprovals = approvals?.filter(a => a.stage === 1) || [];
    const preApprovalCount = preApprovals.filter(a => a.approved).length;
    const allPreApproved = preApprovalCount === PRE_APPROVERS.length;

    console.log(`Pre-approvals: ${preApprovalCount}/${PRE_APPROVERS.length}, All pre-approved: ${allPreApproved}`);

    // All pre-approvers have approved — move to pending_final_review
    if (request.status === 'pending' && allPreApproved) {
      console.log("All pre-approvers approved. Moving to pending_final_review.");

      const { error: updateError } = await supabase
        .from("article_requests")
        .update({ status: "pending_final_review" })
        .eq("id", requestId);

      if (updateError) {
        console.error("Error updating request status:", updateError);
      }

      // Fetch Super Admins, Admins, and HR from user_roles to notify
      const { data: reviewerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("email, role")
        .in("role", ["super_admin", "admin", "hr"]);

      if (rolesError) {
        console.error("Error fetching reviewer roles:", rolesError);
      }

      // De-duplicate emails
      const reviewerEmails = [...new Set((reviewerRoles || []).map(r => r.email))];
      console.log("Notifying reviewers:", reviewerEmails);

      if (reviewerEmails.length > 0) {
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
            to: reviewerEmails,
            subject: `[Final Review Required]${request.reference_number ? ` ${request.reference_number}:` : ''} Article Request Ready for Decision`,
            html,
          });
          console.log("Sent final review notification to reviewers");
        } catch (emailError) {
          console.error("Error sending notification to reviewers:", emailError);
        }
      }

      return new Response(
        JSON.stringify({
          status: "pending_final_review",
          message: "All pre-approvers approved. Waiting for Super Admin/HR final review.",
          preApprovalCount,
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
