/**
 * Mobility Refresh Service — Sprint 8C
 *
 * Orchestrates full mobility evaluation for a teacher:
 * Load signals → Evaluate all targets → Persist states → Build explainability
 */

import { supabase } from "@/integrations/supabase/client";
import { loadMobilitySignals, loadMobilityTargetsWithRequirements } from "./mobility-signals-loader";
import { evaluateMobilityTarget } from "./career-mobility-evaluator";
import type { MobilityEvaluationResult } from "../types/mobility.types";
import type { Json } from "@/integrations/supabase/types";
import type { MobilityExplainabilityBundle } from "../explainability/mobility-explainability.types";
import { buildMobilityExplainabilityBundle } from "../explainability/mobility-explainability.builder";
import {
  upsertTeacherMobilityState,
} from "@/lib/supabase-typed-queries";

export interface MobilityRefreshResult {
  teacherId: string;
  targetsEvaluated: number;
  success: boolean;
  error?: string;
  explainability?: MobilityExplainabilityBundle;
  /** Raw evaluation results for downstream feedback processing */
  evaluationResults?: MobilityEvaluationResult[];
}

export async function refreshMobilityState(
  teacherId: string
): Promise<MobilityRefreshResult> {
  try {
    const [signals, { targets, requirements }] = await Promise.all([
      loadMobilitySignals(teacherId),
      loadMobilityTargetsWithRequirements(),
    ]);

    if (targets.length === 0) {
      return {
        teacherId,
        targetsEvaluated: 0,
        success: true,
        explainability: buildMobilityExplainabilityBundle(teacherId, []),
      };
    }

    const results: MobilityEvaluationResult[] = [];
    for (const target of targets) {
      const targetReqs = requirements.filter((r) => r.targetId === target.id);
      if (targetReqs.length === 0) continue;

      const result = evaluateMobilityTarget(target, targetReqs, signals);
      results.push(result);
    }

    // Persist all states
    for (const result of results) {
      const blockingGaps = result.blockingRequirements.map((b) => ({
        key: b.requirement.requirementKey,
        label: b.explanation,
      }));

      await upsertTeacherMobilityState({
        teacher_id: teacherId,
        target_id: result.targetId,
        readiness_percent: result.readinessPercent,
        satisfied_count: result.satisfiedCount,
        total_count: result.totalCount,
        gap_count: result.gapCount,
        blocking_gaps: blockingGaps as unknown as Json,
        evaluation_trace: {
          satisfiedKeys: result.satisfiedRequirements.map((s) => s.requirement.requirementKey),
          unmetKeys: result.unmetRequirements.map((u) => u.requirement.requirementKey),
        } as unknown as Json,
        last_evaluated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const explainability = buildMobilityExplainabilityBundle(teacherId, results);

    return {
      teacherId,
      targetsEvaluated: results.length,
      success: true,
      explainability,
      evaluationResults: results,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      teacherId,
      targetsEvaluated: 0,
      success: false,
      error: message,
    };
  }
}
