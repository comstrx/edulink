/**
 * useRecommendationsForSurface — Canonical Surface Hook
 *
 * Alias for useSurfaceRecommendations with the API signature
 * requested by Surface Orchestration spec: (surfaceType, teacherId).
 *
 * Internally delegates to useUnifiedRecommendations → distribution layer.
 */

import { useSurfaceRecommendations } from "@/intelligence/recommendations/distribution";
import type { SurfaceType } from "@/intelligence/recommendations/distribution";
import type { SurfaceRecommendationsResult } from "@/intelligence/recommendations/distribution";

export function useRecommendationsForSurface(
  surfaceType: SurfaceType,
  teacherId?: string,
): SurfaceRecommendationsResult {
  return useSurfaceRecommendations(teacherId, surfaceType);
}
