import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FailedEmail {
  id: string;
  function_name: string;
  recipient_email: string;
  subject: string | null;
  error_message: string | null;
  payload: any;
  retry_count: number;
  created_at: string;
}

serve(async (req: Request): Promise<Response> => {
  console.log("send-failed-emails-digest function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all unresolved failed emails
    const { data: failedEmails, error: fetchError } = await supabase
      .from('failed_emails')
      .select('*')
      .is('resolved_at', null)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!failedEmails || failedEmails.length === 0) {
      console.log("No failed emails to report");
      return new Response(
        JSON.stringify({ success: true, message: "No failed emails" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    console.log(`Found ${failedEmails.length} failed emails`);
    
    // Get HR email
    const { data: hrUsers } = await supabase
      .from('user_roles')
      .select('email')
      .eq('role', 'hr');
    
    const hrEmail = hrUsers?.[0]?.email || 'hr@virtualfreelancesolutions.com';
    
    // Build email content
    const emailRows = failedEmails.map((email: FailedEmail) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${email.function_name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${email.recipient_email}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${email.subject || 'N/A'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${email.error_message || 'Unknown error'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(email.created_at).toLocaleString()}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${email.retry_count}</td>
      </tr>
    `).join('');
    
    // Send digest email
    try {
      await resend.emails.send({
        from: "VFS Agent Portal <onboarding@resend.dev>",
        to: [hrEmail],
        subject: `⚠️ Failed Emails Digest - ${failedEmails.length} emails need attention`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <h2 style="color: #dc2626;">⚠️ Failed Emails Report</h2>
            <p>The following emails failed to send and may need manual follow-up:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Function</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Recipient</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Subject</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Error</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Time</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Retries</th>
                </tr>
              </thead>
              <tbody>
                ${emailRows}
              </tbody>
            </table>
            
            <p style="color: #666;">
              <strong>Action Required:</strong> Please review these failed emails and take appropriate action. 
              You may need to contact recipients directly or investigate the cause of failures.
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This is an automated daily digest from the VFS Agent Portal.
            </p>
          </div>
        `,
      });
      console.log("Digest email sent successfully");
      
      // Also create in-app notification
      await supabase.from('notifications').insert({
        user_email: hrEmail.toLowerCase(),
        title: '⚠️ Failed Emails Digest',
        message: `${failedEmails.length} emails failed to send. Check your email for details.`,
        type: 'system',
        reference_type: 'failed_emails',
      });
      
    } catch (emailErr) {
      console.error("Failed to send digest email:", emailErr);
      // Don't log this as a failed email to avoid recursion
    }

    return new Response(
      JSON.stringify({ success: true, count: failedEmails.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-failed-emails-digest:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
