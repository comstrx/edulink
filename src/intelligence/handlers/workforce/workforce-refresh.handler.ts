/**
 * Workforce Refresh Intent Handler — Sprint 8D + Sprint 4 (Feedback Loop)
 *
 * Resolves the teacher's school(s), triggers workforce refresh,
 * then analyzes outputs and executes feedback actions.
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import { supabase } from "@/integrations/supabase/client";
import { refreshWorkforceIntelligence } from "@/workforce/engine/workforce-refresh.service";
import { analyzeWorkforceFeedback, executeWorkforceFeedback } from "@/workforce/engine/workforce-feedback.service";
import { loadSchoolTeamSignals } from "@/workforce/engine/workforce-signals-loader";
import type { IntentHandler, HandlerContext, HandlerResult } from "../core/intent-handler.types";
import type { IntentEmission } from "@/smart-glue/types";

export const workforceRefreshHandler: IntentHandler = {
  intentName: EVENT_NAMES.intents.workforceRefreshRequested,
  description: "Refreshes workforce intelligence for schools containing the teacher, then triggers feedback actions",

  async handle(intent: IntentEmission, context: HandlerContext): Promise<HandlerResult> {
    const start = Date.now();
    const { teacherId, triggeredBy } = intent.payload as { teacherId: string; triggeredBy: string };
    console.log(`[Workforce Handler] Triggered by ${triggeredBy} for teacher ${teacherId}`);

    try {
      const { data: memberships } = await supabase
        .from("school_team_members")
        .select("school_id")
        .eq("teacher_id", teacherId);

      if (!memberships || memberships.length === 0) {
        return {
          intent: EVENT_NAMES.intents.workforceRefreshRequested,
          handlerExecuted: "workforceRefreshHandler",
          outputsWritten: [],
          executionTimeMs: Date.now() - start,
          success: true,
        };
      }

      const outputsWritten = [
        "school_workforce_profiles",
        "department_capability_snapshots",
        "workforce_gap_reports",
        "promotion_readiness_entries",
      ];

      for (const m of memberships) {
        const explainability = await refreshWorkforceIntelligence(m.school_id);

        // Feedback loop: analyze outputs and trigger downstream actions
        if (explainability) {
          const teamSignals = await loadSchoolTeamSignals(m.school_id);
          const teacherIds = teamSignals.map((t) => t.teacherId);

          // Reconstruct minimal profile/departments/pipeline from explainability
          const { data: profileRow } = await supabase
            .from("school_workforce_profiles")
            .select("*")
            .eq("school_id", m.school_id)
            .maybeSingle();

          const { data: deptRows } = await supabase
            .from("department_capability_snapshots")
            .select("*")
            .eq("school_id", m.school_id);

          const { data: promoRows } = await supabase
            .from("promotion_readiness_entries")
            .select("*")
            .eq("school_id", m.school_id);

          if (profileRow) {
            const profile = {
              schoolId: m.school_id,
              teacherCount: profileRow.teacher_count,
              verifiedTeacherCount: profileRow.verified_teacher_count,
              averageReputationScore: profileRow.average_reputation_score,
              averageCriScore: profileRow.average_cri_score,
              credentialCoverage: profileRow.credential_coverage,
              careerStageDistribution: (profileRow.career_stage_distribution ?? {}) as Record<string, number>,
              reputationDistribution: (profileRow.reputation_distribution ?? {}) as Record<string, number>,
              topGaps: (profileRow.top_gaps ?? []) as any,
              promotionReadyCount: profileRow.promotion_ready_count,
              workforceUpdatedAt: profileRow.workforce_updated_at,
            };

            const departments = (deptRows ?? []).map((d) => ({
              departmentKey: d.department_key,
              departmentLabel: d.department_label,
              teacherCount: d.teacher_count,
              averageReputationScore: d.average_reputation_score,
              averageCriScore: d.average_cri_score,
              verifiedCount: d.verified_count,
              credentialCoverage: d.credential_coverage,
              stageDistribution: (d.stage_distribution ?? {}) as Record<string, number>,
              gapScore: d.gap_score,
            }));

            const pipeline = (promoRows ?? []).map((p) => ({
              teacherId: p.teacher_id,
              currentStage: p.current_stage ?? undefined,
              nextStage: p.next_stage ?? undefined,
              readinessPercent: p.readiness_percent,
              gapCount: p.gap_count,
              blockingGaps: (p.blocking_gaps ?? []) as Array<{ key: string; label: string }>,
            }));

            const feedbackActions = analyzeWorkforceFeedback(profile, departments, pipeline, teacherIds);

            if (feedbackActions.length > 0) {
              await executeWorkforceFeedback(m.school_id, feedbackActions, context.traceId);
              outputsWritten.push("growth_recommendations");
            }
          }
        }
      }

      return {
        intent: EVENT_NAMES.intents.workforceRefreshRequested,
        handlerExecuted: "workforceRefreshHandler",
        outputsWritten,
        executionTimeMs: Date.now() - start,
        success: true,
      };
    } catch (err: any) {
      return {
        intent: EVENT_NAMES.intents.workforceRefreshRequested,
        handlerExecuted: "workforceRefreshHandler",
        outputsWritten: [],
        executionTimeMs: Date.now() - start,
        success: false,
        error: err.message,
      };
    }
  },
};
