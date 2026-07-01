/**
 * Workforce Refresh Service — Sprint 8D
 *
 * Orchestrates full workforce intelligence recomputation for a school.
 * Pipeline: Load Team → Aggregate → Persist Snapshots
 */

import { supabase } from "@/integrations/supabase/client";
import { loadSchoolTeamSignals, loadSubjectLabels } from "./workforce-signals-loader";
import {
  aggregateWorkforceProfile,
  aggregateDepartmentCapabilities,
  buildPromotionPipeline,
} from "./workforce-intelligence-aggregator";
import { buildWorkforceExplainability } from "../explainability/workforce-explainability.builder";
import type { WorkforceExplainabilityBundle } from "../explainability/workforce-explainability.types";

/**
 * Refresh all workforce intelligence for a given school
 */
export async function refreshWorkforceIntelligence(schoolId: string): Promise<WorkforceExplainabilityBundle | null> {
  console.log(`[Workforce] Refreshing intelligence for school ${schoolId}`);

  // 1. Load all teacher signals
  const teamSignals = await loadSchoolTeamSignals(schoolId);
  if (teamSignals.length === 0) {
    console.log("[Workforce] No team members found, skipping.");
    return null;
  }

  // 2. Aggregate workforce profile
  const profile = aggregateWorkforceProfile(schoolId, teamSignals);

  // 3. Aggregate department capabilities
  const allSubjectIds = [...new Set(teamSignals.flatMap((t) => t.subjectTermIds))];
  const subjectLabels = await loadSubjectLabels(allSubjectIds);
  const departments = aggregateDepartmentCapabilities(teamSignals, subjectLabels);

  // 4. Build promotion pipeline
  const promotionPipeline = buildPromotionPipeline(teamSignals);

  // 4b. Build explainability (derived from existing outputs, no new logic)
  const explainability = buildWorkforceExplainability(
    profile, departments, profile.topGaps, promotionPipeline, teamSignals,
  );

  // 5. Persist — workforce profile (upsert)
  const { data: existing } = await supabase
    .from("school_workforce_profiles")
    .select("id")
    .eq("school_id", schoolId)
    .maybeSingle();

  const profileRow = {
    school_id: schoolId,
    teacher_count: profile.teacherCount,
    verified_teacher_count: profile.verifiedTeacherCount,
    average_reputation_score: profile.averageReputationScore,
    average_cri_score: profile.averageCriScore,
    credential_coverage: profile.credentialCoverage,
    career_stage_distribution: profile.careerStageDistribution,
    reputation_distribution: profile.reputationDistribution,
    top_gaps: profile.topGaps as any,
    promotion_ready_count: profile.promotionReadyCount,
    workforce_updated_at: profile.workforceUpdatedAt,
  };

  if (existing) {
    await supabase
      .from("school_workforce_profiles")
      .update(profileRow)
      .eq("id", existing.id);
  } else {
    await supabase
      .from("school_workforce_profiles")
      .insert(profileRow);
  }

  // 6. Persist — department snapshots (replace)
  const { error: delDeptErr } = await supabase
    .from("department_capability_snapshots")
    .delete()
    .eq("school_id", schoolId);
  if (delDeptErr) throw new Error(`Failed to clear department snapshots: ${delDeptErr.message}`);

  if (departments.length > 0) {
    const { error: insDeptErr } = await supabase.from("department_capability_snapshots").insert(
      departments.map((d) => ({
        school_id: schoolId,
        department_key: d.departmentKey,
        department_label: d.departmentLabel,
        teacher_count: d.teacherCount,
        average_reputation_score: d.averageReputationScore,
        average_cri_score: d.averageCriScore,
        verified_count: d.verifiedCount,
        credential_coverage: d.credentialCoverage,
        stage_distribution: d.stageDistribution,
        gap_score: d.gapScore,
      })),
    );
    if (insDeptErr) throw new Error(`Failed to insert department snapshots: ${insDeptErr.message}`);
  }

  // 7. Persist — gap reports (replace)
  const { error: delGapErr } = await supabase
    .from("workforce_gap_reports")
    .delete()
    .eq("school_id", schoolId);
  if (delGapErr) throw new Error(`Failed to clear gap reports: ${delGapErr.message}`);

  if (profile.topGaps.length > 0) {
    const { error: insGapErr } = await supabase.from("workforce_gap_reports").insert(
      profile.topGaps.map((g) => ({
        school_id: schoolId,
        gap_type: g.gapType,
        severity: g.severity,
        affected_department: g.affectedDepartment ?? null,
        description: g.description,
        recommended_intervention: g.recommendedIntervention ?? null,
      })),
    );
    if (insGapErr) throw new Error(`Failed to insert gap reports: ${insGapErr.message}`);
  }

  // 8. Persist — promotion readiness (replace)
  const { error: delPromoErr } = await supabase
    .from("promotion_readiness_entries")
    .delete()
    .eq("school_id", schoolId);
  if (delPromoErr) throw new Error(`Failed to clear promotion entries: ${delPromoErr.message}`);

  if (promotionPipeline.length > 0) {
    const { error: insPromoErr } = await supabase.from("promotion_readiness_entries").insert(
      promotionPipeline.map((p) => ({
        school_id: schoolId,
        teacher_id: p.teacherId,
        current_stage: p.currentStage ?? null,
        next_stage: p.nextStage ?? null,
        readiness_percent: p.readinessPercent,
        gap_count: p.gapCount,
        blocking_gaps: p.blockingGaps,
      })),
    );
    if (insPromoErr) throw new Error(`Failed to insert promotion entries: ${insPromoErr.message}`);
  }

  console.log(
    `[Workforce] Refresh complete: ${teamSignals.length} teachers, ${departments.length} departments, ${profile.topGaps.length} gaps`,
  );

  return explainability;
}
