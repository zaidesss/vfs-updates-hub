import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referenceNumber, requestedByName, requestedByEmail, targetEmail, fieldName, requestedValue, reason } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all super admins
    const { data: superAdmins, error: adminsError } = await supabase
      .from('user_roles')
      .select('email, name')
      .eq('role', 'super_admin');

    if (adminsError) throw adminsError;

    if (!superAdmins?.length) {
      return new Response(JSON.stringify({ message: 'No super admins configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let emailsSent = 0;
    for (const admin of superAdmins) {
      const emailResult = await sendEmail({
        to: [admin.email],
        subject: `Profile Change Request - ${referenceNumber}`,
        html: `
          <h2>New Profile Change Request</h2>
          <p>A new profile change request has been submitted and requires your review.</p>
          <table style="border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reference:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${referenceNumber}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Requested By:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${requestedByName || requestedByEmail}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Target Profile:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${targetEmail}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Field:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${fieldName}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Requested Value:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${requestedValue}</td></tr>
            ${reason ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${reason}</td></tr>` : ''}
          </table>
          <p>Please log in to the portal to review and approve/reject this request.</p>
        `,
      });
      
      if (emailResult.success) {
        emailsSent++;
      } else {
        console.error(`Failed to send email to ${admin.email}:`, emailResult.error);
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
