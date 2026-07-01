/**
 * useSchoolTeamGapIntelligence — Sprint 2: Gap Intelligence
 *
 * Aggregated team gap patterns hook.
 * Follows canonical Hook Lifecycle Contract.
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getSchoolTeamGapIntelligence } from "../readers/school-gap-intelligence.reader";
import type { SchoolTeamGapIntelligence } from "../types/school-gap-intelligence.types";

export type GapIntelligenceResolvedState = "loading" | "unavailable" | "resolved";

export interface SchoolTeamGapIntelligenceResult {
  resolvedState: GapIntelligenceResolvedState;
  data: SchoolTeamGapIntelligence | null;
}

const EMPTY: SchoolTeamGapIntelligenceResult = {
  resolvedState: "unavailable",
  data: null,
};

export function useSchoolTeamGapIntelligence(
  schoolId: string | undefined,
): SchoolTeamGapIntelligenceResult {
  const query = useQuery<SchoolTeamGapIntelligence>({
    queryKey: ["school_intelligence", "team_gaps", schoolId],
    enabled: !!schoolId,
    staleTime: 120_000,
    queryFn: () => getSchoolTeamGapIntelligence(schoolId!),
  });

  return useMemo(() => {
    if (!schoolId) return EMPTY;
    if (query.isLoading) return { resolvedState: "loading" as const, data: null };
    if (!query.data) return EMPTY;
    return { resolvedState: "resolved" as const, data: query.data };
  }, [schoolId, query.isLoading, query.data]);
}
