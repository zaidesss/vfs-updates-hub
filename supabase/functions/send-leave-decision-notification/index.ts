import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeaveDecisionPayload {
  requestId: string;
  referenceNumber?: string;
  agentName: string;
  agentEmail: string;
  clientName: string;
  teamLeadName: string;
  role: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  outageReason: string;
  totalDays?: number;
  outageDurationHours?: number;
  decision: 'approved' | 'declined' | 'canceled';
  reviewedBy: string;
  remarks?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ error: "Database service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: LeaveDecisionPayload = await req.json();

    console.log("Sending decision notification for:", payload);

    // Get super admin, admin, and HR emails for CC
    const { data: recipientUsers, error: recipientError } = await supabase
      .from("user_roles")
      .select("email")
      .in("role", ["super_admin", "admin", "hr"]);

    if (recipientError) {
      console.error("Error fetching recipient emails:", recipientError);
    }

    // Get unique emails and exclude the agent's email
    const recipientEmails = [...new Set(recipientUsers?.map((u) => u.email) || [])].filter((e) => e !== payload.agentEmail);
    console.log("Recipient emails for CC (super admins, admins, hr):", recipientEmails);

    // Format dates
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      });
    };

    // Decision colors and labels
    const decisionConfig: Record<string, { color: string; label: string; emoji: string }> = {
      approved: { color: "#22c55e", label: "APPROVED", emoji: "✅" },
      declined: { color: "#ef4444", label: "DECLINED", emoji: "❌" },
      canceled: { color: "#6b7280", label: "CANCELED", emoji: "🚫" }
    };

    const config = decisionConfig[payload.decision];

    const refBadge = payload.referenceNumber 
      ? `<span style="background-color: ${config.color}22; color: ${config.color}; padding: 4px 10px; border-radius: 4px; font-family: monospace; font-size: 13px; margin-left: 10px;">${payload.referenceNumber}</span>` 
      : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Leave Request ${config.label}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${config.color}22 0%, ${config.color}11 100%); border-left: 4px solid ${config.color}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; color: ${config.color}; font-size: 24px;">
            ${config.emoji} Leave Request ${config.label} ${refBadge}
          </h1>
        </div>
        
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #374151; font-size: 18px;">Request Details</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 140px;">Agent Name:</td>
              <td style="padding: 8px 0; font-weight: 500;">${payload.agentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Client:</td>
              <td style="padding: 8px 0;">${payload.clientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Team Lead:</td>
              <td style="padding: 8px 0;">${payload.teamLeadName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Role:</td>
              <td style="padding: 8px 0;">${payload.role}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Date:</td>
              <td style="padding: 8px 0;">${formatDate(payload.startDate)} to ${formatDate(payload.endDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Time:</td>
              <td style="padding: 8px 0;">${payload.startTime} - ${payload.endTime} EST</td>
            </tr>
            ${payload.totalDays ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Duration:</td>
              <td style="padding: 8px 0;">${payload.totalDays} day(s), ${payload.outageDurationHours || 0} total hours</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Outage Reason:</td>
              <td style="padding: 8px 0;"><strong>${payload.outageReason}</strong></td>
            </tr>
          </table>
        </div>
        
        <div style="background: ${config.color}11; border: 1px solid ${config.color}33; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: ${config.color};">Decision Information</h3>
          <p style="margin: 0;"><strong>Status:</strong> ${config.label}</p>
          <p style="margin: 8px 0 0 0;"><strong>Reviewed by:</strong> ${payload.reviewedBy}</p>
          ${payload.remarks ? `<p style="margin: 8px 0 0 0;"><strong>Remarks:</strong> ${payload.remarks}</p>` : ''}
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p>This is an automated notification from VFS Agent Portal</p>
        </div>
      </body>
      </html>
    `;

    // Create in-app notification for the agent FIRST (before email attempt)
    // This ensures notification is created even if email fails
    try {
      await supabase.from('notifications').insert({
        user_email: payload.agentEmail.toLowerCase(),
        title: `${config.emoji} Leave Request ${config.label}`,
        message: `Your leave request${payload.referenceNumber ? ` (${payload.referenceNumber})` : ''} for ${payload.outageReason} has been ${payload.decision}`,
        type: 'leave_decision',
        reference_id: payload.requestId,
        reference_type: 'leave_request',
      });
      console.log("In-app notification created for leave decision");
    } catch (notifError) {
      console.error("Error creating in-app notification:", notifError);
    }

    // Send email to agent with admins in CC
    const emailPayload: Record<string, unknown> = {
      from: "VFS Agent Portal <notifications@resend.dev>",
      to: [payload.agentEmail],
      subject: `${config.emoji} ${payload.referenceNumber ? `[${payload.referenceNumber}] ` : ''}Leave Request ${config.label}: ${payload.agentName} - ${payload.outageReason}`,
      html: emailHtml,
    };

    if (recipientEmails.length > 0) {
      emailPayload.cc = recipientEmails;
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const emailResult = await emailResponse.json();
    console.log("Email send result:", emailResult);

    if (!emailResponse.ok) {
      console.error("Failed to send email:", emailResult);
      // Return success since notification was created, but note email failure
      return new Response(
        JSON.stringify({ success: true, notificationCreated: true, emailFailed: true, details: emailResult }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id, notificationCreated: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-leave-decision-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
