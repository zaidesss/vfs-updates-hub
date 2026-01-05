import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserPayload {
  email: string;
  password: string;
  name: string;
  role: "admin" | "user" | "hr";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: CreateUserPayload = await req.json();
    console.log("Creating user with email:", payload.email);

    // Create the user with Supabase Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true, // Auto-confirm the email
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      
      // Handle specific error cases with appropriate status codes
      if (authError.message?.includes("already been registered")) {
        return new Response(JSON.stringify({ 
          error: "A user with this email address already exists. Please use a different email." 
        }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw authError;
    }

    console.log("Auth user created:", authData.user?.id);

    // Add to user_roles table with must_change_password flag
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        email: payload.email.toLowerCase(),
        name: payload.name,
        role: payload.role,
        must_change_password: true,
      });

    if (roleError) {
      console.error("Error adding user role:", roleError);
      // Try to clean up the auth user if role creation fails
      if (authData.user?.id) {
        await supabase.auth.admin.deleteUser(authData.user.id);
      }
      throw roleError;
    }

    console.log("User role added successfully");

    // Send welcome email with credentials
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: "VFS Updates Hub <noreply@updates.virtualfreelancesolutions.com>",
          to: [payload.email],
          subject: "Welcome to VFS Updates Hub - Your Account Credentials",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Welcome to VFS Updates Hub!</h1>
              
              <p>Hello ${payload.name},</p>
              
              <p>Your account has been created. Here are your login credentials:</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${payload.email}</p>
                <p style="margin: 0;"><strong>Temporary Password:</strong> ${payload.password}</p>
              </div>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0;"><strong>⚠️ Important:</strong> You will be required to change your password on first login.</p>
              </div>
              
              <p>Please log in at <a href="https://vfs-updates-hub.lovable.app">VFS Updates Hub</a> to get started.</p>
              
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          `,
        });
        console.log("Welcome email sent successfully");
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      userId: authData.user?.id,
      message: "User created successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in create-user-with-password:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
