import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
  console.log("send-status-change-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: StatusChangeRequest = await req.json();
    const { questionId, updateId, updateTitle, referenceNumber, questionAskerEmail, questionAskerName, newStatus, changedBy, changedByEmail } = payload;
    
    console.log(`Status change notification: ${referenceNumber || questionId} -> ${newStatus} by ${changedBy}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const refDisplay = referenceNumber ? `[${referenceNumber}] ` : '';
    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    
    // Determine who to notify based on who made the change
    const isChangedByAsker = changedByEmail.toLowerCase() === questionAskerEmail.toLowerCase();
    
    if (isChangedByAsker) {
      // User changed status - notify HR and admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('email, name')
        .in('role', ['admin', 'hr']);
      
      if (admins && admins.length > 0) {
        // Create in-app notifications for admins
        const notifications = admins.map(admin => ({
          user_email: admin.email.toLowerCase(),
          title: `${refDisplay}Question Status Changed`,
          message: `${questionAskerName || questionAskerEmail} marked their question about "${updateTitle}" as ${statusLabel}`,
          type: 'question_status',
          reference_id: updateId,
          reference_type: 'question',
        }));
        
        await supabase.from('notifications').insert(notifications);
        console.log(`Created ${notifications.length} in-app notifications for admins`);
        
        // Send email to HR
        const hrEmail = admins.find(a => a.email.toLowerCase().includes('hr@'))?.email;
        if (hrEmail) {
          try {
            await resend.emails.send({
              from: "VFS Agent Portal <onboarding@resend.dev>",
              to: [hrEmail],
              subject: `${refDisplay}Question Status: ${statusLabel} - ${updateTitle}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Question Status Changed</h2>
                  ${referenceNumber ? `<p style="color: #666;">Reference: <strong>${referenceNumber}</strong></p>` : ''}
                  <p><strong>${questionAskerName || questionAskerEmail}</strong> has changed their question status to <strong>${statusLabel}</strong>.</p>
                  <p><strong>Update:</strong> ${updateTitle}</p>
                  <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message from the VFS Agent Portal.</p>
                </div>
              `,
            });
            console.log("Email sent to HR");
          } catch (emailErr) {
            console.error("Failed to send email:", emailErr);
            // Log failed email
            await supabase.from('failed_emails').insert({
              function_name: 'send-status-change-notification',
              recipient_email: hrEmail,
              subject: `${refDisplay}Question Status: ${statusLabel} - ${updateTitle}`,
              error_message: emailErr instanceof Error ? emailErr.message : 'Unknown error',
              payload: payload,
            });
          }
        }
      }
    } else {
      // Admin/HR changed status - notify the question asker
      await supabase.from('notifications').insert({
        user_email: questionAskerEmail.toLowerCase(),
        title: `${refDisplay}Question Status Changed`,
        message: `${changedBy} changed your question status to ${statusLabel}`,
        type: 'question_status',
        reference_id: updateId,
        reference_type: 'question',
      });
      console.log("Created in-app notification for question asker");
      
      // Send email to question asker
      try {
        await resend.emails.send({
          from: "VFS Agent Portal <onboarding@resend.dev>",
          to: [questionAskerEmail],
          subject: `${refDisplay}Your Question Status: ${statusLabel}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Question Status Updated</h2>
              ${referenceNumber ? `<p style="color: #666;">Reference: <strong>${referenceNumber}</strong></p>` : ''}
              <p>Your question about <strong>"${updateTitle}"</strong> has been marked as <strong>${statusLabel}</strong> by ${changedBy}.</p>
              ${newStatus === 'closed' ? '<p style="color: #666;">This thread is now closed and cannot receive new replies.</p>' : ''}
              <p>Log in to the VFS Agent Portal to view the details.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message from the VFS Agent Portal.</p>
            </div>
          `,
        });
        console.log("Email sent to question asker");
      } catch (emailErr) {
        console.error("Failed to send email:", emailErr);
        await supabase.from('failed_emails').insert({
          function_name: 'send-status-change-notification',
          recipient_email: questionAskerEmail,
          subject: `${refDisplay}Your Question Status: ${statusLabel}`,
          error_message: emailErr instanceof Error ? emailErr.message : 'Unknown error',
          payload: payload,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-status-change-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
