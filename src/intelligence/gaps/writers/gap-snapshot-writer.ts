/**
 * Gap Snapshot Writer
 *
 * Persists a computed GapEngineResult to the intelligence_gap_snapshots table.
 * Uses mark-stale-then-insert pattern.
 * Instrumented with trace snapshot logging (Phase 10A.1).
 *
 * Phase 6D — Live implementation
 */

import { supabase } from "@/integrations/supabase/client";
import type { GapEngineResult } from "../engine/gap-engine.types";
import { traceSnapshotWrite } from "@/intelligence/observability";

const ENGINE_VERSION = "gap-v1";

export interface GapWriteOutcome {
  success: boolean;
  snapshotId?: string;
  error?: string;
}

function mapResultToRow(result: GapEngineResult, jobId?: string | null) {
  const gaps = result.gapItems.map((g) => ({
    gapId: g.gapId,
    gapType: g.gapType,
    label: g.label,
    severity: g.severity,
    confidence: g.confidence,
    evidenceSources: g.evidenceSources,
    relatedSignals: g.relatedSignals,
    taxonomyTermId: g.taxonomyTermId ?? null,
    relatedJobId: g.relatedJobId ?? null,
  }));

  return {
    teacher_id: result.teacherId,
    job_id: jobId ?? null,
    total_gaps: result.totalGaps,
    gaps: JSON.parse(JSON.stringify(gaps)),
    staleness: "fresh",
    engine_version: ENGINE_VERSION,
    computed_at: result.computedAt,
  };
}

export async function writeGapSnapshot(
  result: GapEngineResult,
  jobId?: string | null,
  traceId?: string,
): Promise<GapWriteOutcome> {
  const row = mapResultToRow(result, jobId);
  const now = new Date().toISOString();

  console.debug("[GapWriter] Writing gap snapshot", {
    teacherId: result.teacherId,
    jobId: jobId ?? "general",
    totalGaps: result.totalGaps,
  });

  if (traceId) {
    traceSnapshotWrite(traceId, "intelligence_gap_snapshots");
  }

  // Delete existing rows for this teacher+job combo, then insert fresh
  // (gap_snapshots has no unique constraint, so we use delete+insert)
  const deleteFilter = supabase
    .from("intelligence_gap_snapshots")
    .delete()
    .eq("teacher_id", result.teacherId);

  const { error: deleteError } = jobId
    ? await deleteFilter.eq("job_id", jobId)
    : await deleteFilter.is("job_id", null);

  if (deleteError) {
    console.warn("[GapWriter] Failed to delete old snapshots (non-blocking)", deleteError.message);
  }

  const { data, error } = await supabase
    .from("intelligence_gap_snapshots")
    .insert([row])
    .select("id")
    .single();

  if (error) {
    console.error("[GapWriter] Failed to write snapshot:", error.message);
    return { success: false, error: error.message };
  }

  console.debug("[GapWriter] Snapshot written successfully", { snapshotId: data?.id });
  return { success: true, snapshotId: data?.id };
}
