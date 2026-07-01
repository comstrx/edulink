/**
 * CRI Refresh Service
 *
 * Orchestrates the full CRI refresh pipeline:
 *   1. Resolve teacherId
 *   2. Build normalized CriEngineInput
 *   3. Run the CRI engine
 *   4. Write the CRI snapshot
 *   5. Return structured execution result
 *
 * Phase 4D — Live implementation
 */

import type { CriEngineResult } from "../engine/cri-engine.types";
import { assembleCriInput } from "../engine/cri-engine.inputs";
import { runCriEngine } from "../engine/cri-engine";
import { writeCriEngineSnapshot } from "../writers/cri-snapshot-writer";
import type { CriWriteOutcome } from "../writers/cri-snapshot-writer";

// ── Request / Response contracts ───────────────────────────────

export interface CriRefreshRequest {
  teacherId: string;
  jobId?: string;
  triggeredByEvent?: string;
  triggeredAt?: string;
}

export interface CriRefreshOutcome {
  success: boolean;
  teacherId: string;
  inputSummary?: {
    profileCompletenessScore: number;
    completedCourseCount: number;
    totalVerifiedCount: number;
    applicationsCount: number;
  };
  criResult?: CriEngineResult;
  snapshotWritten: boolean;
  snapshotId?: string;
  completedAt: string;
  error?: string;
}

// ── Service ────────────────────────────────────────────────────

export async function refreshCri(
  request: CriRefreshRequest,
): Promise<CriRefreshOutcome> {
  const { teacherId, jobId, triggeredByEvent, triggeredAt } = request;
  const startTime = Date.now();

  console.log(`[CriRefreshService] Starting CRI refresh`, {
    teacherId,
    jobId: jobId ?? "general",
    triggeredByEvent,
  });

  // Guard: missing teacherId
  if (!teacherId) {
    console.warn(`[CriRefreshService] Missing teacherId`);
    return {
      success: false,
      teacherId: "",
      snapshotWritten: false,
      completedAt: new Date().toISOString(),
      error: "Missing teacherId",
    };
  }

  try {
    // Step 1: Build normalized input
    console.log(`[CriRefreshService] Building CRI input for ${teacherId}`);
    const input = await assembleCriInput(teacherId, {
      triggeredByEvent,
      triggeredAt,
    });

    const inputSummary = {
      profileCompletenessScore: input.profileSignals.profileCompletenessScore,
      completedCourseCount: input.trainingSignals.completedCourseCount,
      totalVerifiedCount: input.trustSignals.totalVerifiedCount,
      applicationsCount: input.hiringSignals.applicationsCount ?? 0,
    };

    console.log(`[CriRefreshService] Input assembled`, inputSummary);

    // Step 2: Run CRI engine
    const criResult = runCriEngine(input);

    console.log(`[CriRefreshService] Engine completed`, {
      teacherId,
      criScore: criResult.criScore,
      criBand: criResult.criBand,
      componentCount: criResult.componentScores.length,
      reasonCodeCount: criResult.reasonCodes.length,
      elapsedMs: Date.now() - startTime,
    });

    // Step 3: Write snapshot
    let writeOutcome: CriWriteOutcome;
    try {
      writeOutcome = await writeCriEngineSnapshot(criResult, jobId);
    } catch (writeErr) {
      const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
      console.error(`[CriRefreshService] Snapshot write failed:`, msg);
      writeOutcome = { success: false, error: msg };
    }

    if (!writeOutcome.success) {
      console.warn(`[CriRefreshService] Write failed but engine result is valid`, {
        error: writeOutcome.error,
      });
    } else {
      console.log(`[CriRefreshService] Snapshot written`, {
        snapshotId: writeOutcome.snapshotId,
      });
    }

    return {
      success: true,
      teacherId,
      inputSummary,
      criResult,
      snapshotWritten: writeOutcome.success,
      snapshotId: writeOutcome.snapshotId,
      completedAt: new Date().toISOString(),
      error: writeOutcome.success ? undefined : `Snapshot write failed: ${writeOutcome.error}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[CriRefreshService] Pipeline failed:`, message);
    return {
      success: false,
      teacherId,
      snapshotWritten: false,
      completedAt: new Date().toISOString(),
      error: message,
    };
  }
}
