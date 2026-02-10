import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeaveRequestNotificationPayload {
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
  attachmentUrl?: string;
  totalDays?: number;
  outageDurationHours?: number;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: LeaveRequestNotificationPayload = await req.json();
    console.log("Received leave request notification payload:", payload);

    // Fetch all super admins, admins, and HR emails
    const { data: recipients, error: recipientError } = await supabase
      .from("user_roles")
      .select("email, name, role")
      .in("role", ["super_admin", "admin", "hr"]);

    if (recipientError) {
      console.error("Error fetching recipient emails:", recipientError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch recipient emails" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!recipients || recipients.length === 0) {
      console.log("No recipients found to notify");
      return new Response(
        JSON.stringify({ message: "No recipients to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get unique emails (in case someone has multiple roles)
    const recipientEmails = [...new Set(recipients.map((r) => r.email))];
    console.log("Recipient emails (super admins, admins, hr):", recipientEmails);

    // Format dates nicely
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      });
    };

    const durationText = payload.totalDays && payload.outageDurationHours
      ? `${payload.totalDays} day(s) • ${payload.outageDurationHours} hours total`
      : "";

    // Parse attachmentUrl - handle both single URL and JSON array format
    let attachmentUrls: string[] = [];
    if (payload.attachmentUrl) {
      const val = payload.attachmentUrl.trim();
      if (val.startsWith('[')) {
        try { attachmentUrls = JSON.parse(val).filter((u: string) => u); } catch { attachmentUrls = [val]; }
      } else {
        attachmentUrls = [val];
      }
    }

    const attachmentSection = attachmentUrls.length > 0
      ? attachmentUrls.map((url: string, i: number) => `<tr>
          <td style="padding: 8px 0; color: #666;">${attachmentUrls.length === 1 ? 'Attachment:' : `Attachment ${i + 1}:`}</td>
          <td style="padding: 8px 0;"><a href="${url}" style="color: #2563eb;">View Attachment</a></td>
        </tr>`).join('')
      : "";

    const refDisplay = payload.referenceNumber ? `<span style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px;">${payload.referenceNumber}</span>` : '';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background-color: #1a1a2e; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">New Leave Request ${payload.referenceNumber || ''}</h1>
      </div>
      
      <!-- Content -->
      <div style="padding: 24px;">
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
          A new leave request ${refDisplay} has been submitted and requires your review.
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; color: #666; width: 140px;">Agent:</td>
            <td style="padding: 12px 0; font-weight: 600;">${payload.agentName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; color: #666;">Email:</td>
            <td style="padding: 12px 0;">${payload.agentEmail}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; color: #666;">Role:</td>
            <td style="padding: 12px 0;">${payload.role}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; color: #666;">Client:</td>
            <td style="padding: 12px 0;">${payload.clientName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; color: #666;">Team Lead:</td>
            <td style="padding: 12px 0;">${payload.teamLeadName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; color: #666;">Start:</td>
            <td style="padding: 12px 0;">${formatDate(payload.startDate)} at ${payload.startTime} EST</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; color: #666;">End:</td>
            <td style="padding: 12px 0;">${formatDate(payload.endDate)} at ${payload.endTime} EST</td>
          </tr>
          ${durationText ? `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; color: #666;">Duration:</td>
            <td style="padding: 12px 0;">${durationText}</td>
          </tr>` : ""}
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; color: #666;">Reason:</td>
            <td style="padding: 12px 0;">${payload.outageReason}</td>
          </tr>
          ${attachmentSection}
        </table>
        
        <p style="color: #666; font-size: 14px;">
          Please log in to the VFS Updates Hub to approve or decline this request.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8f9fa; padding: 16px 24px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          VFS Updates Hub • Leave Request Notification
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Send email using Gmail API
    const emailResult = await sendEmail({
      to: recipientEmails,
      cc: [payload.agentEmail],
      subject: `${payload.referenceNumber ? `[${payload.referenceNumber}] ` : ''}Leave Request: ${payload.agentName} - ${payload.outageReason}`,
      html: emailHtml,
    });
    
    if (!emailResult.success) {
      console.error("Error sending email:", emailResult.error);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailResult.error }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully:", emailResult.messageId);

    return new Response(
      JSON.stringify({ success: true, emailResult }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-leave-request-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
