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

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

    // Check roles
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
      // School: see credentials of team members (resolve via membership → org)
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

      const { data: members } = await supabase
        .from("school_team_members")
        .select("teacher_id")
        .eq("school_id", school.id);

      if (!members || members.length === 0) {
        return new Response(JSON.stringify({ data: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const teacherIds = members.map((m: any) => m.teacher_id);

      const { data, error } = await supabase
        .from("earned_credentials")
        .select("*")
        .in("teacher_id", teacherIds)
        .order("issued_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ data: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isTeacher) {
      // Teacher: see own credentials only
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
        .from("earned_credentials")
        .select("*")
        .eq("teacher_id", tp.id)
        .order("issued_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ data: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
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
