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

    const deletionResults: Record<string, { success: boolean; error?: string; count?: number }> = {};

    // First, get the user's name from user_roles for the "deleted user" label
    const { data: userRoleData } = await supabaseAdmin
      .from("user_roles")
      .select("name, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    // Create the deleted user label (e.g., "blakeducati_deleted user")
    const userName = userRoleData?.name || normalizedEmail.split('@')[0];
    const deletedUserLabel = `${userName}_deleted user`;
    console.log(`Will mark updates as posted by: ${deletedUserLabel}`);

    // 1. Update updates posted_by to "username_deleted user" (for admins who posted updates)
    const { data: updatedUpdates, error: updatePostedByError } = await supabaseAdmin
      .from("updates")
      .update({ posted_by: deletedUserLabel })
      .eq("posted_by", normalizedEmail)
      .select("id");
    deletionResults.updates_posted_by = { 
      success: !updatePostedByError, 
      error: updatePostedByError?.message,
      count: updatedUpdates?.length || 0
    };
    console.log(`updates.posted_by: ${updatePostedByError ? 'Error - ' + updatePostedByError.message : `Updated ${updatedUpdates?.length || 0} records`}`);

    // 2. Update update_change_history changed_by
    const { data: updatedHistory, error: historyChangedByError } = await supabaseAdmin
      .from("update_change_history")
      .update({ changed_by: deletedUserLabel })
      .eq("changed_by", normalizedEmail)
      .select("id");
    deletionResults.update_change_history = { 
      success: !historyChangedByError, 
      error: historyChangedByError?.message,
      count: updatedHistory?.length || 0
    };
    console.log(`update_change_history.changed_by: ${historyChangedByError ? 'Error - ' + historyChangedByError.message : `Updated ${updatedHistory?.length || 0} records`}`);

    // 3. Delete from question_replies (references update_questions)
    const { error: repliesError } = await supabaseAdmin
      .from("question_replies")
      .delete()
      .eq("user_email", normalizedEmail);
    deletionResults.question_replies = { success: !repliesError, error: repliesError?.message };
    console.log(`question_replies: ${repliesError ? 'Error - ' + repliesError.message : 'Deleted'}`);

    // 4. Delete from update_questions
    const { error: questionsError } = await supabaseAdmin
      .from("update_questions")
      .delete()
      .eq("user_email", normalizedEmail);
    deletionResults.update_questions = { success: !questionsError, error: questionsError?.message };
    console.log(`update_questions: ${questionsError ? 'Error - ' + questionsError.message : 'Deleted'}`);

    // 5. Delete from leave_request_history (references leave_requests by request_id)
    const { data: leaveRequests } = await supabaseAdmin
      .from("leave_requests")
      .select("id")
      .eq("agent_email", normalizedEmail);
    
    if (leaveRequests && leaveRequests.length > 0) {
      const requestIds = leaveRequests.map(lr => lr.id);
      const { error: historyError } = await supabaseAdmin
        .from("leave_request_history")
        .delete()
        .in("leave_request_id", requestIds);
      deletionResults.leave_request_history = { success: !historyError, error: historyError?.message };
      console.log(`leave_request_history: ${historyError ? 'Error - ' + historyError.message : 'Deleted'}`);
    } else {
      deletionResults.leave_request_history = { success: true };
      console.log(`leave_request_history: No records to delete`);
    }

    // 6. Delete from leave_requests
    const { error: leaveError } = await supabaseAdmin
      .from("leave_requests")
      .delete()
      .eq("agent_email", normalizedEmail);
    deletionResults.leave_requests = { success: !leaveError, error: leaveError?.message };
    console.log(`leave_requests: ${leaveError ? 'Error - ' + leaveError.message : 'Deleted'}`);

    // 7. Delete from acknowledgements
    const { error: ackError } = await supabaseAdmin
      .from("acknowledgements")
      .delete()
      .eq("agent_email", normalizedEmail);
    deletionResults.acknowledgements = { success: !ackError, error: ackError?.message };
    console.log(`acknowledgements: ${ackError ? 'Error - ' + ackError.message : 'Deleted'}`);

    // 8. Delete from notifications
    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("user_email", normalizedEmail);
    deletionResults.notifications = { success: !notifError, error: notifError?.message };
    console.log(`notifications: ${notifError ? 'Error - ' + notifError.message : 'Deleted'}`);

    // 9. Delete from notification_settings
    const { error: settingsError } = await supabaseAdmin
      .from("notification_settings")
      .delete()
      .eq("user_email", normalizedEmail);
    deletionResults.notification_settings = { success: !settingsError, error: settingsError?.message };
    console.log(`notification_settings: ${settingsError ? 'Error - ' + settingsError.message : 'Deleted'}`);

    // 10. Delete from reminder_logs
    const { error: reminderError } = await supabaseAdmin
      .from("reminder_logs")
      .delete()
      .eq("user_email", normalizedEmail);
    deletionResults.reminder_logs = { success: !reminderError, error: reminderError?.message };
    console.log(`reminder_logs: ${reminderError ? 'Error - ' + reminderError.message : 'Deleted'}`);

    // 11. Delete from failed_emails
    const { error: failedEmailsError } = await supabaseAdmin
      .from("failed_emails")
      .delete()
      .eq("recipient_email", normalizedEmail);
    deletionResults.failed_emails = { success: !failedEmailsError, error: failedEmailsError?.message };
    console.log(`failed_emails: ${failedEmailsError ? 'Error - ' + failedEmailsError.message : 'Deleted'}`);

    // 12. Delete request_approvals where user is the approver
    const { error: approvalsError } = await supabaseAdmin
      .from("request_approvals")
      .delete()
      .eq("approver_email", normalizedEmail);
    deletionResults.request_approvals = { success: !approvalsError, error: approvalsError?.message };
    console.log(`request_approvals: ${approvalsError ? 'Error - ' + approvalsError.message : 'Deleted'}`);

    // 13. Delete article_requests submitted by user
    const { error: articleRequestsError } = await supabaseAdmin
      .from("article_requests")
      .delete()
      .eq("submitted_by", normalizedEmail);
    deletionResults.article_requests = { success: !articleRequestsError, error: articleRequestsError?.message };
    console.log(`article_requests: ${articleRequestsError ? 'Error - ' + articleRequestsError.message : 'Deleted'}`);

    // 14. Delete from agent_profiles
    const { error: profileError } = await supabaseAdmin
      .from("agent_profiles")
      .delete()
      .eq("email", normalizedEmail);
    deletionResults.agent_profiles = { success: !profileError, error: profileError?.message };
    console.log(`agent_profiles: ${profileError ? 'Error - ' + profileError.message : 'Deleted'}`);

    // 15. Delete from auth.users
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

    // 16. Delete from user_roles (do this last)
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
        deletedUserLabel,
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
