import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StageNotificationRequest {
  requestId: string;
  referenceNumber: string;
  requestDescription: string;
  submitterEmail: string;
  submitterName?: string;
  stage: number;
  approverEmail: string;
  approverName?: string;
  approved: boolean;
  isRejection?: boolean;
  nextApproverEmail?: string;
  nextApproverName?: string;
}

serve(async (req: Request): Promise<Response> => {
  console.log("send-request-stage-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: StageNotificationRequest = await req.json();
    const { 
      requestId, 
      referenceNumber, 
      requestDescription, 
      submitterEmail, 
      submitterName,
      stage, 
      approverEmail, 
      approverName,
      approved, 
      isRejection,
      nextApproverEmail,
      nextApproverName
    } = payload;
    
    console.log(`Stage notification: ${referenceNumber} - Stage ${stage} - ${approved ? 'Approved' : 'Rejected'}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const refDisplay = `[${referenceNumber}] `;
    
    // Notify submitter about stage approval/rejection
    const statusText = isRejection ? 'Rejected' : (approved ? `Approved (Stage ${stage})` : 'Updated');
    const statusEmoji = isRejection ? '❌' : (approved ? '✅' : '📋');
    
    // In-app notification for submitter
    await supabase.from('notifications').insert({
      user_email: submitterEmail.toLowerCase(),
      title: `${refDisplay}Request ${statusText}`,
      message: `Your request has been ${statusText.toLowerCase()} by ${approverName || approverEmail}`,
      type: 'request_status',
      reference_id: requestId,
      reference_type: 'request',
    });
    console.log("Created in-app notification for submitter");
    
    // Email to submitter
    try {
      await resend.emails.send({
        from: "VFS Agent Portal <onboarding@resend.dev>",
        to: [submitterEmail],
        subject: `${statusEmoji} ${refDisplay}Request ${statusText}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${isRejection ? '#dc2626' : '#22c55e'};">${statusEmoji} Request ${statusText}</h2>
            <p><strong>Reference:</strong> ${referenceNumber}</p>
            <p>Your request has been ${statusText.toLowerCase()} by <strong>${approverName || approverEmail}</strong>.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Request:</strong></p>
              <p style="margin: 5px 0; color: #333;">${requestDescription.substring(0, 200)}${requestDescription.length > 200 ? '...' : ''}</p>
            </div>
            
            ${isRejection ? '<p style="color: #dc2626;">This request has been rejected and will not proceed further.</p>' : ''}
            ${!isRejection && nextApproverEmail ? `<p>The request is now pending review by the next approver.</p>` : ''}
            
            <p>Log in to the VFS Agent Portal to view the details.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message from the VFS Agent Portal.</p>
          </div>
        `,
      });
      console.log("Email sent to submitter");
    } catch (emailErr) {
      console.error("Failed to send email to submitter:", emailErr);
      await supabase.from('failed_emails').insert({
        function_name: 'send-request-stage-notification',
        recipient_email: submitterEmail,
        subject: `${statusEmoji} ${refDisplay}Request ${statusText}`,
        error_message: emailErr instanceof Error ? emailErr.message : 'Unknown error',
        payload: payload,
      });
    }
    
    // If approved and there's a next approver, notify them
    if (approved && !isRejection && nextApproverEmail) {
      // In-app notification for next approver
      await supabase.from('notifications').insert({
        user_email: nextApproverEmail.toLowerCase(),
        title: `${refDisplay}Request Pending Your Approval`,
        message: `A request from ${submitterName || submitterEmail} is waiting for your approval`,
        type: 'request_pending',
        reference_id: requestId,
        reference_type: 'request',
      });
      console.log("Created in-app notification for next approver");
      
      // Email to next approver
      try {
        await resend.emails.send({
          from: "VFS Agent Portal <onboarding@resend.dev>",
          to: [nextApproverEmail],
          subject: `📋 ${refDisplay}Request Awaiting Your Approval`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3b82f6;">📋 Request Awaiting Your Approval</h2>
              <p><strong>Reference:</strong> ${referenceNumber}</p>
              <p>A request from <strong>${submitterName || submitterEmail}</strong> has been approved by ${approverName || approverEmail} and is now pending your approval.</p>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Request:</strong></p>
                <p style="margin: 5px 0; color: #333;">${requestDescription.substring(0, 200)}${requestDescription.length > 200 ? '...' : ''}</p>
              </div>
              
              <p>Please log in to the VFS Agent Portal to review and approve/reject this request.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message from the VFS Agent Portal.</p>
            </div>
          `,
        });
        console.log("Email sent to next approver");
      } catch (emailErr) {
        console.error("Failed to send email to next approver:", emailErr);
        await supabase.from('failed_emails').insert({
          function_name: 'send-request-stage-notification',
          recipient_email: nextApproverEmail,
          subject: `📋 ${refDisplay}Request Awaiting Your Approval`,
          error_message: emailErr instanceof Error ? emailErr.message : 'Unknown error',
          payload: { ...payload, notificationType: 'next_approver' },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-request-stage-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
