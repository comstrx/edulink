/**
 * useSchoolHiringIntelligence — Sprint 13 PART 2 + PART 4
 *
 * Canonical hook for school hiring intelligence output.
 * Follows Hook Lifecycle Contract: resolvedState = loading | unavailable | resolved
 * Queryable, stable, and refreshable via Smart Glue invalidation.
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { resolveSchoolHiringIntelligence } from "../readers/school-hiring-intelligence.reader";
import type { SchoolHiringIntelligence } from "../types/school-intelligence.types";

export type SchoolHiringResolvedState = "loading" | "unavailable" | "resolved";

export interface SchoolHiringIntelligenceResult {
  resolvedState: SchoolHiringResolvedState;
  data: SchoolHiringIntelligence | null;
}

const EMPTY: SchoolHiringIntelligenceResult = {
  resolvedState: "unavailable",
  data: null,
};

export function useSchoolHiringIntelligence(
  schoolId: string | undefined,
): SchoolHiringIntelligenceResult {
  const query = useQuery<SchoolHiringIntelligence | null>({
    queryKey: ["school_intelligence", "hiring", schoolId],
    enabled: !!schoolId,
    staleTime: 120_000,
    queryFn: () => resolveSchoolHiringIntelligence(schoolId!),
  });

  return useMemo(() => {
    if (!schoolId) return EMPTY;
    if (query.isLoading) return { resolvedState: "loading" as const, data: null };
    if (!query.data) return EMPTY;
    return { resolvedState: "resolved" as const, data: query.data };
  }, [schoolId, query.isLoading, query.data]);
}
