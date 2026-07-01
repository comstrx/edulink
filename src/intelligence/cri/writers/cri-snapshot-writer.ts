/**
 * CRI Snapshot Writer
 *
 * Persists a computed CriEngineResult to the intelligence_cri_snapshots table.
 * Uses the mark-stale-then-insert pattern.
 * Instrumented with trace snapshot logging (Phase 10A.1).
 *
 * Phase 4D — Live implementation
 */

import { supabase } from "@/integrations/supabase/client";
import type { CriEngineResult } from "../engine/cri-engine.types";
import { traceSnapshotWrite } from "@/intelligence/observability";
import { logExecution } from "@/smart-glue/execution-telemetry";

const ENGINE_VERSION = "cri-engine-v1";
/** General CRI uses a sentinel job_id since the column is NOT NULL */
const GENERAL_JOB_ID = "00000000-0000-0000-0000-000000000000";

export interface CriWriteOutcome {
  success: boolean;
  snapshotId?: string;
  error?: string;
}

/**
 * Map a CriEngineResult to the DB row shape and persist it.
 */
export async function writeCriEngineSnapshot(
  result: CriEngineResult,
  jobId?: string,
  traceId?: string,
): Promise<CriWriteOutcome> {
  const teacherId = result.teacherId;
  const effectiveJobId = jobId ?? GENERAL_JOB_ID;
  const now = result.computedAt ?? new Date().toISOString();
  const trace = traceId ?? "no-trace";

  logExecution({ traceId: trace, stage: "event_received", handlerName: "CriSnapshotWriter", status: "ok", meta: { teacherId, jobId: effectiveJobId, criScore: result.criScore, criBand: result.criBand } });

  if (traceId) {
    traceSnapshotWrite(traceId, "intelligence_cri_snapshots");
  }

  try {
    // Map engine result to DB row
    const dimensions = result.componentScores.map((c) => ({
      dimension: c.component,
      label: c.label,
      score: c.score,
      maxScore: c.maxScore,
      matched: c.met,
    }));

    const gapTermIds: string[] = [];

    const row = {
      teacher_id: teacherId,
      job_id: effectiveJobId,
      score: result.criScore,
      dimensions: JSON.parse(JSON.stringify(dimensions)),
      gap_term_ids: gapTermIds,
      staleness: "fresh",
      engine_version: ENGINE_VERSION,
      computed_at: now,
      updated_at: now,
    };

    // Upsert on (teacher_id, job_id) unique constraint
    const { data, error: upsertError } = await supabase
      .from("intelligence_cri_snapshots")
      .upsert([row], { onConflict: "teacher_id,job_id" })
      .select("id")
      .single();

    if (upsertError) {
      logExecution({ traceId: trace, stage: "handler_failed", handlerName: "CriSnapshotWriter", status: "failed", meta: { error: upsertError.message } });
      return { success: false, error: upsertError.message };
    }

    logExecution({ traceId: trace, stage: "handler_completed", handlerName: "CriSnapshotWriter", status: "ok", meta: { snapshotId: data?.id } });
    return { success: true, snapshotId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logExecution({ traceId: trace, stage: "pipeline_error", handlerName: "CriSnapshotWriter", status: "failed", meta: { error: message } });
    return { success: false, error: message };
  }
}