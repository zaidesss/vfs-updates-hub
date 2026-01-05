import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  email: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { email }: DeleteUserRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Starting comprehensive deletion for user: ${normalizedEmail}`);

    const deletionResults: Record<string, { success: boolean; error?: string }> = {};

    // 1. Delete from question_replies (references update_questions)
    const { error: repliesError } = await supabaseAdmin
      .from("question_replies")
      .delete()
      .eq("user_email", normalizedEmail);
    deletionResults.question_replies = { success: !repliesError, error: repliesError?.message };
    console.log(`question_replies: ${repliesError ? 'Error - ' + repliesError.message : 'Deleted'}`);

    // 2. Delete from update_questions
    const { error: questionsError } = await supabaseAdmin
      .from("update_questions")
      .delete()
      .eq("user_email", normalizedEmail);
    deletionResults.update_questions = { success: !questionsError, error: questionsError?.message };
    console.log(`update_questions: ${questionsError ? 'Error - ' + questionsError.message : 'Deleted'}`);

    // 3. Delete from leave_request_history (references leave_requests by request_id)
    // First get the user's leave request IDs
    const { data: leaveRequests } = await supabaseAdmin
      .from("leave_requests")
      .select("id")
      .eq("agent_email", normalizedEmail);
    
    if (leaveRequests && leaveRequests.length > 0) {
      const requestIds = leaveRequests.map(lr => lr.id);
      const { error: historyError } = await supabaseAdmin
        .from("leave_request_history")
        .delete()
        .in("request_id", requestIds);
      deletionResults.leave_request_history = { success: !historyError, error: historyError?.message };
      console.log(`leave_request_history: ${historyError ? 'Error - ' + historyError.message : 'Deleted'}`);
    } else {
      deletionResults.leave_request_history = { success: true };
      console.log(`leave_request_history: No records to delete`);
    }

    // 4. Delete from leave_requests
    const { error: leaveError } = await supabaseAdmin
      .from("leave_requests")
      .delete()
      .eq("agent_email", normalizedEmail);
    deletionResults.leave_requests = { success: !leaveError, error: leaveError?.message };
    console.log(`leave_requests: ${leaveError ? 'Error - ' + leaveError.message : 'Deleted'}`);

    // 5. Delete from acknowledgements
    const { error: ackError } = await supabaseAdmin
      .from("acknowledgements")
      .delete()
      .eq("agent_email", normalizedEmail);
    deletionResults.acknowledgements = { success: !ackError, error: ackError?.message };
    console.log(`acknowledgements: ${ackError ? 'Error - ' + ackError.message : 'Deleted'}`);

    // 6. Delete from notifications
    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("user_email", normalizedEmail);
    deletionResults.notifications = { success: !notifError, error: notifError?.message };
    console.log(`notifications: ${notifError ? 'Error - ' + notifError.message : 'Deleted'}`);

    // 7. Delete from notification_settings
    const { error: settingsError } = await supabaseAdmin
      .from("notification_settings")
      .delete()
      .eq("user_email", normalizedEmail);
    deletionResults.notification_settings = { success: !settingsError, error: settingsError?.message };
    console.log(`notification_settings: ${settingsError ? 'Error - ' + settingsError.message : 'Deleted'}`);

    // 8. Delete from reminder_logs
    const { error: reminderError } = await supabaseAdmin
      .from("reminder_logs")
      .delete()
      .eq("user_email", normalizedEmail);
    deletionResults.reminder_logs = { success: !reminderError, error: reminderError?.message };
    console.log(`reminder_logs: ${reminderError ? 'Error - ' + reminderError.message : 'Deleted'}`);

    // 9. Delete from agent_profiles
    const { error: profileError } = await supabaseAdmin
      .from("agent_profiles")
      .delete()
      .eq("email", normalizedEmail);
    deletionResults.agent_profiles = { success: !profileError, error: profileError?.message };
    console.log(`agent_profiles: ${profileError ? 'Error - ' + profileError.message : 'Deleted'}`);

    // 10. Delete from auth.users
    const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = userData?.users.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (authUser) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      deletionResults.auth_users = { success: !authDeleteError, error: authDeleteError?.message };
      console.log(`auth.users: ${authDeleteError ? 'Error - ' + authDeleteError.message : 'Deleted'}`);
    } else {
      deletionResults.auth_users = { success: true };
      console.log(`auth.users: User not found (may not have registered)`);
    }

    // 11. Delete from user_roles
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("email", normalizedEmail);
    deletionResults.user_roles = { success: !rolesError, error: rolesError?.message };
    console.log(`user_roles: ${rolesError ? 'Error - ' + rolesError.message : 'Deleted'}`);

    // Check if any critical deletions failed
    const criticalFailures = Object.entries(deletionResults)
      .filter(([key, result]) => !result.success && ['auth_users', 'user_roles'].includes(key));

    if (criticalFailures.length > 0) {
      console.error("Critical deletion failures:", criticalFailures);
      return new Response(
        JSON.stringify({ 
          error: "Partial deletion - some critical data could not be removed",
          details: deletionResults 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("User deleted successfully from all tables");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User deleted successfully from all tables",
        details: deletionResults 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in delete-user:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
