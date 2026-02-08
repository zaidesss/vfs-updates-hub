import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/gmail-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChangeEmailRequest {
  oldEmail: string;
  newEmail: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { oldEmail, newEmail }: ChangeEmailRequest = await req.json();

    if (!oldEmail || !newEmail) {
      return new Response(
        JSON.stringify({ error: "Both oldEmail and newEmail are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedOldEmail = oldEmail.toLowerCase().trim();
    const normalizedNewEmail = newEmail.toLowerCase().trim();

    console.log(`Changing email from ${normalizedOldEmail} to ${normalizedNewEmail}`);

    // 1. Find user in auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error listing users:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to find user" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authUser = userData.users.find(u => u.email?.toLowerCase() === normalizedOldEmail);
    
    if (!authUser) {
      return new Response(
        JSON.stringify({ error: "User not found in authentication system" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if new email already exists
    const existingUser = userData.users.find(u => u.email?.toLowerCase() === normalizedNewEmail);
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "New email address is already in use" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Update email in Supabase Auth
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      { email: normalizedNewEmail, email_confirm: true }
    );

    if (authUpdateError) {
      console.error("Error updating auth email:", authUpdateError);
      return new Response(
        JSON.stringify({ error: "Failed to update email in authentication system" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Updated email in auth.users");

    // 3. Update user_roles table
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .update({ email: normalizedNewEmail })
      .eq("email", normalizedOldEmail);

    if (rolesError) {
      console.error("Error updating user_roles:", rolesError);
    } else {
      console.log("Updated user_roles");
    }

    // 4. Update acknowledgements table
    const { error: ackError } = await supabaseAdmin
      .from("acknowledgements")
      .update({ agent_email: normalizedNewEmail })
      .eq("agent_email", normalizedOldEmail);

    if (ackError) {
      console.error("Error updating acknowledgements:", ackError);
    } else {
      console.log("Updated acknowledgements");
    }

    // 5. Update update_questions table
    const { error: questionsError } = await supabaseAdmin
      .from("update_questions")
      .update({ user_email: normalizedNewEmail })
      .eq("user_email", normalizedOldEmail);

    if (questionsError) {
      console.error("Error updating update_questions:", questionsError);
    } else {
      console.log("Updated update_questions");
    }

    // 6. Update leave_requests table
    const { error: leaveError } = await supabaseAdmin
      .from("leave_requests")
      .update({ agent_email: normalizedNewEmail })
      .eq("agent_email", normalizedOldEmail);

    if (leaveError) {
      console.error("Error updating leave_requests:", leaveError);
    } else {
      console.log("Updated leave_requests");
    }

    // 7. Update agent_profiles table
    const { error: profilesError } = await supabaseAdmin
      .from("agent_profiles")
      .update({ email: normalizedNewEmail })
      .eq("email", normalizedOldEmail);

    if (profilesError) {
      console.error("Error updating agent_profiles:", profilesError);
    } else {
      console.log("Updated agent_profiles");
    }

    // 8. Send email notification to new email address
    try {
      const emailResponse = await sendEmail({
        to: [normalizedNewEmail],
        subject: "Your Email Address Has Been Changed",
        html: `
          <h2>Email Address Changed</h2>
          <p>Hello,</p>
          <p>Your email address for VFS Agent Portal has been changed from <strong>${normalizedOldEmail}</strong> to <strong>${normalizedNewEmail}</strong>.</p>
          <p><strong>Important:</strong> Please log out and log back in with your new email address to continue using the portal.</p>
          <p>If you did not request this change, please contact your administrator immediately.</p>
          <br>
          <p>Best regards,<br>VFS Agent Portal Team</p>
        `,
      });
      console.log("Email notification sent:", emailResponse);
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
      // Don't fail the whole operation if email fails
    }

    console.log("Email change completed successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Email changed successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in change-user-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});