import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HR_EMAIL = 'hr@virtualfreelancesolutions.com';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId } = await req.json();
    
    if (!requestId) {
      return new Response(
        JSON.stringify({ error: 'requestId is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all approvals for this request
    const { data: approvals, error: approvalsError } = await supabase
      .from('request_approvals')
      .select('*')
      .eq('request_id', requestId);

    if (approvalsError) {
      console.error('Error fetching approvals:', approvalsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch approvals' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if all approvals are complete
    const allApproved = approvals?.every(a => a.approved === true);
    const approvedCount = approvals?.filter(a => a.approved).length || 0;
    const totalCount = approvals?.length || 0;

    console.log(`Request ${requestId}: ${approvedCount}/${totalCount} approvals`);

    if (!allApproved) {
      return new Response(
        JSON.stringify({ 
          fullyApproved: false, 
          approvedCount, 
          totalCount,
          message: 'Not all approvers have approved yet' 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All approved! Update request status
    const { error: updateError } = await supabase
      .from('article_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request status:', updateError);
    }

    // Fetch the request details for the email
    const { data: request, error: requestError } = await supabase
      .from('article_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError) {
      console.error('Error fetching request:', requestError);
    }

    // Send email to HR using Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey && request) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: "VFS Updates Hub <onboarding@resend.dev>",
            to: [HR_EMAIL],
            subject: `✅ Request Approved - Please Create Article`,
            html: `
              <h2>Article Request Fully Approved</h2>
              <p>All required approvers have approved the following request. Please create the article or guide.</p>
              
              <table style="border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Submitted By:</td>
                  <td style="padding: 8px;">${request.submitted_by}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Request Type:</td>
                  <td style="padding: 8px;">${request.request_type === 'new_article' ? 'New Article' : request.request_type === 'update_existing' ? 'Update Existing' : 'General'}</td>
                </tr>
                ${request.category ? `
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Category:</td>
                  <td style="padding: 8px;">${request.category}</td>
                </tr>
                ` : ''}
                ${request.sample_ticket ? `
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Sample Ticket:</td>
                  <td style="padding: 8px;">${request.sample_ticket}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Priority:</td>
                  <td style="padding: 8px;">${request.priority}</td>
                </tr>
              </table>
              
              <h3>Description:</h3>
              <p style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${request.description}</p>
              
              <h3>Approvers:</h3>
              <ul>
                ${approvals?.map(a => `<li>${a.approver_name || a.approver_email} - Approved ✓</li>`).join('')}
              </ul>
              
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                This is an automated message from VFS Updates Hub.
              </p>
            `,
          }),
        });
        
        if (emailResponse.ok) {
          console.log('Sent approval notification to HR');
        } else {
          const errorText = await emailResponse.text();
          console.error('Error sending HR email:', errorText);
        }
      } catch (emailError) {
        console.error('Error sending HR email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        fullyApproved: true, 
        approvedCount, 
        totalCount,
        message: 'All approvers have approved. HR has been notified.' 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in check-full-approval:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
