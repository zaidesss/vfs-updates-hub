import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OverrideRequestPayload {
  referenceNumber: string;
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
  overrideReason: string;
  conflictingAgents: string;
  totalDays?: number;
  outageDurationHours?: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping notifications");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const payload: OverrideRequestPayload = await req.json();
    console.log("Processing override request notification for:", payload.referenceNumber);

    // Get all super admin, admin, and HR emails
    const { data: recipients, error: recipientError } = await supabase
      .from("user_roles")
      .select("email")
      .in("role", ["super_admin", "admin", "hr"]);

    if (recipientError) {
      console.error("Error fetching recipients:", recipientError);
      throw recipientError;
    }

    // Get unique emails
    const recipientEmails = [...new Set(recipients?.map(r => r.email) || [])];
    
    if (recipientEmails.length === 0) {
      console.log("No recipient emails found");
      return new Response(JSON.stringify({ success: true, message: "No recipients to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending override request to ${recipientEmails.length} recipients (super admins, admins, hr), CC: ${payload.agentEmail}`);

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    };

    const emailResponse = await resend.emails.send({
      from: "VFS Updates Hub <noreply@updates.virtualfreelancesolutions.com>",
      to: recipientEmails,
      cc: [payload.agentEmail],
      subject: `🚨 Override Approval Needed - ${payload.referenceNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 20px;">
            <h2 style="color: #92400e; margin: 0 0 8px 0;">⚠️ Leave Request Override Approval Needed</h2>
            <p style="color: #92400e; margin: 0;">Reference: <strong>${payload.referenceNumber}</strong></p>
          </div>
          
          <p style="color: #333;">A leave request has been submitted that conflicts with existing approved requests. Admin approval is required to override.</p>
          
          <div style="background-color: #fee2e2; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h3 style="color: #991b1b; margin: 0 0 8px 0;">⚡ Conflict Detected</h3>
            <p style="color: #991b1b; margin: 0;"><strong>Conflicting with:</strong> ${payload.conflictingAgents}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Agent Name:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${payload.agentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Client:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${payload.clientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Role:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${payload.role}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Team Lead:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${payload.teamLeadName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Date Range:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatDate(payload.startDate)} - ${formatDate(payload.endDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Time:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${payload.startTime} - ${payload.endTime} EST</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Reason:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${payload.outageReason}</td>
            </tr>
            ${payload.totalDays ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Duration:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${payload.totalDays} days (${payload.outageDurationHours || 0} hours total)</td>
            </tr>
            ` : ''}
          </table>
          
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h3 style="color: #374151; margin: 0 0 8px 0;">📝 Override Reason</h3>
            <p style="color: #4b5563; margin: 0;">${payload.overrideReason}</p>
          </div>
          
          <p style="color: #666; margin-top: 20px;">
            Please log in to the VFS Updates Hub to approve or decline this override request.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This is an automated message from VFS Updates Hub.
          </p>
        </div>
      `,
    });

    console.log("Override notification sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-override-request-notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
