/**
 * Match Refresh Service
 *
 * Orchestrates the full match refresh pipeline:
 *   1. Gather raw teacher + job data
 *   2. Assemble normalized MatchEngineInput
 *   3. Run the match engine
 *   4. Write the resulting snapshot via the writer
 *
 * Phase 5D — Live implementation
 */

import type { MatchEngineResult } from "../engine/match-engine.types";
import { assembleMatchInput } from "../engine/match-engine.inputs";
import { runMatchEngine } from "../engine/match-engine";
import { writeMatchSnapshot } from "../writers/match-snapshot-writer";

export interface MatchRefreshRequest {
  teacherId: string;
  jobId: string;
  triggeredByEvent?: string;
  triggeredAt?: string;
}

export interface MatchRefreshOutcome {
  success: boolean;
  teacherId: string;
  jobId: string;
  result?: MatchEngineResult;
  snapshotWritten: boolean;
  completedAt: string;
  error?: string;
}

/**
 * Execute a full match refresh for one teacher–job pair.
 */
export async function refreshMatch(
  request: MatchRefreshRequest,
): Promise<MatchRefreshOutcome> {
  const { teacherId, jobId, triggeredByEvent, triggeredAt } = request;

  console.debug("[MatchRefreshService] Starting match refresh", { teacherId, jobId, triggeredByEvent });

  // Validate required IDs
  if (!teacherId) {
    console.warn("[MatchRefreshService] Missing teacherId");
    return {
      success: false,
      teacherId: "",
      jobId,
      snapshotWritten: false,
      completedAt: new Date().toISOString(),
      error: "Missing teacherId",
    };
  }

  if (!jobId) {
    console.warn("[MatchRefreshService] Missing jobId");
    return {
      success: false,
      teacherId,
      jobId: "",
      snapshotWritten: false,
      completedAt: new Date().toISOString(),
      error: "Missing jobId",
    };
  }

  // Step 1+2: Load raw data and assemble normalized input
  let input;
  try {
    input = await assembleMatchInput(teacherId, jobId, { triggeredByEvent, triggeredAt });
    console.debug("[MatchRefreshService] Input assembled", {
      teacherId,
      jobId,
      subjectCount: input.teacherProfile.subjectIds.length,
      jobSubjectCount: input.jobRequirements.requiredSubjectIds.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown input assembly error";
    console.error("[MatchRefreshService] Input assembly failed", { teacherId, jobId, error: message });
    return {
      success: false,
      teacherId,
      jobId,
      snapshotWritten: false,
      completedAt: new Date().toISOString(),
      error: `Input assembly failed: ${message}`,
    };
  }

  // Step 3: Run the match engine (pure computation)
  const matchResult = runMatchEngine(input);
  console.debug("[MatchRefreshService] Engine completed", {
    teacherId,
    jobId,
    matchScore: matchResult.matchScore,
    matchBand: matchResult.matchBand,
    hardRequirementsMet: matchResult.eligibility.hardRequirementsMet,
    hardRequirementsTotal: matchResult.eligibility.hardRequirementsTotal,
  });

  // Step 4: Write the snapshot
  let snapshotWritten = false;
  try {
    const writeOutcome = await writeMatchSnapshot(matchResult);
    snapshotWritten = writeOutcome.success;
    if (!writeOutcome.success) {
      console.error("[MatchRefreshService] Snapshot write failed", { error: writeOutcome.error });
      return {
        success: false,
        teacherId,
        jobId,
        result: matchResult,
        snapshotWritten: false,
        completedAt: new Date().toISOString(),
        error: `Snapshot write failed: ${writeOutcome.error}`,
      };
    }
    console.debug("[MatchRefreshService] Snapshot written", { snapshotId: writeOutcome.snapshotId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown write error";
    console.error("[MatchRefreshService] Snapshot write threw", { error: message });
    return {
      success: false,
      teacherId,
      jobId,
      result: matchResult,
      snapshotWritten: false,
      completedAt: new Date().toISOString(),
      error: `Snapshot write threw: ${message}`,
    };
  }

  return {
    success: true,
    teacherId,
    jobId,
    result: matchResult,
    snapshotWritten,
    completedAt: new Date().toISOString(),
  };
}
