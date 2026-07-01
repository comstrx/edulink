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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = { id: userId };

    async function getTeacherProfileId(): Promise<string | null> {
      const { data } = await userClient
        .from("teacher_profiles").select("id").eq("user_id", user!.id).maybeSingle();
      return data?.id ?? null;
    }

    const method = req.method;

    // ── GET: List teacher's pathway executions with milestones + progress ──
    if (method === "GET") {
      const teacherId = await getTeacherProfileId();
      if (!teacherId) {
        return new Response(JSON.stringify({ data: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch pathway executions
      const { data: executions, error: execErr } = await adminClient
        .from("pathway_executions")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });

      if (execErr) throw execErr;
      if (!executions || executions.length === 0) {
        return new Response(JSON.stringify({ data: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Batch-resolve pathway titles
      const pathwayIds = [...new Set(executions.map((e: any) => e.pathway_id))];
      const { data: pathways } = await adminClient
        .from("training_items")
        .select("id, title, slug, required_course_ids, milestones_json, cri_target")
        .in("id", pathwayIds);

      const pathwayMap: Record<string, any> = {};
      pathways?.forEach((p: any) => (pathwayMap[p.id] = p));

      // Fetch all milestones for these executions
      const execIds = executions.map((e: any) => e.id);
      const { data: milestones } = await adminClient
        .from("pathway_milestone_progress")
        .select("*")
        .in("execution_id", execIds)
        .order("milestone_order", { ascending: true });

      const milestonesByExec: Record<string, any[]> = {};
      milestones?.forEach((m: any) => {
        if (!milestonesByExec[m.execution_id]) milestonesByExec[m.execution_id] = [];
        milestonesByExec[m.execution_id].push(m);
      });

      // Fetch course completion data for required courses
      const allRequiredCourseIds = new Set<string>();
      pathways?.forEach((p: any) => {
        (p.required_course_ids ?? []).forEach((id: string) => allRequiredCourseIds.add(id));
      });

      let completedCourseIds = new Set<string>();
      let courseProgressMap: Record<string, any> = {};
      if (allRequiredCourseIds.size > 0) {
        // Check training_completions
        const { data: completions } = await adminClient
          .from("training_completions")
          .select("source_id")
          .eq("teacher_id", teacherId)
          .eq("source_type", "training_item")
          .in("source_id", Array.from(allRequiredCourseIds));
        completions?.forEach((c: any) => completedCourseIds.add(c.source_id));

        // Also check course_progress for in-progress courses
        const { data: cpData } = await adminClient
          .from("course_progress")
          .select("course_id, progress_status, progress_percent")
          .eq("teacher_id", teacherId)
          .in("course_id", Array.from(allRequiredCourseIds));
        cpData?.forEach((cp: any) => {
          courseProgressMap[cp.course_id] = cp;
          if (cp.progress_status === "completed") completedCourseIds.add(cp.course_id);
        });
      }

      // Resolve course titles
      let courseTitleMap: Record<string, string> = {};
      if (allRequiredCourseIds.size > 0) {
        const { data: courses } = await adminClient
          .from("training_items")
          .select("id, title")
          .in("id", Array.from(allRequiredCourseIds));
        courses?.forEach((c: any) => (courseTitleMap[c.id] = c.title));
      }

      // Build enriched response
      const result = executions.map((exec: any) => {
        const pathway = pathwayMap[exec.pathway_id] ?? {};
        const requiredCourseIds: string[] = pathway.required_course_ids ?? [];
        const completedCourses = requiredCourseIds.filter((id: string) => completedCourseIds.has(id));
        const remainingCourses = requiredCourseIds.filter((id: string) => !completedCourseIds.has(id));

        const courseDetails = requiredCourseIds.map((id: string) => ({
          id,
          title: courseTitleMap[id] ?? "Unknown",
          completed: completedCourseIds.has(id),
          progress_percent: courseProgressMap[id]?.progress_percent ?? (completedCourseIds.has(id) ? 100 : 0),
          progress_status: courseProgressMap[id]?.progress_status ?? (completedCourseIds.has(id) ? "completed" : "not_started"),
        }));

        const ms = milestonesByExec[exec.id] ?? [];
        const totalMilestones = ms.length;
        const completedMilestones = ms.filter((m: any) => m.status === "completed").length;

        // Progress formula: 60% courses + 40% milestones (if milestones exist)
        let progressPercent = 0;
        if (requiredCourseIds.length > 0) {
          const courseProgress = (completedCourses.length / requiredCourseIds.length) * 100;
          if (totalMilestones > 0) {
            const milestoneProgress = (completedMilestones / totalMilestones) * 100;
            progressPercent = Math.round(courseProgress * 0.6 + milestoneProgress * 0.4);
          } else {
            progressPercent = Math.round(courseProgress);
          }
        } else if (totalMilestones > 0) {
          progressPercent = Math.round((completedMilestones / totalMilestones) * 100);
        }

        return {
          ...exec,
          pathway_title: pathway.title ?? "Unknown",
          pathway_slug: pathway.slug ?? "",
          cri_target: pathway.cri_target ?? null,
          milestones: ms,
          courses: courseDetails,
          completed_courses_count: completedCourses.length,
          remaining_courses_count: remainingCourses.length,
          total_courses_count: requiredCourseIds.length,
          completed_milestones_count: completedMilestones,
          total_milestones_count: totalMilestones,
          computed_progress_percent: progressPercent,
        };
      });

      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST: Initialize pathway execution (start a pathway) ──
    if (method === "POST") {
      const body = await req.json();
      const { enrollment_id } = body;

      if (!enrollment_id) {
        return new Response(JSON.stringify({ error: "Missing enrollment_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const teacherId = await getTeacherProfileId();
      if (!teacherId) {
        return new Response(JSON.stringify({ error: "No teacher profile" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify enrollment ownership and type
      const { data: enrollment } = await adminClient
        .from("training_enrollments")
        .select("*")
        .eq("id", enrollment_id)
        .maybeSingle();

      if (!enrollment) {
        return new Response(JSON.stringify({ error: "Enrollment not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (enrollment.teacher_id !== teacherId) {
        return new Response(JSON.stringify({ error: "Not your enrollment" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (enrollment.item_type !== "pathway") {
        return new Response(JSON.stringify({ error: "Enrollment is not for a pathway" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if pathway execution already exists
      const { data: existingExec } = await adminClient
        .from("pathway_executions")
        .select("id")
        .eq("enrollment_id", enrollment_id)
        .maybeSingle();

      if (existingExec) {
        return new Response(JSON.stringify({ error: "Pathway execution already exists", execution_id: existingExec.id }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch pathway metadata
      const { data: pathway } = await adminClient
        .from("training_items")
        .select("id, milestones_json")
        .eq("id", enrollment.item_id)
        .maybeSingle();

      if (!pathway) {
        return new Response(JSON.stringify({ error: "Pathway item not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();

      // Create pathway execution
      const { data: pathExec, error: peErr } = await adminClient
        .from("pathway_executions")
        .insert({
          teacher_id: teacherId,
          pathway_id: pathway.id,
          enrollment_id: enrollment_id,
          status: "active",
          started_at: now,
          progress_percent: 0,
        })
        .select()
        .single();

      if (peErr) throw peErr;

      // Initialize milestone progress from pathway metadata
      const milestones: any[] = Array.isArray(pathway.milestones_json) ? pathway.milestones_json : [];
      if (milestones.length > 0) {
        const milestoneRows = milestones.map((m: any, idx: number) => ({
          execution_id: pathExec.id,
          milestone_id: m.id,
          milestone_title: m.title || `Milestone ${idx + 1}`,
          milestone_order: m.order ?? idx,
          linked_course_ids: m.linked_course_ids ?? [],
          status: idx === 0 ? "available" : "locked", // First milestone unlocked
        }));

        const { error: msErr } = await adminClient
          .from("pathway_milestone_progress")
          .insert(milestoneRows);
        if (msErr) console.error("Milestone init error:", msErr.message);
      }

      // Activate the enrollment if still in enrolled status
      if (enrollment.status === "enrolled") {
        await adminClient
          .from("training_enrollments")
          .update({ status: "active", started_at: now })
          .eq("id", enrollment_id);
      }

      // Activate linked training_execution if exists
      const { data: linkedExec } = await adminClient
        .from("training_executions")
        .select("id, execution_status")
        .eq("enrollment_id", enrollment_id)
        .maybeSingle();

      if (linkedExec && linkedExec.execution_status === "assigned") {
        await adminClient
          .from("training_executions")
          .update({ execution_status: "active", activated_at: now, started_at: now, last_activity_at: now })
          .eq("id", linkedExec.id);
      }

      return new Response(JSON.stringify({ success: true, execution: pathExec }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PATCH: Refresh pathway progress / complete milestone ──
    if (method === "PATCH") {
      const body = await req.json();
      const { execution_id, action } = body;

      if (!execution_id) {
        return new Response(JSON.stringify({ error: "Missing execution_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const teacherId = await getTeacherProfileId();
      if (!teacherId) {
        return new Response(JSON.stringify({ error: "No teacher profile" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: pathExec } = await adminClient
        .from("pathway_executions")
        .select("*")
        .eq("id", execution_id)
        .maybeSingle();

      if (!pathExec) {
        return new Response(JSON.stringify({ error: "Pathway execution not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (pathExec.teacher_id !== teacherId) {
        return new Response(JSON.stringify({ error: "Not your execution" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "refresh_progress") {
        // Fetch pathway required courses
        const { data: pathway } = await adminClient
          .from("training_items")
          .select("required_course_ids, milestones_json")
          .eq("id", pathExec.pathway_id)
          .maybeSingle();

        const requiredCourseIds: string[] = pathway?.required_course_ids ?? [];

        // Get completed courses for this teacher
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
          .eq("execution_id", execution_id)
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
            // Unlock if previous milestone is completed (or first milestone)
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
        if (requiredCourseIds.length > 0) {
          const courseProgress = (completedCourseIds.size / requiredCourseIds.length) * 100;
          if (ms.length > 0) {
            const milestoneProgress = (completedMilestones / ms.length) * 100;
            progressPercent = Math.round(courseProgress * 0.6 + milestoneProgress * 0.4);
          } else {
            progressPercent = Math.round(courseProgress);
          }
        } else if (ms.length > 0) {
          progressPercent = Math.round((completedMilestones / ms.length) * 100);
        }

        // Update pathway execution progress
        const updatePayload: any = { progress_percent: progressPercent };

        // Auto-complete pathway if all courses + milestones done
        const allCoursesComplete = requiredCourseIds.length === 0 ||
          requiredCourseIds.every((id: string) => completedCourseIds.has(id));
        const allMilestonesComplete = ms.length === 0 || ms.every((m: any) => m.status === "completed");

        if (allCoursesComplete && allMilestonesComplete && pathExec.status === "active") {
          const now = new Date().toISOString();
          updatePayload.status = "completed";
          updatePayload.completed_at = now;
          updatePayload.progress_percent = 100;

          // Also complete the enrollment
          await adminClient
            .from("training_enrollments")
            .update({ status: "completed", completed_at: now })
            .eq("id", pathExec.enrollment_id);

          // Complete the training execution
          await adminClient
            .from("training_executions")
            .update({ execution_status: "completed", completed_at: now, last_activity_at: now })
            .eq("enrollment_id", pathExec.enrollment_id)
            .in("execution_status", ["assigned", "active"]);

          // Create training_completion record for credential issuance
          await adminClient
            .from("training_completions")
            .insert({
              teacher_id: teacherId,
              source_id: pathExec.pathway_id,
              source_type: "training_pathway",
              completed_at: now,
              completion_evidence: { type: "pathway_completion", pathway_execution_id: execution_id },
            });
        }

        await adminClient
          .from("pathway_executions")
          .update(updatePayload)
          .eq("id", execution_id);

        return new Response(JSON.stringify({
          success: true,
          progress_percent: updatePayload.progress_percent ?? progressPercent,
          completed: !!updatePayload.completed_at,
          // Pre-Sprint 10: Return execution data for client-side event dispatch
          ...(updatePayload.completed_at ? {
            execution: {
              id: execution_id,
              teacher_id: teacherId,
              pathway_id: pathExec.pathway_id,
              enrollment_id: pathExec.enrollment_id,
              completed_at: updatePayload.completed_at,
            },
          } : {}),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
