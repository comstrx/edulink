/**
 * Growth Recommendation Refresh Service — Sprint 7C
 *
 * Orchestrates the full hiring→growth feedback pipeline:
 * 1. Load teacher runtime state
 * 2. Map hiring signals to growth targets
 * 3. Run growth recommendation engine
 * 4. Persist recommendations
 *
 * Triggered by Smart Glue events (rejection, training completion, etc.)
 */

import type { GrowthRecommendationRefreshResult } from "./types/growth-recommendation.types";
import { loadGrowthRawData } from "./growth-data-loader";
import { mapHiringToGrowth } from "./hiring-growth-mapper";
import { runGrowthRecommendationEngine } from "./growth-recommendation-engine";
import { writeGrowthRecommendations } from "./growth-recommendation-writer";
import { buildExplainabilityTrace } from "@/intelligence/observability/explainability.builder";
import { buildExplainabilityView } from "@/intelligence/explainability/explainability.presentation";
import { attachExplainabilityView } from "@/intelligence/explainability/explainability.attach";
import { logExecution } from "@/smart-glue/execution-telemetry";

export interface GrowthRefreshRequest {
  teacherId: string;
  triggeredBy?: string;
  traceId?: string;
}

export async function refreshGrowthRecommendations(
  request: GrowthRefreshRequest,
): Promise<GrowthRecommendationRefreshResult> {
  const { teacherId, triggeredBy, traceId: upstreamTraceId } = request;

  const traceId = upstreamTraceId ?? `growth_fallback_${Date.now()}`;

  if (!teacherId) {
    const explainability = buildExplainabilityTrace({
      traceId,
      stages: [{ stage: "growth_refresh", reasoning: "Guard: missing teacherId" }],
      summary: "Growth refresh skipped — no teacher ID provided",
    });
    return attachExplainabilityView({
      teacherId: "",
      recommendationsCreated: 0,
      recommendationsStaled: 0,
      success: false,
      error: "Missing teacherId",
      completedAt: new Date().toISOString(),
      explainability,
    });
  }

  logExecution({ traceId, stage: "event_received", handlerName: "growth-refresh", status: "ok", meta: { teacherId, triggeredBy } });

  try {
    // Step 1: Load raw data
    const rawData = await loadGrowthRawData(teacherId);

    logExecution({ traceId, stage: "pipeline_complete", handlerName: "growth-refresh:data_load", status: "ok", meta: {
      teacherId,
      rejectionCount: rawData.rejectionReasonTermIds.length,
      gapCount: rawData.gapTermIds.length,
      unmatchedCount: rawData.unmatchedTermIds.length,
    } });

    // Step 2: Map hiring signals to growth targets
    const mappingResult = mapHiringToGrowth({
      teacherId,
      rejectionReasonTermIds: rawData.rejectionReasonTermIds,
      rejectionReasonSlugs: rawData.rejectionReasonSlugs,
      unmatchedTermIds: rawData.unmatchedTermIds,
      gapTermIds: rawData.gapTermIds,
      sourceEvent: triggeredBy,
      profileState: rawData.profileState,
    });

    logExecution({ traceId, stage: "handler_completed", handlerName: "growth-refresh:mapping", status: "ok", meta: {
      teacherId,
      interventionTargets: mappingResult.interventionTargets.length,
    } });

    // Step 3: Run growth engine
    const engineResult = runGrowthRecommendationEngine({
      teacherId,
      interventionTargets: mappingResult.interventionTargets,
      teacherState: rawData.teacherState,
      catalogByTermId: rawData.catalogByTermId,
    });

    logExecution({ traceId, stage: "handler_completed", handlerName: "growth-refresh:engine", status: "ok", meta: {
      teacherId,
      recommendations: engineResult.recommendations.length,
      skipped: engineResult.skippedTargets.length,
    } });

    // Step 4: Persist
    const writeResult = await writeGrowthRecommendations(
      teacherId,
      engineResult.recommendations,
      traceId,
    );

    // Step 5: Build explainability from real pipeline signals
    const stageReasons: string[] = [];
    stageReasons.push(`${mappingResult.interventionTargets.length} intervention target(s) mapped from hiring signals`);
    if (rawData.rejectionReasonTermIds.length > 0) {
      stageReasons.push(`${rawData.rejectionReasonTermIds.length} rejection reason(s) processed`);
    }
    if (rawData.gapTermIds.length > 0) {
      stageReasons.push(`${rawData.gapTermIds.length} gap term(s) incorporated`);
    }

    const engineReasons: string[] = [];
    engineReasons.push(`${engineResult.recommendations.length} recommendation(s) generated`);
    if (engineResult.skippedTargets.length > 0) {
      engineReasons.push(`${engineResult.skippedTargets.length} target(s) skipped`);
      for (const s of engineResult.skippedTargets.slice(0, 3)) {
        engineReasons.push(`Skipped: ${s.reason}`);
      }
    }

    const sourceTypes = [...new Set(engineResult.recommendations.map(r => r.sourceType))];
    const actionTypes = [...new Set(engineResult.recommendations.map(r => r.recommendedActionType))];

    const explainability = buildExplainabilityTrace({
      traceId,
      stages: [
        { stage: "data_loading", reasoning: `Loaded signals for teacher ${teacherId}` },
        { stage: "hiring_growth_mapping", reasoning: stageReasons },
        { stage: "growth_engine", reasoning: engineReasons },
        { stage: "persistence", reasoning: `Wrote ${writeResult.insertedCount}, staled ${writeResult.staledCount}` },
      ],
      summary: `Growth refresh: ${engineResult.recommendations.length} recommendation(s) from ${sourceTypes.join(", ") || "no sources"} → ${actionTypes.join(", ") || "no actions"}`,
    });

    return attachExplainabilityView({
      teacherId,
      recommendationsCreated: writeResult.insertedCount,
      recommendationsStaled: writeResult.staledCount,
      success: writeResult.success,
      error: writeResult.error,
      completedAt: new Date().toISOString(),
      explainability,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logExecution({ traceId, stage: "pipeline_error", handlerName: "growth-refresh", status: "failed", meta: { error: msg } });
    const explainability = buildExplainabilityTrace({
      traceId,
      stages: [{ stage: "growth_refresh", reasoning: `Error: ${msg}` }],
      summary: `Growth refresh failed: ${msg}`,
    });
    return attachExplainabilityView({
      teacherId,
      recommendationsCreated: 0,
      recommendationsStaled: 0,
      success: false,
      error: msg,
      completedAt: new Date().toISOString(),
      explainability,
    });
  }
}
