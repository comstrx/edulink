/**
 * useSchoolTeamIntelligence — Sprint 13 PART 2 + PART 4
 *
 * Canonical hook for school team intelligence output.
 * Follows Hook Lifecycle Contract: resolvedState = loading | unavailable | resolved
 * Queryable, stable, and refreshable via Smart Glue invalidation.
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { resolveSchoolTeamIntelligence } from "../readers/school-team-intelligence.reader";
import type { SchoolTeamIntelligence } from "../types/school-intelligence.types";

export type SchoolTeamResolvedState = "loading" | "unavailable" | "resolved";

export interface SchoolTeamIntelligenceResult {
  resolvedState: SchoolTeamResolvedState;
  data: SchoolTeamIntelligence | null;
}

const EMPTY: SchoolTeamIntelligenceResult = {
  resolvedState: "unavailable",
  data: null,
};

export function useSchoolTeamIntelligence(
  schoolId: string | undefined,
): SchoolTeamIntelligenceResult {
  const query = useQuery<SchoolTeamIntelligence | null>({
    queryKey: ["school_intelligence", "team", schoolId],
    enabled: !!schoolId,
    staleTime: 120_000,
    queryFn: () => resolveSchoolTeamIntelligence(schoolId!),
  });

  return useMemo(() => {
    if (!schoolId) return EMPTY;
    if (query.isLoading) return { resolvedState: "loading" as const, data: null };
    if (!query.data) return EMPTY;
    return { resolvedState: "resolved" as const, data: query.data };
  }, [schoolId, query.isLoading, query.data]);
}
