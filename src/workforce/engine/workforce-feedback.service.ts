/**
 * Workforce Feedback Service — Sprint 4, Step 4
 *
 * Analyzes workforce refresh outputs and triggers downstream actions
 * through existing intelligence systems.
 *
 * Feedback loops:
 *   - Critical/high gaps → growth recommendation refresh for affected teachers
 *   - Low reputation departments → growth recommendation refresh
 *   - Promotion-ready teachers → growth recommendation refresh (advancement track)
 *
 * This service does NOT re-enter Smart Glue. It calls downstream
 * handlers/services directly to avoid recursive dispatch.
 */

import { supabase } from "@/integrations/supabase/client";
import { insertSingleGrowthRecommendation } from "@/intelligence/growth/growth-recommendation-writer";
import type {
  SchoolWorkforceProfile,
  DepartmentCapability,
  PromotionReadinessEntry,
  WorkforceGap,
} from "../types/workforce.types";
import { logExecution } from "@/smart-glue/execution-telemetry";

export interface WorkforceFeedbackAction {
  actionType: "growth_refresh" | "training_recommendation";
  teacherId: string;
  reason: string;
  sourceGapType?: string;
  severity?: string;
}

export interface WorkforceFeedbackResult {
  schoolId: string;
  actionsEmitted: WorkforceFeedbackAction[];
  skippedCount: number;
}

/**
 * Analyze workforce outputs and produce downstream feedback actions.
 * Returns structured actions — caller is responsible for execution.
 */
export function analyzeWorkforceFeedback(
  profile: SchoolWorkforceProfile,
  departments: DepartmentCapability[],
  promotionPipeline: PromotionReadinessEntry[],
  teamTeacherIds: string[],
): WorkforceFeedbackAction[] {
  const actions: WorkforceFeedbackAction[] = [];
  const seenTeachers = new Set<string>();

  // 1. Critical/high gaps → growth refresh for ALL team teachers
  const criticalGaps = profile.topGaps.filter(
    (g) => g.severity === "critical" || g.severity === "high",
  );

  if (criticalGaps.length > 0) {
    const topGap = criticalGaps[0];
    for (const teacherId of teamTeacherIds) {
      if (!seenTeachers.has(teacherId)) {
        seenTeachers.add(teacherId);
        actions.push({
          actionType: "growth_refresh",
          teacherId,
          reason: `Workforce gap: ${topGap.description}`,
          sourceGapType: topGap.gapType,
          severity: topGap.severity,
        });
      }
    }
  }

  // 2. High-gap departments → growth refresh for teachers in those departments
  //    (only if not already covered by school-wide gaps)
  const highGapDepts = departments.filter((d) => d.gapScore >= 70);
  for (const dept of highGapDepts.slice(0, 3)) {
    // Department teachers aren't directly available here,
    // so we flag this as a department-level action
    actions.push({
      actionType: "training_recommendation",
      teacherId: "__department__" + dept.departmentKey,
      reason: `Department "${dept.departmentLabel}" has gap score ${dept.gapScore}`,
      sourceGapType: "curriculum_coverage_gap",
      severity: dept.gapScore >= 85 ? "critical" : "high",
    });
  }

  // 3. Promotion-ready teachers → growth refresh (advancement track)
  for (const entry of promotionPipeline) {
    if (entry.readinessPercent >= 70 && !seenTeachers.has(entry.teacherId)) {
      seenTeachers.add(entry.teacherId);
      actions.push({
        actionType: "growth_refresh",
        teacherId: entry.teacherId,
        reason: `Promotion ready (${entry.readinessPercent}%) for ${entry.nextStage ?? "next stage"}`,
        sourceGapType: "no_leadership_pipeline",
      });
    }
  }

  // 4. Teachers with blocking gaps → growth refresh
  for (const entry of promotionPipeline) {
    if (entry.gapCount > 0 && !seenTeachers.has(entry.teacherId)) {
      seenTeachers.add(entry.teacherId);
      actions.push({
        actionType: "growth_refresh",
        teacherId: entry.teacherId,
        reason: `${entry.gapCount} blocking gaps for advancement to ${entry.nextStage ?? "next stage"}`,
        sourceGapType: "promotion_bottleneck",
      });
    }
  }

  return actions;
}

/**
 * Execute workforce feedback actions by persisting growth signals.
 * Uses growth_recommendations table directly (transitional canonical output).
 */
export async function executeWorkforceFeedback(
  schoolId: string,
  actions: WorkforceFeedbackAction[],
  traceId?: string,
): Promise<WorkforceFeedbackResult> {
  const teacherActions = actions.filter(
    (a) => a.actionType === "growth_refresh" && !a.teacherId.startsWith("__"),
  );

  if (teacherActions.length === 0) {
    return { schoolId, actionsEmitted: actions, skippedCount: 0 };
  }

  // Batch upsert growth recommendations sourced from workforce intelligence
  let insertedCount = 0;
  for (const a of teacherActions) {
    // Only insert if no active workforce recommendation already exists for this teacher
    const { data: existing } = await supabase
      .from("growth_recommendations")
      .select("id")
      .eq("teacher_id", a.teacherId)
      .eq("source_type", "workforce_intelligence")
      .eq("status", "active")
      .maybeSingle();

    if (!existing) {
      // Cross-domain values accepted by CrossDomainGrowthInput boundary type
      const result = await insertSingleGrowthRecommendation({
        teacherId: a.teacherId,
        sourceType: "workforce_intelligence",
        sourceReferenceId: schoolId,
        sourceTermIds: [],
        recommendedActionType: "workforce_growth",
        recommendationReason: a.reason,
        recommendationTrace: {
          mappedFrom: "workforce_feedback",
          blockingCondition: a.sourceGapType,
          suggestedOutcome: a.severity,
        },
        priorityScore: a.severity === "critical" ? 90 : a.severity === "high" ? 70 : 50,
      }, traceId);
      if (result.success) insertedCount++;
    }
  }

  if (traceId) {
    logExecution({
      traceId,
      stage: "workforce_feedback_executed",
      meta: {
        schoolId,
        totalActions: actions.length,
        teacherActions: teacherActions.length,
        inserted: insertedCount,
        skipped: teacherActions.length - insertedCount,
      },
    });
  }

  return {
    schoolId,
    actionsEmitted: actions,
    skippedCount: teacherActions.length - insertedCount,
  };
}
