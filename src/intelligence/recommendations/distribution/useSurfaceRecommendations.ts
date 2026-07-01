/**
 * useSurfaceRecommendations — Surface-Aware Recommendation Hook
 *
 * Wraps useUnifiedRecommendations with surface-specific distribution.
 * This is the recommended way for UI surfaces to consume recommendations.
 *
 * HARDENING: No cross-surface dependencies. Each surface call is
 * independently resolved by its own contract — no dashboard-first coupling.
 */

import { useMemo } from "react";
import { useUnifiedRecommendations } from "@/intelligence/adapters/hooks/useUnifiedRecommendations";
import { distributeForSurface } from "./surface-distributor";
import type { SurfaceType, SurfaceRecommendations } from "./surface-contracts";
import type { OrchestratorOutput } from "../orchestrator/recommendation-orchestrator";
import type { UserSegment, SegmentClassification } from "../personalization";
import type { SegmentMessaging } from "../personalization";

export interface SurfaceRecommendationsResult extends SurfaceRecommendations {
  isLoading: boolean;
  error: string | null;
  segment: UserSegment;
  segmentClassification: SegmentClassification;
  messaging: SegmentMessaging;
}

// Insight-only surfaces that must never consume the recommendation pipeline
const INSIGHT_ONLY_SURFACES: ReadonlySet<SurfaceType> = new Set(["school_dashboard"]);

export function useSurfaceRecommendations(
  teacherId: string | undefined,
  surface: SurfaceType,
): SurfaceRecommendationsResult {
  if (INSIGHT_ONLY_SURFACES.has(surface)) {
    console.warn(
      `[SurfaceRecommendations] "${surface}" is an insight-only surface and must not consume recommendations. Returning empty result.`,
    );
    return {
      surface,
      items: [],
      totalBeforeFilter: 0,
      isLoading: false,
      error: null,
      segment: "new_teacher" as any,
      segmentClassification: {} as any,
      messaging: {} as any,
    };
  }

  const unified = useUnifiedRecommendations(teacherId);

  const result = useMemo(() => {
    const output: OrchestratorOutput = {
      full: unified.allRecommendations,
      exposed: unified.recommendations,
    };

    return distributeForSurface(output, surface);
  }, [unified.recommendations, unified.allRecommendations, surface]);

  return {
    ...result,
    isLoading: unified.isLoading,
    error: unified.error,
    segment: unified.segment,
    segmentClassification: unified.segmentClassification,
    messaging: unified.messaging,
  };
}
