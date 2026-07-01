/**
 * Recommendation Refresh Service
 *
 * Orchestrates the recommendation pipeline:
 * 1. Validate teacherId
 * 2. Build normalized input (buildRecommendationEngineInput)
 * 3. Run engine (runRecommendationEngine)
 * 4. Write snapshot (writeRecommendationSnapshot)
 *
 * Phase 7D — Live Implementation
 */

import type { RecommendationEngineResult } from "../engine/recommendation-engine.types";
import { buildRecommendationEngineInput } from "../engine/recommendation-engine.inputs";
import { runRecommendationEngine } from "../engine/recommendation-engine";
import { writeRecommendationSnapshot } from "../writers/recommendation-snapshot-writer";

export interface RecommendationRefreshRequest {
  teacherId: string;
  triggeredBy?: string;
}

export interface RecommendationRefreshOutcome {
  success: boolean;
  teacherId: string;
  result: RecommendationEngineResult | null;
  snapshotWritten: boolean;
  completedAt: string;
  error?: string;
}

export async function refreshRecommendations(
  request: RecommendationRefreshRequest,
): Promise<RecommendationRefreshOutcome> {
  const { teacherId, triggeredBy } = request;

  if (!teacherId) {
    console.warn(`[RecService] Missing teacherId — aborting`);
    return {
      success: false,
      teacherId: "",
      result: null,
      snapshotWritten: false,
      completedAt: new Date().toISOString(),
      error: "Missing teacherId",
    };
  }

  console.log(`[RecService] Starting recommendation refresh`, { teacherId, triggeredBy });

  try {
    // Step 1: Build normalized input
    const input = await buildRecommendationEngineInput(teacherId, {
      triggeredByEvent: triggeredBy,
      triggeredAt: new Date().toISOString(),
    });

    console.log(`[RecService] Input assembled`, {
      teacherId,
      gapCount: input.gapSignals.gapItems.length,
      criScore: input.criSignals.criScore,
      catalogCourses: input.trainingCatalogSignals.availableCourseIds.length,
    });

    // Step 2: Run engine
    const result = runRecommendationEngine(input);

    console.log(`[RecService] Engine completed`, {
      teacherId,
      recommendationCount: result.recommendations.length,
      topCount: result.topRecommendationIds.length,
    });

    // Step 3: Write snapshot
    const writeOutcome = await writeRecommendationSnapshot(teacherId, result);

    if (!writeOutcome.success) {
      console.error(`[RecService] Snapshot write failed`, { teacherId, error: writeOutcome.error });
    } else {
      console.log(`[RecService] Snapshot written successfully`, { teacherId });
    }

    return {
      success: writeOutcome.success,
      teacherId,
      result,
      snapshotWritten: writeOutcome.success,
      completedAt: new Date().toISOString(),
      error: writeOutcome.error,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[RecService] Unexpected error`, { teacherId, error: message });
    return {
      success: false,
      teacherId,
      result: null,
      snapshotWritten: false,
      completedAt: new Date().toISOString(),
      error: message,
    };
  }
}
