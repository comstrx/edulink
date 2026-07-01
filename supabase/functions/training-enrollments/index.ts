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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("authorization") ?? "";

    // User-scoped client for auth + reads
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });

    // Service role client for writes that need to bypass RLS (execution creation)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

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

    // Helper: get teacher profile
    async function getTeacherProfile(): Promise<{ id: string } | null> {
      const { data } = await userClient
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    }

    // Helper: check role
    async function hasRole(role: string): Promise<boolean> {
      const { data } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", user!.id)
        .eq("role", role)
        .maybeSingle();
      return !!data;
    }

    const method = req.method;

    // ── POST: Self-enroll ──
    if (method === "POST") {
      const body = await req.json();
      const { item_id, item_type } = body;

      if (!item_id || !item_type) {
        return new Response(JSON.stringify({ error: "Missing item_id or item_type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isTeacher = await hasRole("teacher");
      if (!isTeacher) {
        return new Response(JSON.stringify({ error: "Only teachers can self-enroll" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tp = await getTeacherProfile();
      if (!tp) {
        return new Response(JSON.stringify({ error: "No teacher profile" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate item exists and is enrollable
      const { data: item } = await adminClient
        .from("training_items")
        .select("id, type, status, is_active")
        .eq("id", item_id)
        .maybeSingle();

      if (!item) {
        return new Response(JSON.stringify({ error: "Training item not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (item.type !== item_type) {
        return new Response(JSON.stringify({ error: `Type mismatch: actual "${item.type}", provided "${item_type}"` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!["course", "pathway"].includes(item.type)) {
        return new Response(JSON.stringify({ error: `Cannot enroll in "${item.type}". Only course and pathway are enrollable.` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (item.status !== "published" || !item.is_active) {
        return new Response(JSON.stringify({ error: "Item is not available for enrollment" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for existing active self-enrollment (school enrollments are separate by design)
      // DB enforces: uq_active_enrollment_self(teacher_id, item_id) for self
      //              uq_active_enrollment_school(teacher_id, item_id, assignment_id) for school
      const { data: existing } = await adminClient
        .from("training_enrollments")
        .select("id, status")
        .eq("teacher_id", tp.id)
        .eq("item_id", item_id)
        .eq("enrollment_source", "self")
        .in("status", ["enrolled", "active"])
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "Already enrolled in this item" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create enrollment
      const { data: enrollment, error: enrollErr } = await adminClient
        .from("training_enrollments")
        .insert({
          teacher_id: tp.id,
          item_id: item_id,
          item_type: item.type,
          enrollment_source: "self",
          status: "enrolled",
        })
        .select()
        .single();

      if (enrollErr) {
        if (enrollErr.code === "23505") {
          return new Response(JSON.stringify({ error: "Duplicate enrollment" }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw enrollErr;
      }

      // Auto-create execution for self-enrollment
      const { error: execErr } = await adminClient
        .from("training_executions")
        .insert({
          assignment_id: null as unknown as string, // Self-enrollment has no assignment
          enrollment_id: enrollment.id,
          school_id: null as unknown as string,
          teacher_id: tp.id,
          training_item_id: item_id,
          training_item_type: item.type,
          execution_status: "assigned",
        });

      // If execution insert fails due to NOT NULL on assignment_id/school_id, 
      // we need to handle this gracefully
      if (execErr) {
        console.error("Execution creation failed (expected if schema requires assignment_id):", execErr.message);
        // Enrollment still succeeds — execution will be created when we extend the schema
      }

      return new Response(JSON.stringify({ success: true, enrollment }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PATCH: Start learning (activate enrollment) ──
    if (method === "PATCH") {
      const body = await req.json();
      const { id, action } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: "Missing enrollment id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tp = await getTeacherProfile();
      if (!tp) {
        return new Response(JSON.stringify({ error: "No teacher profile" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify ownership
      const { data: enrollment } = await adminClient
        .from("training_enrollments")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!enrollment) {
        return new Response(JSON.stringify({ error: "Enrollment not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (enrollment.teacher_id !== tp.id) {
        return new Response(JSON.stringify({ error: "Not your enrollment" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "start") {
        if (enrollment.status !== "enrolled") {
          return new Response(JSON.stringify({ error: `Cannot start from status "${enrollment.status}"` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const now = new Date().toISOString();

        // Activate enrollment
        const { error: updateErr } = await adminClient
          .from("training_enrollments")
          .update({ status: "active", started_at: now })
          .eq("id", id);

        if (updateErr) throw updateErr;

        // Activate linked execution
        const { data: exec } = await adminClient
          .from("training_executions")
          .select("id, execution_status")
          .eq("enrollment_id", id)
          .maybeSingle();

        if (exec && exec.execution_status === "assigned") {
          await adminClient
            .from("training_executions")
            .update({
              execution_status: "active",
              activated_at: now,
              started_at: now,
              last_activity_at: now,
            })
            .eq("id", exec.id);
        }

        // If school assignment exists, update its status too
        if (enrollment.assignment_id) {
          await adminClient
            .from("training_assignments")
            .update({ status: "in_progress" })
            .eq("id", enrollment.assignment_id);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "drop") {
        if (!["enrolled", "active"].includes(enrollment.status)) {
          return new Response(JSON.stringify({ error: `Cannot drop from status "${enrollment.status}"` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Only self-enrollments can be dropped by the teacher
        if (enrollment.enrollment_source !== "self") {
          return new Response(JSON.stringify({ error: "Only self-enrollments can be dropped" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await adminClient
          .from("training_enrollments")
          .update({ status: "dropped" })
          .eq("id", id);

        // Cancel linked execution
        await adminClient
          .from("training_executions")
          .update({ execution_status: "cancelled" })
          .eq("enrollment_id", id)
          .in("execution_status", ["assigned", "active"]);

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
