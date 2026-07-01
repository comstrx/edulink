/**
 * Growth Recommendation Writer — Sprint 7C
 *
 * Persists growth recommendations to the growth_recommendations table.
 * Manages lifecycle: stales old recs, writes new ones.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  ORCHESTRATION CONTRACT — Zero-Bypass Policy                   │
 * │                                                                │
 * │  This file is the SOLE insert authority for                    │
 * │  the growth_recommendations table.                             │
 * │                                                                │
 * │  ALL domains (Growth, Mobility, Workforce) MUST use            │
 * │  writeGrowthRecommendations() or                               │
 * │  insertSingleGrowthRecommendation() to persist recs.           │
 * │                                                                │
 * │  Direct supabase.from("growth_recommendations").insert()       │
 * │  is PROHIBITED outside this file.                              │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { supabase } from "@/integrations/supabase/client";
import { logExecution } from "@/smart-glue/execution-telemetry";
import type { GrowthRecommendation, GrowthRecommendationTrace } from "./types/growth-recommendation.types";

// ── Cross-Domain Boundary Input ────────────────────────────────
// Accepts canonical AND cross-domain source/action values at the
// writer boundary. This is NOT a taxonomy expansion — it is a
// local type-safety adapter so that Mobility and Workforce callers
// do not need unsafe `as` casts.
//
// The DB column is `text`, so any string is valid at runtime.
// This type simply enumerates the values that are KNOWN to be
// written today, keeping the boundary explicit and auditable.

/** Source types accepted at the writer boundary */
type BoundarySourceType =
  | GrowthRecommendation["sourceType"]
  | "workforce_intelligence"
  | "mobility_evaluation";

/** Action types accepted at the writer boundary */
type BoundaryActionType =
  | GrowthRecommendation["recommendedActionType"]
  | "workforce_growth";

export interface CrossDomainGrowthInput {
  teacherId: string;
  sourceType: BoundarySourceType;
  sourceReferenceId?: string;
  sourceTermIds: string[];
  recommendedItemId?: string;
  recommendedItemType?: string;
  recommendedActionType: BoundaryActionType;
  recommendationReason: string;
  recommendationTrace: GrowthRecommendationTrace;
  priorityScore: number;
}

export interface GrowthWriteResult {
  success: boolean;
  staledCount: number;
  insertedCount: number;
  error?: string;
}

export async function writeGrowthRecommendations(
  teacherId: string,
  recommendations: GrowthRecommendation[],
  traceId?: string,
): Promise<GrowthWriteResult> {
  const now = new Date().toISOString();

  logExecution({ traceId: traceId ?? "no-trace", stage: "event_received", handlerName: "GrowthWriter", status: "ok", meta: { teacherId, count: recommendations.length } });

  try {
    // Mark existing active recommendations as stale
    const { data: staledData } = await supabase
      .from("growth_recommendations")
      .update({ status: "stale", updated_at: now })
      .eq("teacher_id", teacherId)
      .eq("status", "active")
      .select("id");

    const staledCount = staledData?.length ?? 0;

    if (recommendations.length === 0) {
      logExecution({ traceId: traceId ?? "no-trace", stage: "handler_completed", handlerName: "GrowthWriter", status: "skipped", meta: { reason: "no_new_recommendations", staledCount } });
      return { success: true, staledCount, insertedCount: 0 };
    }

    // Insert new recommendations
    const rows = recommendations.map((rec) => ({
      teacher_id: teacherId,
      source_type: rec.sourceType,
      source_reference_id: rec.sourceReferenceId ?? null,
      source_term_ids: rec.sourceTermIds,
      recommended_item_id: rec.recommendedItemId ?? null,
      recommended_item_type: rec.recommendedItemType ?? null,
      recommended_action_type: rec.recommendedActionType,
      recommendation_reason: rec.recommendationReason,
      recommendation_trace: JSON.parse(JSON.stringify({
        ...rec.recommendationTrace,
        ...(traceId ? { traceId } : {}),
        inputSummary: {
          sourceTermCount: rec.sourceTermIds.length,
          sourceType: rec.sourceType,
          hasItemId: !!rec.recommendedItemId,
          gapTerms: rec.recommendationTrace.sourceGapTerms?.slice(0, 5) ?? [],
        },
      })),
      priority_score: rec.priorityScore,
      status: "active",
    }));

    const { error } = await supabase
      .from("growth_recommendations")
      .insert(rows);

    if (error) {
      logExecution({ traceId: traceId ?? "no-trace", stage: "handler_failed", handlerName: "GrowthWriter", status: "failed", meta: { error: error.message } });
      return { success: false, staledCount, insertedCount: 0, error: error.message };
    }

    logExecution({ traceId: traceId ?? "no-trace", stage: "handler_completed", handlerName: "GrowthWriter", status: "ok", meta: { insertedCount: rows.length, staledCount } });
    return { success: true, staledCount, insertedCount: rows.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logExecution({ traceId: traceId ?? "no-trace", stage: "pipeline_error", handlerName: "GrowthWriter", status: "failed", meta: { error: msg } });
    return { success: false, staledCount: 0, insertedCount: 0, error: msg };
  }
}

/**
 * Mark a specific recommendation as completed (teacher acted on it).
 */
export async function markGrowthRecommendationCompleted(
  recommendationId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("growth_recommendations")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", recommendationId);

  return !error;
}

/**
 * Insert a single growth recommendation without staling existing ones.
 * Used by cross-domain feedback loops (mobility, workforce) that produce
 * individual recommendations rather than full refreshes.
 */
export async function insertSingleGrowthRecommendation(
  rec: CrossDomainGrowthInput,
  traceId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("growth_recommendations")
      .insert({
        teacher_id: rec.teacherId,
        source_type: rec.sourceType,
        source_reference_id: rec.sourceReferenceId ?? null,
        source_term_ids: rec.sourceTermIds,
        recommended_item_id: rec.recommendedItemId ?? null,
        recommended_item_type: rec.recommendedItemType ?? null,
        recommended_action_type: rec.recommendedActionType,
        recommendation_reason: rec.recommendationReason,
        recommendation_trace: JSON.parse(JSON.stringify({
          ...rec.recommendationTrace,
          ...(traceId ? { traceId } : {}),
          inputSummary: {
            sourceTermCount: rec.sourceTermIds.length,
            sourceType: rec.sourceType,
            hasItemId: !!rec.recommendedItemId,
            gapTerms: rec.recommendationTrace.sourceGapTerms?.slice(0, 5) ?? [],
          },
        })),
        priority_score: rec.priorityScore,
        status: "active",
      });

    if (error) {
      logExecution({ traceId: traceId ?? "no-trace", stage: "handler_failed", handlerName: "GrowthWriter:single", status: "failed", meta: { error: error.message } });
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Mark a recommendation as dismissed by the teacher.
 */
export async function dismissGrowthRecommendation(
  recommendationId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("growth_recommendations")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .eq("id", recommendationId);

  return !error;
}
