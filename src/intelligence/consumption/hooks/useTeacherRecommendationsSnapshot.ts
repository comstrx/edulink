/**
 * useTeacherRecommendationsSnapshot — React Query hook for Recommendation consumption
 *
 * Reads the stable recommendation snapshot for a teacher.
 * Does NOT compute recommendations.
 */

import { useQuery } from "@tanstack/react-query";
import { selectTeacherRecommendationsSnapshot } from "../selectors/intelligence-consumption.selectors";
import { loadingResult } from "../adapters/intelligence-consumption.adapters";
import type { RecommendationConsumptionResult } from "../types/intelligence-consumption.types";

export function useTeacherRecommendationsSnapshot(
  teacherId: string | undefined,
): RecommendationConsumptionResult {
  const { data, isLoading } = useQuery({
    queryKey: ["intelligence", "recommendations", teacherId],
    queryFn: () => selectTeacherRecommendationsSnapshot(teacherId!),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
  });

  if (!teacherId || isLoading) return loadingResult();
  return data ?? loadingResult();
}
