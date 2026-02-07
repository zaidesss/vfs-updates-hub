import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReplyNotificationRequest {
  questionId: string;
  updateId: string;
  updateTitle: string;
  replyText: string;
  repliedBy: string;
  userEmail: string;
  referenceNumber?: string;
}

serve(async (req: Request): Promise<Response> => {
  console.log("send-question-reply-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionId, updateId, updateTitle, replyText, repliedBy, userEmail, referenceNumber }: ReplyNotificationRequest = await req.json();
    
    console.log(`Processing reply notification for question ${questionId} (${referenceNumber || 'no ref'})`);
    console.log(`Update: ${updateTitle}, Replied by: ${repliedBy}, User: ${userEmail}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseServiceKey && userEmail) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        const refDisplay = referenceNumber ? `[${referenceNumber}] ` : '';
        await supabase.from('notifications').insert({
          user_email: userEmail.toLowerCase(),
          title: `${refDisplay}Question Answered`,
          message: `${repliedBy} replied to your question about "${updateTitle}"`,
          type: 'question_reply',
          reference_id: updateId,
          reference_type: 'question',
        });
        console.log("In-app notification created");
      } catch (notifError) {
        console.error("Error creating in-app notification:", notifError);
      }
    }

    if (!userEmail) {
      console.log("No user email provided, skipping email notification");
      return new Response(
        JSON.stringify({ success: true, message: "No email to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const refDisplay = referenceNumber ? `[${referenceNumber}] ` : '';
    const emailResult = await sendEmail({
      to: [userEmail],
      subject: `${refDisplay}Your question about "${updateTitle}" has been answered`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your Question Has Been Answered</h2>
          ${referenceNumber ? `<p style="color: #666; font-size: 14px; margin-bottom: 10px;">Reference: <strong>${referenceNumber}</strong></p>` : ''}
          <p>Hi,</p>
          <p>Your question about the update <strong>"${updateTitle}"</strong> has received a reply from <strong>${repliedBy}</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #555;">Reply:</h4>
            <p style="margin: 0; color: #333;">${replyText}</p>
          </div>
          
          <p>Log in to the VFS Agent Portal to view the full details.</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message from the VFS Agent Portal.
          </p>
        </div>
      `,
    });

    if (!emailResult.success) {
      console.error("Failed to send reply notification email:", emailResult.error);
    } else {
      console.log("Reply notification email sent successfully:", emailResult.messageId);
    }

    return new Response(
      JSON.stringify({ success: true, emailResult }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-question-reply-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
