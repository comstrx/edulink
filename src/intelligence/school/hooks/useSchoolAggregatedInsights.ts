/**
 * useSchoolAggregatedInsights — Sprint 10
 *
 * Canonical hook for school-level aggregated intelligence insights.
 * Combines gaps, weak areas, hiring patterns, and recommendation insights.
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { resolveSchoolAggregatedInsights } from "../readers/school-aggregated-insights.reader";
import type { SchoolAggregatedInsights } from "../types/school-aggregated-insights.types";

export type AggregatedInsightsResolvedState = "loading" | "unavailable" | "resolved";

export interface SchoolAggregatedInsightsResult {
  resolvedState: AggregatedInsightsResolvedState;
  data: SchoolAggregatedInsights | null;
}

const EMPTY: SchoolAggregatedInsightsResult = {
  resolvedState: "unavailable",
  data: null,
};

export function useSchoolAggregatedInsights(
  schoolId: string | undefined,
): SchoolAggregatedInsightsResult {
  const query = useQuery<SchoolAggregatedInsights>({
    queryKey: ["school_intelligence", "aggregated_insights", schoolId],
    enabled: !!schoolId,
    staleTime: 120_000,
    queryFn: () => resolveSchoolAggregatedInsights(schoolId!),
  });

  return useMemo(() => {
    if (!schoolId) return EMPTY;
    if (query.isLoading) return { resolvedState: "loading" as const, data: null };
    if (!query.data) return EMPTY;
    return { resolvedState: "resolved" as const, data: query.data };
  }, [schoolId, query.isLoading, query.data]);
}
