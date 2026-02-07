import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusChangeRequest {
  questionId: string;
  updateId: string;
  updateTitle: string;
  referenceNumber?: string;
  questionAskerEmail: string;
  questionAskerName?: string;
  newStatus: string;
  changedBy: string;
  changedByEmail: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  on_going: 'On-Going',
  answered: 'Answered',
  closed: 'Closed'
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: StatusChangeRequest = await req.json();
    const { questionId, updateId, updateTitle, referenceNumber, questionAskerEmail, questionAskerName, newStatus, changedBy, changedByEmail } = payload;
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const refDisplay = referenceNumber ? `[${referenceNumber}] ` : '';
    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    
    const isChangedByAsker = changedByEmail.toLowerCase() === questionAskerEmail.toLowerCase();
    
    if (isChangedByAsker) {
      const { data: admins } = await supabase.from('user_roles').select('email, name').in('role', ['admin', 'hr']);
      
      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_email: admin.email.toLowerCase(),
          title: `${refDisplay}Question Status Changed`,
          message: `${questionAskerName || questionAskerEmail} marked their question about "${updateTitle}" as ${statusLabel}`,
          type: 'question_status',
          reference_id: updateId,
          reference_type: 'question',
        }));
        await supabase.from('notifications').insert(notifications);
        
        const hrEmail = admins.find(a => a.email.toLowerCase().includes('hr@'))?.email;
        if (hrEmail) {
          const emailResult = await sendEmail({
            to: [hrEmail],
            subject: `${refDisplay}Question Status: ${statusLabel} - ${updateTitle}`,
            html: `<div style="font-family: Arial, sans-serif;"><h2>Question Status Changed</h2>${referenceNumber ? `<p>Reference: <strong>${referenceNumber}</strong></p>` : ''}<p><strong>${questionAskerName || questionAskerEmail}</strong> has changed their question status to <strong>${statusLabel}</strong>.</p><p><strong>Update:</strong> ${updateTitle}</p></div>`,
          });
          if (!emailResult.success) {
            await supabase.from('failed_emails').insert({ function_name: 'send-status-change-notification', recipient_email: hrEmail, subject: `${refDisplay}Question Status: ${statusLabel}`, error_message: emailResult.error, payload });
          }
        }
      }
    } else {
      await supabase.from('notifications').insert({ user_email: questionAskerEmail.toLowerCase(), title: `${refDisplay}Question Status Changed`, message: `${changedBy} changed your question status to ${statusLabel}`, type: 'question_status', reference_id: updateId, reference_type: 'question' });
      
      const emailResult = await sendEmail({
        to: [questionAskerEmail],
        subject: `${refDisplay}Your Question Status: ${statusLabel}`,
        html: `<div style="font-family: Arial, sans-serif;"><h2>Question Status Updated</h2>${referenceNumber ? `<p>Reference: <strong>${referenceNumber}</strong></p>` : ''}<p>Your question about <strong>"${updateTitle}"</strong> has been marked as <strong>${statusLabel}</strong> by ${changedBy}.</p></div>`,
      });
      if (!emailResult.success) {
        await supabase.from('failed_emails').insert({ function_name: 'send-status-change-notification', recipient_email: questionAskerEmail, subject: `${refDisplay}Your Question Status: ${statusLabel}`, error_message: emailResult.error, payload });
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
