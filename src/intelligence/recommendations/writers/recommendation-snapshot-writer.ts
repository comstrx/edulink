/**
 * Recommendation Snapshot Writer
 *
 * Persists computed RecommendationEngineResult to
 * intelligence_recommendation_snapshots.
 * Instrumented with trace snapshot logging (Phase 10A.1).
 *
 * Phase 7D — Live Implementation
 */

import { supabase } from "@/integrations/supabase/client";
import type { RecommendationEngineResult } from "../engine/recommendation-engine.types";
import { traceSnapshotWrite } from "@/intelligence/observability";
import { logExecution } from "@/smart-glue/execution-telemetry";

const ENGINE_VERSION = "rule-v1";

export interface RecommendationWriteOutcome {
  success: boolean;
  error?: string;
}

export async function writeRecommendationSnapshot(
  teacherId: string,
  result: RecommendationEngineResult,
  traceId?: string,
): Promise<RecommendationWriteOutcome> {
  const now = new Date().toISOString();
  const trace = traceId ?? "no-trace";

  logExecution({ traceId: trace, stage: "event_received", handlerName: "RecSnapshotWriter", status: "ok", meta: { teacherId, count: result.recommendations.length } });

  if (traceId) {
    traceSnapshotWrite(traceId, "intelligence_recommendation_snapshots");
  }

  // Upsert on teacher_id unique constraint — overwrites previous snapshot
  const { error } = await supabase
    .from("intelligence_recommendation_snapshots")
    .upsert([{
      teacher_id: teacherId,
      recommendations: JSON.parse(JSON.stringify(result.recommendations)),
      total_count: result.recommendations.length,
      staleness: "fresh",
      engine_version: ENGINE_VERSION,
      computed_at: result.generatedAt || now,
      updated_at: now,
    }], { onConflict: "teacher_id" });

  if (error) {
    logExecution({ traceId: trace, stage: "handler_failed", handlerName: "RecSnapshotWriter", status: "failed", meta: { error: error.message } });
    return { success: false, error: error.message };
  }

  logExecution({ traceId: trace, stage: "handler_completed", handlerName: "RecSnapshotWriter", status: "ok", meta: { teacherId, count: result.recommendations.length } });
  return { success: true };
}