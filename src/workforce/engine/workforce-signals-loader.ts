/**
 * Workforce Signals Loader — Sprint 8D
 *
 * Loads teacher intelligence signals for all team members of a school.
 */

import { supabase } from "@/integrations/supabase/client";
import { fetchBatchReputation } from "@/reputation/batch/fetch-batch-reputation";
import type { TeacherWorkforceSignals } from "../types/workforce.types";

export async function loadSchoolTeamSignals(
  schoolId: string,
): Promise<TeacherWorkforceSignals[]> {
  const { data: members } = await supabase
    .from("school_team_members")
    .select("teacher_id")
    .eq("school_id", schoolId);

  if (!members || members.length === 0) return [];

  const teacherIds = members.map((m) => m.teacher_id);

  const [profilesRes, talentRes, careerRes, credentialRes] =
    await Promise.all([
      supabase
        .from("teacher_profiles")
        .select("id, full_name, subject_ids, curriculum_ids")
        .in("id", teacherIds),
      supabase
        .from("intelligence_talent_profiles")
        .select("teacher_id, cri_score, credential_count, verified_completion_count, readiness_level")
        .in("teacher_id", teacherIds),
      supabase
        .from("teacher_career_states")
        .select("teacher_id, current_stage_id, next_stage_id, readiness_percent, unmet_requirement_count")
        .in("teacher_id", teacherIds),
      supabase
        .from("earned_credentials")
        .select("teacher_id")
        .in("teacher_id", teacherIds)
        .eq("status", "active"),
    ]);

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p]),
  );
  const talentMap = new Map(
    (talentRes.data ?? []).map((t) => [t.teacher_id, t]),
  );
  const careerMap = new Map(
    (careerRes.data ?? []).map((c) => [c.teacher_id, c]),
  );

  const credCounts = new Map<string, number>();
  for (const c of credentialRes.data ?? []) {
    credCounts.set(c.teacher_id, (credCounts.get(c.teacher_id) ?? 0) + 1);
  }

  // Load career stage names
  const stageIds = new Set<string>();
  for (const c of careerRes.data ?? []) {
    if (c.current_stage_id) stageIds.add(c.current_stage_id);
    if (c.next_stage_id) stageIds.add(c.next_stage_id);
  }
  const stageNames = new Map<string, string>();
  if (stageIds.size > 0) {
    const { data: stages } = await supabase
      .from("career_stages")
      .select("id, name")
      .in("id", Array.from(stageIds));
    for (const s of stages ?? []) {
      stageNames.set(s.id, s.name);
    }
  }

  // Experience years not available on teacher_profiles — pass null for batch reputation
  const teacherExperience: Record<string, number | null> = {};
  for (const tid of teacherIds) {
    teacherExperience[tid] = null;
  }
  const canonicalReputation = await fetchBatchReputation(teacherIds, teacherExperience);

  return teacherIds.map((tid) => {
    const profile = profileMap.get(tid);
    const talent = talentMap.get(tid);
    const career = careerMap.get(tid);
    const subjectIds = (profile?.subject_ids as string[]) ?? [];
    const curriculumIds = (profile?.curriculum_ids as string[]) ?? [];
    const rep = canonicalReputation[tid];

    return {
      teacherId: tid,
      teacherName: profile?.full_name ?? "Unknown",
      subjectTermIds: subjectIds,
      curriculumTermIds: curriculumIds,
      careerStageName: career?.current_stage_id
        ? stageNames.get(career.current_stage_id)
        : undefined,
      reputationScore: rep?.reputationScore ?? 0,
      reputationTier: rep?.reputationLevel ?? "emerging",
      criScore: talent?.cri_score ?? 0,
      credentialCount: credCounts.get(tid) ?? 0,
      verifiedCompletionCount: talent?.verified_completion_count ?? 0,
      readinessPercent: career?.readiness_percent ?? 0,
      nextStageName: career?.next_stage_id
        ? stageNames.get(career.next_stage_id)
        : undefined,
      gapCount: career?.unmet_requirement_count ?? 0,
      blockingGaps: [],
    };
  });
}

export async function loadSubjectLabels(
  subjectIds: string[],
): Promise<Record<string, string>> {
  if (subjectIds.length === 0) return {};
  const { data } = await supabase
    .from("taxonomy_terms")
    .select("id, name")
    .in("id", subjectIds);
  const labels: Record<string, string> = {};
  for (const t of data ?? []) {
    labels[t.id] = t.name;
  }
  return labels;
}
