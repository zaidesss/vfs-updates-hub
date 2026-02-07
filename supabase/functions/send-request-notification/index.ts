import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestNotificationPayload {
  requestId: string;
  referenceNumber?: string;
  submittedBy: string;
  description: string;
  category: string | null;
  requestType: string;
  sampleTicket: string | null;
  priority: string;
  approverEmails: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: RequestNotificationPayload = await req.json();

    console.log("Sending request notifications to approvers:", payload.approverEmails);

    const refBadge = payload.referenceNumber 
      ? `<span style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${payload.referenceNumber}</span>` 
      : '';

    const emailPromises = payload.approverEmails.map(email =>
      sendEmail({
        to: [email],
        subject: `${payload.referenceNumber ? `[${payload.referenceNumber}] ` : ''}New Article Request - ${payload.requestType === 'new_article' ? 'New Article' : 'Update Existing'}`,
        html: `
          <h2>New Article Request ${refBadge}</h2>
          <p>A new request requires your approval.</p>
          
          <table style="border-collapse: collapse; margin: 20px 0;">
            ${payload.referenceNumber ? `
            <tr>
              <td style="padding: 8px; font-weight: bold;">Reference:</td>
              <td style="padding: 8px;"><code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">${payload.referenceNumber}</code></td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px; font-weight: bold;">Submitted By:</td>
              <td style="padding: 8px;">${payload.submittedBy}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Request Type:</td>
              <td style="padding: 8px;">${payload.requestType === 'new_article' ? 'New Article' : payload.requestType === 'update_existing' ? 'Update Existing' : 'General'}</td>
            </tr>
            ${payload.category ? `
            <tr>
              <td style="padding: 8px; font-weight: bold;">Category:</td>
              <td style="padding: 8px;">${payload.category}</td>
            </tr>
            ` : ''}
            ${payload.sampleTicket ? `
            <tr>
              <td style="padding: 8px; font-weight: bold;">Sample Ticket:</td>
              <td style="padding: 8px;">${payload.sampleTicket}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px; font-weight: bold;">Priority:</td>
              <td style="padding: 8px;">${payload.priority}</td>
            </tr>
          </table>
          
          <h3>Description:</h3>
          <p style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${payload.description}</p>
          
          <p style="margin-top: 20px;">
            <strong>Please log in to the VFS Updates Hub to review and approve this request.</strong>
          </p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message from VFS Updates Hub.
          </p>
        `,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    const failedCount = results.filter(r => r.status === 'rejected' || !(r.value as any).success).length;

    console.log(`Sent ${successCount} emails, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending request notifications:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
