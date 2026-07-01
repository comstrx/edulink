import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("authorization") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let userId: string;
    try {
      const payloadB64 = token.split(".")[1];
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
      if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error("Invalid or expired token");
      }
      userId = payload.sub;
    } catch {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = { id: userId };

    const method = req.method;

    // Helper: get teacher profile id for current user
    async function getTeacherProfileId(): Promise<string | null> {
      const { data } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.id ?? null;
    }

    // ── GET: List teacher's executions ──
    if (method === "GET") {
      const teacherId = await getTeacherProfileId();
      if (!teacherId) {
        return new Response(JSON.stringify({ data: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("training_executions")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ data: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PATCH: Activate or update execution status ──
    if (method === "PATCH") {
      const body = await req.json();
      const { id, action } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: "Missing execution id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const teacherId = await getTeacherProfileId();
      if (!teacherId) {
        return new Response(JSON.stringify({ error: "No teacher profile" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify ownership
      const { data: exec } = await supabase
        .from("training_executions")
        .select("id, teacher_id, execution_status")
        .eq("id", id)
        .maybeSingle();

      if (!exec) {
        return new Response(JSON.stringify({ error: "Execution not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (exec.teacher_id !== teacherId) {
        return new Response(JSON.stringify({ error: "Not your execution" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "activate") {
        if (exec.execution_status !== "assigned") {
          return new Response(JSON.stringify({ error: `Cannot activate from status "${exec.execution_status}"` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const now = new Date().toISOString();
        const { error } = await supabase
          .from("training_executions")
          .update({
            execution_status: "active",
            activated_at: now,
            last_activity_at: now,
          })
          .eq("id", id);

        if (error) throw error;

        // Also update assignment status to in_progress
        const { data: execFull } = await supabase
          .from("training_executions")
          .select("assignment_id")
          .eq("id", id)
          .maybeSingle();

        if (execFull) {
          await supabase
            .from("training_assignments")
            .update({ status: "in_progress" })
            .eq("id", execFull.assignment_id);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
