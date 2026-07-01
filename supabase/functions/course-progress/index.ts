import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Sync pathway progress when a required course completes.
 * Recomputes progress, updates milestones, and auto-completes pathway if all done.
 * Formula: 60% courses + 40% milestones.
 */
async function syncPathwayProgress(
  adminClient: any,
  pathwayExecutionId: string,
  teacherId: string,
  pathwayId: string,
) {
  const { data: pathway } = await adminClient
    .from("training_items")
    .select("required_course_ids")
    .eq("id", pathwayId)
    .maybeSingle();

  const requiredCourseIds: string[] = pathway?.required_course_ids ?? [];

  // Get completed courses
  const completedCourseIds = new Set<string>();
  if (requiredCourseIds.length > 0) {
    const { data: completions } = await adminClient
      .from("training_completions")
      .select("source_id")
      .eq("teacher_id", teacherId)
      .eq("source_type", "training_item")
      .in("source_id", requiredCourseIds);
    completions?.forEach((c: any) => completedCourseIds.add(c.source_id));

    const { data: cpData } = await adminClient
      .from("course_progress")
      .select("course_id, progress_status")
      .eq("teacher_id", teacherId)
      .in("course_id", requiredCourseIds);
    cpData?.forEach((cp: any) => {
      if (cp.progress_status === "completed") completedCourseIds.add(cp.course_id);
    });
  }

  // Fetch milestones
  const { data: milestones } = await adminClient
    .from("pathway_milestone_progress")
    .select("*")
    .eq("execution_id", pathwayExecutionId)
    .order("milestone_order", { ascending: true });

  const ms = milestones ?? [];

  // Update milestone status based on linked course completions
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i];
    if (m.status === "completed") continue;

    const linkedCourses: string[] = m.linked_course_ids ?? [];
    const allLinkedComplete = linkedCourses.length > 0 &&
      linkedCourses.every((cid: string) => completedCourseIds.has(cid));

    if (m.status === "locked") {
      const prevCompleted = i === 0 || ms[i - 1].status === "completed";
      if (prevCompleted) {
        await adminClient
          .from("pathway_milestone_progress")
          .update({ status: "available" })
          .eq("id", m.id);
        m.status = "available";
      }
    }

    if (m.status === "available" && allLinkedComplete) {
      const now = new Date().toISOString();
      await adminClient
        .from("pathway_milestone_progress")
        .update({ status: "completed", completed_at: now })
        .eq("id", m.id);
      m.status = "completed";
    }
  }

  // Compute progress
  const completedMilestones = ms.filter((m: any) => m.status === "completed").length;
  let progressPercent = 0;
  if (requiredCourseIds.length > 0 && ms.length > 0) {
    const courseP = (completedCourseIds.size / requiredCourseIds.length) * 100;
    const milestoneP = (completedMilestones / ms.length) * 100;
    progressPercent = Math.round(courseP * 0.6 + milestoneP * 0.4);
  } else if (requiredCourseIds.length > 0) {
    progressPercent = Math.round((completedCourseIds.size / requiredCourseIds.length) * 100);
  } else if (ms.length > 0) {
    progressPercent = Math.round((completedMilestones / ms.length) * 100);
  }

  const updatePayload: any = { progress_percent: progressPercent };

  // Auto-complete pathway if all done
  const allCoursesComplete = requiredCourseIds.length === 0 ||
    requiredCourseIds.every((id: string) => completedCourseIds.has(id));
  const allMilestonesComplete = ms.length === 0 || ms.every((m: any) => m.status === "completed");

  if (allCoursesComplete && allMilestonesComplete) {
    const now = new Date().toISOString();
    updatePayload.status = "completed";
    updatePayload.completed_at = now;
    updatePayload.progress_percent = 100;

    // Complete enrollment
    const { data: pathExec } = await adminClient
      .from("pathway_executions")
      .select("enrollment_id")
      .eq("id", pathwayExecutionId)
      .maybeSingle();

    if (pathExec?.enrollment_id) {
      await adminClient
        .from("training_enrollments")
        .update({ status: "completed", completed_at: now })
        .eq("id", pathExec.enrollment_id);
    }

    // Complete training execution
    await adminClient
      .from("training_executions")
      .update({ execution_status: "completed", completed_at: now, last_activity_at: now })
      .eq("enrollment_id", pathExec?.enrollment_id)
      .in("execution_status", ["assigned", "active"]);

    // Create training_completion for credential issuance
    await adminClient
      .from("training_completions")
      .insert({
        teacher_id: teacherId,
        source_id: pathwayId,
        source_type: "training_pathway",
        completed_at: now,
        completion_evidence: { type: "pathway_auto_completed", pathway_execution_id: pathwayExecutionId },
      });
  }

  await adminClient
    .from("pathway_executions")
    .update(updatePayload)
    .eq("id", pathwayExecutionId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("authorization") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Decode JWT payload to extract user identity (no network call needed)
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

    // Get teacher profile id
    const { data: tp } = await supabase
      .from("teacher_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tp) {
      return new Response(JSON.stringify({ error: "No teacher profile" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const method = req.method;

    // ── GET: List teacher's course progress with item details ──
    if (method === "GET") {
      const { data, error } = await supabase
        .from("course_progress")
        .select("*")
        .eq("teacher_id", tp.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Batch resolve course titles
      const courseIds = [...new Set((data ?? []).map((r: any) => r.course_id))];
      let courseMap: Record<string, { title: string; slug: string }> = {};
      if (courseIds.length > 0) {
        const { data: items } = await supabase
          .from("training_items")
          .select("id, title, slug")
          .in("id", courseIds);
        items?.forEach((i: any) => (courseMap[i.id] = { title: i.title, slug: i.slug }));
      }

      // Batch resolve assignment details
      const assignmentIds = [...new Set((data ?? []).map((r: any) => r.assignment_id))];
      let assignmentMap: Record<string, { due_date: string | null; notes: string | null }> = {};
      if (assignmentIds.length > 0) {
        const { data: assignments } = await supabase
          .from("training_assignments")
          .select("id, due_date, notes")
          .in("id", assignmentIds);
        assignments?.forEach((a: any) => (assignmentMap[a.id] = { due_date: a.due_date, notes: a.notes }));
      }

      const enriched = (data ?? []).map((r: any) => ({
        ...r,
        course_title: courseMap[r.course_id]?.title ?? "Unknown",
        course_slug: courseMap[r.course_id]?.slug ?? "",
        due_date: assignmentMap[r.assignment_id]?.due_date ?? null,
        assignment_notes: assignmentMap[r.assignment_id]?.notes ?? null,
      }));

      return new Response(JSON.stringify({ data: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PATCH: Start / Continue / Complete ──
    if (method === "PATCH") {
      const body = await req.json();
      const { execution_id, action } = body;

      if (!execution_id || !action) {
        return new Response(JSON.stringify({ error: "Missing execution_id or action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify execution ownership and type
      const { data: exec } = await supabase
        .from("training_executions")
        .select("id, teacher_id, training_item_type, execution_status, assignment_id")
        .eq("id", execution_id)
        .maybeSingle();

      if (!exec) {
        return new Response(JSON.stringify({ error: "Execution not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (exec.teacher_id !== tp.id) {
        return new Response(JSON.stringify({ error: "Not your execution" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (exec.training_item_type !== "course") {
        return new Response(JSON.stringify({ error: "Only course executions support course progress" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (exec.execution_status === "cancelled") {
        return new Response(JSON.stringify({ error: "Cannot progress a cancelled execution" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get course progress row
      const { data: cp } = await supabase
        .from("course_progress")
        .select("*")
        .eq("execution_id", execution_id)
        .maybeSingle();

      if (!cp) {
        return new Response(JSON.stringify({ error: "Course progress not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();

      if (action === "start") {
        if (cp.progress_status !== "not_started") {
          return new Response(JSON.stringify({ error: `Cannot start from status "${cp.progress_status}"` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update course_progress
        const { error: cpErr } = await supabase
          .from("course_progress")
          .update({
            progress_status: "in_progress",
            started_at: now,
            first_activity_at: now,
            last_activity_at: now,
          })
          .eq("id", cp.id);
        if (cpErr) throw cpErr;

        // Sync execution to active if assigned
        if (exec.execution_status === "assigned") {
          await supabase
            .from("training_executions")
            .update({ execution_status: "active", activated_at: now, last_activity_at: now })
            .eq("id", execution_id);
        } else {
          await supabase
            .from("training_executions")
            .update({ last_activity_at: now })
            .eq("id", execution_id);
        }

        // Mirror assignment
        await supabase
          .from("training_assignments")
          .update({ status: "in_progress" })
          .eq("id", exec.assignment_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "continue") {
        if (cp.progress_status !== "in_progress") {
          return new Response(JSON.stringify({ error: `Cannot continue from status "${cp.progress_status}"` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase
          .from("course_progress")
          .update({ last_activity_at: now })
          .eq("id", cp.id);

        await supabase
          .from("training_executions")
          .update({ last_activity_at: now })
          .eq("id", execution_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "complete") {
        if (cp.progress_status === "completed") {
          return new Response(JSON.stringify({ error: "Already completed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (cp.progress_status === "not_started") {
          return new Response(JSON.stringify({ error: "Cannot complete a course that hasn't started" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update course_progress
        const { error: cpErr } = await supabase
          .from("course_progress")
          .update({
            progress_status: "completed",
            progress_percent: 100,
            completed_at: now,
            last_activity_at: now,
          })
          .eq("id", cp.id);
        if (cpErr) throw cpErr;

        // Sync execution to completed
        await supabase
          .from("training_executions")
          .update({ execution_status: "completed", completed_at: now, last_activity_at: now })
          .eq("id", execution_id);

        // Mirror assignment
        if (exec.assignment_id) {
          await supabase
            .from("training_assignments")
            .update({ status: "completed" })
            .eq("id", exec.assignment_id);
        }

        // Also complete enrollment if exists
        const { data: linkedEnrollment } = await adminClient
          .from("training_enrollments")
          .select("id, status")
          .eq("teacher_id", tp.id)
          .eq("item_id", cp.course_id)
          .in("status", ["enrolled", "active"])
          .maybeSingle();

        if (linkedEnrollment) {
          await adminClient
            .from("training_enrollments")
            .update({ status: "completed", completed_at: now })
            .eq("id", linkedEnrollment.id);
        }

        // ── Create training_completions record (single source of truth) ──
        // Unique index (teacher_id, source_type, source_id) ensures idempotency
        const { error: compErr } = await adminClient
          .from("training_completions")
          .insert({
            teacher_id: tp.id,
            source_id: cp.course_id,
            source_type: "training_item",
            completed_at: now,
            completion_evidence: { type: "course_progress_completed", execution_id: execution_id },
          });

        if (compErr && compErr.code !== "23505") {
          // 23505 = duplicate — already has a completion record, safe to ignore
          console.error("training_completions insert error (non-blocking):", compErr.message);
        }

        // ── Pathway cascade: refresh any active pathway that includes this course ──
        try {
          const { data: activePathwayExecs } = await adminClient
            .from("pathway_executions")
            .select("id, pathway_id")
            .eq("teacher_id", tp.id)
            .eq("status", "active");

          if (activePathwayExecs && activePathwayExecs.length > 0) {
            // Fetch pathway metadata to check if this course is required
            const pathwayIds = activePathwayExecs.map((pe: any) => pe.pathway_id);
            const { data: pathways } = await adminClient
              .from("training_items")
              .select("id, required_course_ids")
              .in("id", pathwayIds);

            const pathwayMap: Record<string, string[]> = {};
            pathways?.forEach((p: any) => {
              pathwayMap[p.id] = p.required_course_ids ?? [];
            });

            for (const pe of activePathwayExecs) {
              const requiredIds = pathwayMap[pe.pathway_id] ?? [];
              if (requiredIds.includes(cp.course_id)) {
                // This course is part of this pathway — trigger progress refresh
                await syncPathwayProgress(adminClient, pe.id, tp.id, pe.pathway_id);
              }
            }
          }
        } catch (syncErr) {
          console.error("Pathway sync error (non-blocking):", syncErr);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid action. Use start, continue, or complete." }), {
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
