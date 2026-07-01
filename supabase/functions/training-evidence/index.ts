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

    // ── GET: List evidence for an execution (or all teacher evidence) ──
    if (method === "GET") {
      const executionId = url.searchParams.get("execution_id");

      let query = supabase
        .from("training_evidence")
        .select("*")
        .eq("teacher_id", tp.id)
        .order("submitted_at", { ascending: false });

      if (executionId) {
        query = query.eq("execution_id", executionId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ data: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST: Submit new evidence ──
    if (method === "POST") {
      const body = await req.json();
      const { execution_id, evidence_type, title, file_url, text_content, milestone_id } = body;

      if (!execution_id || !evidence_type) {
        return new Response(JSON.stringify({ error: "Missing execution_id or evidence_type" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!title && !file_url && !text_content) {
        return new Response(JSON.stringify({ error: "Evidence must have a title, file, or text content" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch execution to get item context
      const { data: exec } = await supabase
        .from("training_executions")
        .select("id, teacher_id, training_item_id, training_item_type, execution_status")
        .eq("id", execution_id)
        .maybeSingle();

      if (!exec) {
        return new Response(JSON.stringify({ error: "Execution not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (exec.teacher_id !== tp.id) {
        return new Response(JSON.stringify({ error: "Not your execution" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: evidence, error: insErr } = await supabase
        .from("training_evidence")
        .insert({
          teacher_id: tp.id,
          execution_id,
          item_id: exec.training_item_id,
          item_type: exec.training_item_type,
          milestone_id: milestone_id ?? null,
          evidence_type,
          title: title ?? "",
          file_url: file_url ?? null,
          text_content: text_content ?? null,
          review_status: "submitted",
        })
        .select()
        .single();

      if (insErr) throw insErr;

      return new Response(JSON.stringify({ success: true, data: evidence }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PATCH: Update evidence (only if submitted/needs_revision) ──
    if (method === "PATCH") {
      const body = await req.json();
      const { id, title, file_url, text_content, evidence_type } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: "Missing evidence id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updates: Record<string, any> = {};
      if (title !== undefined) updates.title = title;
      if (file_url !== undefined) updates.file_url = file_url;
      if (text_content !== undefined) updates.text_content = text_content;
      if (evidence_type !== undefined) updates.evidence_type = evidence_type;

      // If resubmitting after revision/rejection, reset status
      if (Object.keys(updates).length > 0) {
        updates.review_status = "submitted";
        updates.submitted_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("training_evidence")
        .update(updates)
        .eq("id", id)
        .eq("teacher_id", tp.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DELETE: Remove submitted evidence ──
    if (method === "DELETE") {
      const body = await req.json();
      const { id } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: "Missing evidence id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("training_evidence")
        .delete()
        .eq("id", id)
        .eq("teacher_id", tp.id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
