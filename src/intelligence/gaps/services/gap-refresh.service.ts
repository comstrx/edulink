/**
 * Gap Refresh Service
 *
 * Orchestrates the full gap refresh pipeline:
 *   1. Validate teacherId
 *   2. Assemble normalized GapEngineInput
 *   3. Run the gap engine
 *   4. Write the resulting snapshot via the writer
 *
 * Phase 6D — Live implementation
 */

import type { GapEngineResult } from "../engine/gap-engine.types";
import { assembleGapInput } from "../engine/gap-engine.inputs";
import { runGapEngine } from "../engine/gap-engine";
import { writeGapSnapshot } from "../writers/gap-snapshot-writer";

export interface GapRefreshRequest {
  teacherId: string;
  jobId?: string | null;
  triggeredByEvent?: string;
  triggeredAt?: string;
}

export interface GapRefreshOutcome {
  success: boolean;
  teacherId: string;
  result?: GapEngineResult;
  snapshotWritten: boolean;
  completedAt: string;
  error?: string;
}

/**
 * Execute a full gap refresh for one teacher.
 */
export async function refreshGaps(
  request: GapRefreshRequest,
): Promise<GapRefreshOutcome> {
  const { teacherId, jobId, triggeredByEvent, triggeredAt } = request;

  console.debug("[GapRefreshService] Starting gap refresh", { teacherId, triggeredByEvent });

  if (!teacherId) {
    console.warn("[GapRefreshService] Missing teacherId");
    return {
      success: false,
      teacherId: "",
      snapshotWritten: false,
      completedAt: new Date().toISOString(),
      error: "Missing teacherId",
    };
  }

  // Step 1+2: Load raw data and assemble normalized input
  let input;
  try {
    input = await assembleGapInput(teacherId, { triggeredByEvent, triggeredAt });
    console.debug("[GapRefreshService] Input assembled", {
      teacherId,
      completeness: input.profileGapSignals.profileCompletenessScore,
      certCount: input.qualificationGapSignals.certificationIds.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown input assembly error";
    console.error("[GapRefreshService] Input assembly failed", { teacherId, error: message });
    return {
      success: false,
      teacherId,
      snapshotWritten: false,
      completedAt: new Date().toISOString(),
      error: `Input assembly failed: ${message}`,
    };
  }

  // Step 3: Run the gap engine (pure computation)
  const gapResult = runGapEngine(input);
  console.debug("[GapRefreshService] Engine completed", {
    teacherId,
    totalGaps: gapResult.totalGaps,
    priorityCount: gapResult.priorityGapIds.length,
  });

  // Step 4: Write the snapshot
  let snapshotWritten = false;
  try {
    const writeOutcome = await writeGapSnapshot(gapResult, jobId);
    snapshotWritten = writeOutcome.success;
    if (!writeOutcome.success) {
      console.error("[GapRefreshService] Snapshot write failed", { error: writeOutcome.error });
      return {
        success: false,
        teacherId,
        result: gapResult,
        snapshotWritten: false,
        completedAt: new Date().toISOString(),
        error: `Snapshot write failed: ${writeOutcome.error}`,
      };
    }
    console.debug("[GapRefreshService] Snapshot written", { snapshotId: writeOutcome.snapshotId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown write error";
    console.error("[GapRefreshService] Snapshot write threw", { error: message });
    return {
      success: false,
      teacherId,
      result: gapResult,
      snapshotWritten: false,
      completedAt: new Date().toISOString(),
      error: `Snapshot write threw: ${message}`,
    };
  }

  return {
    success: true,
    teacherId,
    result: gapResult,
    snapshotWritten,
    completedAt: new Date().toISOString(),
  };
}
