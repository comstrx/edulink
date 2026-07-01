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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Routes: POST / (create), GET / (list), PATCH /:id/status
    const method = req.method;

    // ── Helper: check school role ──
    async function assertSchoolRole(): Promise<{ schoolId: string }> {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);

      const userRoles = (roles ?? []).map((r: any) => r.role);
      const hasPermission =
        userRoles.includes("school_admin") ||
        userRoles.includes("school_training_manager") ||
        userRoles.includes("admin");

      if (!hasPermission) {
        throw new Error("FORBIDDEN");
      }

      const { data: membership } = await supabase
        .from("school_members")
        .select("school_id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();

      if (!membership) throw new Error("NO_SCHOOL");
      return { schoolId: membership.school_id };
    }

    // ── POST: Create assignment ──
    if (method === "POST") {
      const { schoolId } = await assertSchoolRole();
      const body = await req.json();

      const { assigned_item_id, assigned_item_type, assigned_to_teacher_id, due_date, notes } = body;

      if (!assigned_item_id || !assigned_item_type || !assigned_to_teacher_id) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!["course", "pathway"].includes(assigned_item_type)) {
        return new Response(JSON.stringify({ error: `Cannot assign item of type "${assigned_item_type}". Only course and pathway are assignable. Library/resource items are discovery-only.` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate item exists and type matches
      const { data: item } = await supabase
        .from("training_items")
        .select("id, type")
        .eq("id", assigned_item_id)
        .maybeSingle();

      if (!item) {
        return new Response(JSON.stringify({ error: "Training item not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (item.type !== assigned_item_type) {
        return new Response(JSON.stringify({ error: `Type mismatch: item is "${item.type}"` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate teacher in school team
      const { data: membership } = await supabase
        .from("school_team_members")
        .select("id")
        .eq("school_id", schoolId)
        .eq("teacher_id", assigned_to_teacher_id)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ error: "Teacher is not a member of your school team" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("training_assignments")
        .insert({
          school_id: schoolId,
          assigned_item_id,
          assigned_item_type,
          assigned_to_teacher_id,
          assigned_by_user_id: user.id,
          due_date: due_date ?? null,
          notes: notes ?? null,
          status: "assigned",
        })
        .select()
        .single();

      if (error) {
        const msg = error.code === "23505" ? "Duplicate active assignment" : error.message;
        return new Response(JSON.stringify({ error: msg }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET: List assignments ──
    if (method === "GET") {
      // Check if teacher or school role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const userRoles = (roles ?? []).map((r: any) => r.role);
      const isSchool =
        userRoles.includes("school_admin") ||
        userRoles.includes("school_training_manager") ||
        userRoles.includes("admin");
      const isTeacher = userRoles.includes("teacher");

      if (isSchool) {
        const { data: membership } = await supabase
          .from("school_members")
          .select("school_id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (!membership) {
          return new Response(JSON.stringify({ data: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const school = { id: membership.school_id };

        const { data, error } = await supabase
          .from("training_assignments")
          .select("*")
          .eq("school_id", school.id)
          .order("assigned_at", { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ data: data ?? [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (isTeacher) {
        const { data: tp } = await supabase
          .from("teacher_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!tp) {
          return new Response(JSON.stringify({ data: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabase
          .from("training_assignments")
          .select("*")
          .eq("assigned_to_teacher_id", tp.id)
          .order("assigned_at", { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ data: data ?? [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PATCH: Update assignment status ──
    if (method === "PATCH") {
      const { schoolId } = await assertSchoolRole();
      const body = await req.json();
      const { id, status } = body;

      if (!id || !status) {
        return new Response(JSON.stringify({ error: "Missing id or status" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validStatuses = ["assigned", "in_progress", "completed", "certified", "cancelled"];
      if (!validStatuses.includes(status)) {
        return new Response(JSON.stringify({ error: `Invalid status: ${status}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("training_assignments")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("school_id", schoolId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message === "FORBIDDEN" ? 403 : message === "NO_SCHOOL" ? 404 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
