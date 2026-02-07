import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: failedEmails, error: fetchError } = await supabase
      .from('failed_emails')
      .select('*')
      .is('resolved_at', null)
      .order('created_at', { ascending: false });
    
    if (fetchError) throw fetchError;
    
    if (!failedEmails || failedEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No failed emails" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    
    const { data: hrUsers } = await supabase.from('user_roles').select('email').eq('role', 'hr');
    const hrEmail = hrUsers?.[0]?.email || 'hr@virtualfreelancesolutions.com';
    
    const emailRows = failedEmails.map(email => `<tr><td style="padding: 10px; border-bottom: 1px solid #eee;">${email.function_name}</td><td style="padding: 10px;">${email.recipient_email}</td><td style="padding: 10px;">${email.subject || 'N/A'}</td><td style="padding: 10px;">${email.error_message || 'Unknown'}</td><td style="padding: 10px;">${new Date(email.created_at).toLocaleString()}</td></tr>`).join('');
    
    const emailResult = await sendEmail({
      to: [hrEmail],
      subject: `⚠️ Failed Emails Digest - ${failedEmails.length} emails need attention`,
      html: `<div style="font-family: Arial, sans-serif;"><h2 style="color: #dc2626;">⚠️ Failed Emails Report</h2><p>${failedEmails.length} emails failed to send.</p><table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #f5f5f5;"><th style="padding: 10px; text-align: left;">Function</th><th style="padding: 10px;">Recipient</th><th style="padding: 10px;">Subject</th><th style="padding: 10px;">Error</th><th style="padding: 10px;">Time</th></tr></thead><tbody>${emailRows}</tbody></table></div>`,
    });
    
    if (emailResult.success) {
      await supabase.from('notifications').insert({ user_email: hrEmail.toLowerCase(), title: '⚠️ Failed Emails Digest', message: `${failedEmails.length} emails failed to send.`, type: 'system', reference_type: 'failed_emails' });
    }

    return new Response(JSON.stringify({ success: true, count: failedEmails.length }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
