import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportData {
  attempts: any[];
  answers: any[];
  exportedAt: string;
  rangeStart: string;
  rangeEnd: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the cutoff date (14 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);
    const cutoffIso = cutoffDate.toISOString();

    console.log(`Looking for attempts older than: ${cutoffIso}`);

    // Find attempts older than 14 days
    const { data: oldAttempts, error: attemptsError } = await supabase
      .from("revalida_attempts")
      .select("*")
      .lt("created_at", cutoffIso);

    if (attemptsError) {
      throw new Error(`Failed to fetch old attempts: ${attemptsError.message}`);
    }

    if (!oldAttempts || oldAttempts.length === 0) {
      console.log("No attempts older than 14 days found");
      return new Response(
        JSON.stringify({ message: "No data to export", rowsExported: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${oldAttempts.length} attempts to export`);

    // Get all attempt IDs
    const attemptIds = oldAttempts.map((a) => a.id);

    // Fetch all answers for these attempts
    const { data: oldAnswers, error: answersError } = await supabase
      .from("revalida_answers")
      .select("*")
      .in("attempt_id", attemptIds);

    if (answersError) {
      throw new Error(`Failed to fetch old answers: ${answersError.message}`);
    }

    console.log(`Found ${oldAnswers?.length || 0} answers to export`);

    // Calculate date range
    const dates = oldAttempts.map((a) => new Date(a.created_at));
    const rangeStart = new Date(Math.min(...dates.map((d) => d.getTime())))
      .toISOString()
      .split("T")[0];
    const rangeEnd = new Date(Math.max(...dates.map((d) => d.getTime())))
      .toISOString()
      .split("T")[0];

    // Prepare export data
    const exportData: ExportData = {
      attempts: oldAttempts,
      answers: oldAnswers || [],
      exportedAt: new Date().toISOString(),
      rangeStart,
      rangeEnd,
    };

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = `exports/revalida-${rangeStart}-to-${rangeEnd}-${timestamp}.json`;

    // Upload to storage bucket
    const { error: uploadError } = await supabase.storage
      .from("revalida-exports")
      .upload(filePath, JSON.stringify(exportData, null, 2), {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload export file: ${uploadError.message}`);
    }

    console.log(`Export file uploaded: ${filePath}`);

    // Log the export
    const { error: logError } = await supabase.from("revalida_exports").insert({
      range_start: rangeStart,
      range_end: rangeEnd,
      file_path: filePath,
      rows_exported: oldAttempts.length,
      exported_by: "system",
    });

    if (logError) {
      console.error(`Failed to log export: ${logError.message}`);
      // Continue anyway - the export is already done
    }

    // Delete answers first (foreign key constraint)
    const { error: deleteAnswersError } = await supabase
      .from("revalida_answers")
      .delete()
      .in("attempt_id", attemptIds);

    if (deleteAnswersError) {
      throw new Error(`Failed to delete answers: ${deleteAnswersError.message}`);
    }

    console.log(`Deleted ${oldAnswers?.length || 0} answers`);

    // Delete attempts
    const { error: deleteAttemptsError } = await supabase
      .from("revalida_attempts")
      .delete()
      .in("id", attemptIds);

    if (deleteAttemptsError) {
      throw new Error(`Failed to delete attempts: ${deleteAttemptsError.message}`);
    }

    console.log(`Deleted ${oldAttempts.length} attempts`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Retention cleanup completed",
        rowsExported: oldAttempts.length,
        answersDeleted: oldAnswers?.length || 0,
        filePath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Retention job error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Retention job failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

Deno.serve(handler);
