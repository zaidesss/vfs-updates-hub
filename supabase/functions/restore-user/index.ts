import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RestoreUserRequest {
  email: string;
  name: string;
  password: string;
  role: 'super_admin' | 'admin' | 'user' | 'hr';
  deletedUserId: string;
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

    const { email, name, password, role, deletedUserId }: RestoreUserRequest = await req.json();

    if (!email || !password || !name || !deletedUserId) {
      return new Response(
        JSON.stringify({ error: "Email, name, password, and deletedUserId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Restoring user: ${normalizedEmail}`);

    // Check if user already exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "User already exists in the system" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user already exists in user_roles
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingRole) {
      return new Response(
        JSON.stringify({ error: "User already exists in user_roles" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create the user in auth.users
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true,
      user_metadata: { name: name }
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Insert into user_roles
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        email: normalizedEmail,
        name: name,
        role: role,
        must_change_password: true
      });

    if (roleError) {
      console.error("Error inserting user role:", roleError);
      // Try to clean up the auth user
      if (newUser?.user) {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      }
      return new Response(
        JSON.stringify({ error: roleError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark the deleted_users record as restored
    const { error: updateError } = await supabaseAdmin
      .from("deleted_users")
      .update({ restored_at: new Date().toISOString() })
      .eq("id", deletedUserId);

    if (updateError) {
      console.error("Error updating deleted_users:", updateError);
      // Non-critical, continue
    }

    console.log(`User restored successfully: ${normalizedEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: "User restored successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in restore-user:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
