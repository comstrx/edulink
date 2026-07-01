/**
 * Mobility Signals Loader — Sprint 8C
 *
 * Loads all signals needed for mobility evaluation from existing systems.
 * Uses canonical reputation (System B) via fetchBatchReputation.
 */

import { supabase } from "@/integrations/supabase/client";
import type { MobilitySignals } from "./career-mobility-evaluator";
import {
  fetchMobilityTargets,
  fetchMobilityRequirements,
} from "@/lib/supabase-typed-queries";
import { fetchBatchReputation } from "@/reputation/batch/fetch-batch-reputation";

export async function loadMobilitySignals(teacherId: string): Promise<MobilitySignals> {
  // Load in parallel
  const [
    careerStateRes,
    credentialRes,
    evidenceRes,
    pathwayRes,
    trainingRes,
    profileRes,
  ] = await Promise.all([
    supabase
      .from("teacher_career_states")
      .select("current_stage_id")
      .eq("teacher_id", teacherId)
      .maybeSingle(),
    supabase
      .from("earned_credentials")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("status", "active"),
    supabase
      .from("mentor_reviews")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("review_decision", "approved"),
    supabase
      .from("pathway_executions")
      .select("pathway_id")
      .eq("teacher_id", teacherId)
      .eq("status", "completed"),
    supabase
      .from("course_progress")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("progress_status", "completed"),
    supabase
      .from("teacher_profiles")
      .select("years_of_experience, curriculum_term_ids, language_term_ids")
      .eq("id", teacherId)
      .returns<{ years_of_experience: number | null; curriculum_term_ids: string[] | null; language_term_ids: string[] | null }[]>()
      .maybeSingle(),
  ]);

  const experienceYears = profileRes.data?.years_of_experience ?? 0;

  // Canonical reputation (System B)
  const canonicalRep = await fetchBatchReputation(
    [teacherId],
    { [teacherId]: experienceYears ?? null },
  );
  const rep = canonicalRep[teacherId];

  return {
    teacherId,
    careerStageId: careerStateRes.data?.current_stage_id ?? undefined,
    reputationScore: rep?.reputationScore ?? 0,
    credibilityTier: rep?.reputationLevel ?? "emerging",
    credentialTermIds: (credentialRes.data ?? []).map((c) => c.id),
    verifiedEvidenceCount: evidenceRes.data?.length ?? 0,
    completedPathwayIds: (pathwayRes.data ?? []).map((p) => p.pathway_id),
    completedTrainingCount: trainingRes.data?.length ?? 0,
    curriculumTermIds: profileRes.data?.curriculum_term_ids ?? [],
    experienceYears,
    languageTermIds: profileRes.data?.language_term_ids ?? [],
  };
}

/**
 * Load all active mobility targets with their requirements
 */
export async function loadMobilityTargetsWithRequirements() {
  const [rawTargets, rawRequirements] = await Promise.all([
    fetchMobilityTargets(),
    fetchMobilityRequirements(),
  ]);

  const parsedTargets = rawTargets.map((t) => ({
    id: t.id,
    trackId: t.track_id,
    trackName: t.track_name ?? "",
    name: t.name,
    slug: t.slug,
    description: t.description,
    targetRole: t.target_role,
    targetCurriculumTermIds: t.target_curriculum_term_ids ?? [],
    targetSchoolTypeTermIds: t.target_school_type_term_ids ?? [],
    targetCareerStageId: t.target_career_stage_id,
  }));

  const parsedReqs = rawRequirements.map((r) => ({
    id: r.id,
    targetId: r.target_id,
    requirementType: r.requirement_type as import("../types/mobility.types").MobilityRequirementType,
    requirementKey: r.requirement_key,
    requirementLabel: r.requirement_label,
    isMandatory: r.is_mandatory,
    minCount: r.min_count,
    minReputationScore: r.min_reputation_score,
    minExperienceYears: r.min_experience_years,
    termIds: r.term_ids ?? [],
    metadata: r.metadata ?? {},
  }));

  return { targets: parsedTargets, requirements: parsedReqs };
}
