/**
 * Match Snapshot Writer
 *
 * Persists a computed MatchEngineResult to the intelligence_match_snapshots table.
 * Uses mark-stale-then-insert pattern.
 * Instrumented with trace snapshot logging (Phase 10A.1).
 *
 * Phase 5D — Live implementation
 */

import { supabase } from "@/integrations/supabase/client";
import type { MatchEngineResult } from "../engine/match-engine.types";
import { traceSnapshotWrite } from "@/intelligence/observability";
import { logExecution } from "@/smart-glue/execution-telemetry";

const ENGINE_VERSION = "match-v1";

export interface MatchWriteOutcome {
  success: boolean;
  snapshotId?: string;
  error?: string;
}

function mapResultToRow(result: MatchEngineResult) {
  const { hardRequirementsMet, hardRequirementsTotal } = result.eligibility;
  let confidence: "low" | "medium" | "high" = "low";
  if (hardRequirementsTotal === 0 || hardRequirementsMet === hardRequirementsTotal) {
    confidence = result.matchScore >= 60 ? "high" : "medium";
  } else if (hardRequirementsMet / hardRequirementsTotal >= 0.5) {
    confidence = "medium";
  }

  const dimensions = result.componentScores.map((cs) => ({
    dimension: cs.component,
    label: cs.label,
    score: cs.score,
    maxScore: cs.maxScore,
    matched: cs.matched,
    reason: cs.matched ? "Aligned" : "Gap detected",
  }));

  const matchedTermIds = result.strengths
    .filter((s) => s.signal !== "verified_profile" && s.signal !== "training_completed")
    .map((s) => s.signal);
  const unmatchedTermIds = result.gaps
    .filter((g) => g.signal !== "insufficient_experience" && g.signal !== "location_mismatch")
    .map((g) => g.signal);

  return {
    teacher_id: result.teacherId,
    job_id: result.jobId,
    score: result.matchScore,
    confidence,
    dimensions: JSON.parse(JSON.stringify(dimensions)),
    matched_term_ids: matchedTermIds,
    unmatched_term_ids: unmatchedTermIds,
    staleness: "fresh",
    engine_version: ENGINE_VERSION,
    computed_at: result.computedAt,
  };
}

export async function writeMatchSnapshot(
  result: MatchEngineResult,
  traceId?: string,
): Promise<MatchWriteOutcome> {
  const row = mapResultToRow(result);
  const now = new Date().toISOString();
  const trace = traceId ?? "no-trace";

  logExecution({ traceId: trace, stage: "event_received", handlerName: "MatchSnapshotWriter", status: "ok", meta: { teacherId: result.teacherId, jobId: result.jobId, score: result.matchScore, band: result.matchBand } });

  if (traceId) {
    traceSnapshotWrite(traceId, "intelligence_match_snapshots");
  }

  // Upsert on (teacher_id, job_id) unique constraint
  const { data, error } = await supabase
    .from("intelligence_match_snapshots")
    .upsert([{ ...row, updated_at: now }], { onConflict: "teacher_id,job_id" })
    .select("id")
    .single();

  if (error) {
    logExecution({ traceId: trace, stage: "handler_failed", handlerName: "MatchSnapshotWriter", status: "failed", meta: { error: error.message } });
    return { success: false, error: error.message };
  }

  logExecution({ traceId: trace, stage: "handler_completed", handlerName: "MatchSnapshotWriter", status: "ok", meta: { snapshotId: data?.id } });
  return { success: true, snapshotId: data?.id };
}