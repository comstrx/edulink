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

    const method = req.method;

    // ── GET: Fetch reviews ──
    if (method === "GET") {
      const url = new URL(req.url);
      const role = url.searchParams.get("role"); // "mentor" or "teacher"

      if (role === "mentor") {
        // Get mentor's review queue and completed reviews
        const { data: mentor } = await supabase
          .from("mentors").select("id").eq("user_id", user.id).maybeSingle();

        if (!mentor) {
          return new Response(JSON.stringify({ error: "Not a mentor" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get pending evidence (submitted, not yet reviewed by this mentor)
        const evidenceFilter = url.searchParams.get("queue") === "pending";

        if (evidenceFilter) {
          // Evidence awaiting review: status = submitted or under_review, not reviewed by this mentor
          const { data: pendingEvidence, error } = await supabase
            .from("training_evidence")
            .select("*")
            .in("review_status", ["submitted", "under_review"])
            .order("submitted_at", { ascending: true });

          if (error) throw error;

          // Filter out evidence already reviewed by this mentor
          const { data: existingReviews } = await supabase
            .from("mentor_reviews")
            .select("evidence_id")
            .eq("mentor_id", mentor.id);

          const reviewedIds = new Set((existingReviews ?? []).map(r => r.evidence_id));
          const queue = (pendingEvidence ?? []).filter(e => !reviewedIds.has(e.id));

          return new Response(JSON.stringify({ data: queue }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get mentor's completed reviews
        const { data: reviews, error } = await supabase
          .from("mentor_reviews")
          .select("*")
          .eq("mentor_id", mentor.id)
          .order("reviewed_at", { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ data: reviews ?? [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Teacher view: get reviews on my evidence
      const { data: tp } = await supabase
        .from("teacher_profiles").select("id").eq("user_id", user.id).maybeSingle();

      if (!tp) {
        return new Response(JSON.stringify({ data: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: reviews, error } = await supabase
        .from("mentor_reviews")
        .select("*")
        .eq("teacher_id", tp.id)
        .order("reviewed_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ data: reviews ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST: Submit a review ──
    if (method === "POST") {
      const body = await req.json();
      const { evidence_id, review_decision, review_notes } = body;

      if (!evidence_id || !review_decision) {
        return new Response(JSON.stringify({ error: "Missing evidence_id or review_decision" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!["approved", "rejected", "needs_revision"].includes(review_decision)) {
        return new Response(JSON.stringify({ error: "Invalid review_decision" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get mentor profile
      const { data: mentor } = await supabase
        .from("mentors").select("id, status").eq("user_id", user.id).maybeSingle();

      if (!mentor || mentor.status !== "active") {
        return new Response(JSON.stringify({ error: "Not an active mentor" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get evidence details
      const { data: evidence } = await supabase
        .from("training_evidence")
        .select("id, teacher_id, execution_id, review_status")
        .eq("id", evidence_id)
        .maybeSingle();

      if (!evidence) {
        return new Response(JSON.stringify({ error: "Evidence not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark evidence as under_review first if still submitted
      if (evidence.review_status === "submitted") {
        await supabase
          .from("training_evidence")
          .update({ review_status: "under_review" })
          .eq("id", evidence_id);
      }

      // Create review (trigger will update evidence status)
      const { data: review, error: insErr } = await supabase
        .from("mentor_reviews")
        .insert({
          mentor_id: mentor.id,
          teacher_id: evidence.teacher_id,
          execution_id: evidence.execution_id,
          evidence_id,
          review_decision,
          review_notes: review_notes ?? null,
        })
        .select()
        .single();

      if (insErr) throw insErr;

      // If approved, check if this triggers verified completion
      if (review_decision === "approved") {
        // Check if all evidence for this execution is approved
        const { data: allEvidence } = await supabase
          .from("training_evidence")
          .select("id, review_status")
          .eq("execution_id", evidence.execution_id);

        const allApproved = (allEvidence ?? []).every(e =>
          e.id === evidence_id ? true : e.review_status === "approved"
        );

        if (allApproved && (allEvidence ?? []).length > 0) {
          // Upgrade to verified completion
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const adminClient = createClient(supabaseUrl, serviceKey);

          await adminClient
            .from("training_completions")
            .update({
              verified_completion: true,
              verified_at: new Date().toISOString(),
              verified_by_mentor_id: mentor.id,
            })
            .eq("execution_id", evidence.execution_id);
        }
      }

      return new Response(JSON.stringify({ success: true, data: review }), {
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
