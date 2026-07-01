/**
 * Career Signals Loader — Sprint 8A
 *
 * Loads teacher career signals from existing platform data
 * for use by the career state evaluator.
 */

import { supabase } from "@/integrations/supabase/client";
import type { TeacherCareerSignals } from "./career-path.types";
import type { CareerPathData } from "./teacher-career-state-evaluator";

/**
 * Load all career paths with their stages and requirements.
 */
export async function loadCareerPathData(): Promise<CareerPathData[]> {
  const [pathsRes, stagesRes, reqsRes] = await Promise.all([
    supabase.from("career_paths").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("career_stages").select("*").eq("is_active", true).order("stage_order"),
    supabase.from("career_stage_requirements").select("*"),
  ]);

  const paths = pathsRes.data ?? [];
  const stages = stagesRes.data ?? [];
  const reqs = reqsRes.data ?? [];

  return paths.map((p) => ({
    path: {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      isActive: p.is_active,
      sortOrder: p.sort_order,
    },
    stages: stages
      .filter((s) => s.path_id === p.id)
      .map((s) => ({
        id: s.id,
        pathId: s.path_id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        stageOrder: s.stage_order,
        isActive: s.is_active,
      })),
    requirements: reqs
      .filter((r) => stages.some((s) => s.path_id === p.id && s.id === r.stage_id))
      .map((r) => ({
        id: r.id,
        stageId: r.stage_id,
        requirementType: r.requirement_type as any,
        requirementKey: r.requirement_key,
        requirementLabel: r.requirement_label,
        termIds: r.term_ids ?? [],
        minCount: r.min_count ?? 1,
        minExperienceYears: r.min_experience_years,
        isMandatory: r.is_mandatory,
        metadata: (r.metadata as Record<string, unknown>) ?? {},
      })),
  }));
}

/**
 * Load teacher career signals from existing platform tables.
 */
export async function loadTeacherCareerSignals(
  teacherId: string,
): Promise<TeacherCareerSignals> {
  const [
    profileRes,
    credentialsRes,
    certsRes,
    languagesRes,
    pathwayExecsRes,
    courseProgressRes,
    evidenceRes,
    verifiedStateRes,
    talentProfileRes,
  ] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("years_of_experience")
      .eq("id", teacherId)
      .maybeSingle(),
    supabase
      .from("earned_credentials")
      .select("source_id")
      .eq("teacher_id", teacherId)
      .eq("status", "active"),
    supabase
      .from("teacher_certifications")
      .select("certification_term_id")
      .eq("teacher_id", teacherId),
    supabase
      .from("teacher_languages")
      .select("language_term_id")
      .eq("teacher_id", teacherId),
    supabase
      .from("pathway_executions")
      .select("id, status")
      .eq("teacher_id", teacherId),
    supabase
      .from("course_progress")
      .select("id, progress_status")
      .eq("teacher_id", teacherId),
    supabase
      .from("mentor_reviews")
      .select("id, review_decision")
      .eq("teacher_id", teacherId),
    supabase
      .from("intelligence_verified_state_snapshots")
      .select("overall_status, verified_count")
      .eq("teacher_id", teacherId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("intelligence_talent_profiles")
      .select("verified_completion_count, training_completion_count, verified_signal_count")
      .eq("teacher_id", teacherId)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  const credentials = credentialsRes.data ?? [];
  const certs = certsRes.data ?? [];
  const languages = languagesRes.data ?? [];
  const pathwayExecs = pathwayExecsRes.data ?? [];
  const courseProgress = courseProgressRes.data ?? [];
  const mentorReviews = evidenceRes.data ?? [];
  const verifiedState = verifiedStateRes.data;
  const talentProfile = talentProfileRes.data;

  return {
    teacherId,
    experienceYears: profile?.years_of_experience ?? 0,
    credentialSourceIds: credentials.map((c) => c.source_id),
    certificationTermIds: certs.map((c) => c.certification_term_id),
    verifiedCompletionCount: talentProfile?.verified_completion_count ?? 0,
    pathwayCompletionCount: pathwayExecs.filter((p) => p.status === "completed").length,
    trainingCompletionCount: talentProfile?.training_completion_count ??
      courseProgress.filter((c) => c.progress_status === "completed").length,
    approvedEvidenceCount: mentorReviews.filter((r) => r.review_decision === "approved").length,
    languageTermIds: languages.map((l) => l.language_term_id),
    competencyTermIds: [], // Derived from skills if needed
    verifiedSignalCount: talentProfile?.verified_signal_count ?? 0,
    trustVerified: verifiedState?.overall_status === "verified",
  };
}

/**
 * Persist teacher career state to the snapshot table.
 */
export async function persistCareerState(
  state: import("./career-path.types").TeacherCareerState,
): Promise<void> {
  const { error } = await supabase
    .from("teacher_career_states")
    .upsert(
      {
        teacher_id: state.teacherId,
        current_path_id: state.currentPathId,
        current_stage_id: state.currentStageId,
        next_stage_id: state.nextStageId,
        readiness_percent: state.readinessPercent,
        unmet_requirement_count: state.unmetRequirementCount,
        satisfied_requirement_count: state.satisfiedRequirementCount,
        total_requirement_count: state.totalRequirementCount,
        evaluation_trace: state.evaluationTrace as any,
        computed_at: state.computedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "teacher_id" },
    );

  if (error) {
    console.error("[CareerPath] Failed to persist career state:", error.message);
  }
}
