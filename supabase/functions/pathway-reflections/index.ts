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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("authorization") ?? "";

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = { id: userId };

    const { data: tp } = await supabase
      .from("teacher_profiles").select("id").eq("user_id", user.id).maybeSingle();

    if (!tp) {
      return new Response(JSON.stringify({ error: "No teacher profile" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const method = req.method;
    const url = new URL(req.url);

    // ── GET: List reflections for a pathway execution ──
    if (method === "GET") {
      const executionId = url.searchParams.get("execution_id");

      if (!executionId) {
        return new Response(JSON.stringify({ error: "Missing execution_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("pathway_reflections")
        .select("*")
        .eq("execution_id", executionId)
        .eq("teacher_id", tp.id)
        .order("submitted_at", { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({ data: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST: Submit or upsert a reflection ──
    if (method === "POST") {
      const body = await req.json();
      const { execution_id, prompt_id, prompt_text, teacher_response } = body;

      if (!execution_id || !prompt_id || !teacher_response) {
        return new Response(JSON.stringify({ error: "Missing execution_id, prompt_id, or teacher_response" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert: update if exists, insert if not (unique on execution_id + prompt_id)
      const { data: existing } = await supabase
        .from("pathway_reflections")
        .select("id")
        .eq("execution_id", execution_id)
        .eq("prompt_id", prompt_id)
        .eq("teacher_id", tp.id)
        .maybeSingle();

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from("pathway_reflections")
          .update({
            teacher_response,
            prompt_text: prompt_text ?? "",
            submitted_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from("pathway_reflections")
          .insert({
            execution_id,
            teacher_id: tp.id,
            prompt_id,
            prompt_text: prompt_text ?? "",
            teacher_response,
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      return new Response(JSON.stringify({ success: true, data: result }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
