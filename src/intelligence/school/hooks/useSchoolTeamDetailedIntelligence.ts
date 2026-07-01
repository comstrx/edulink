/**
 * useSchoolTeamDetailedIntelligence — Sprint 1: Team Intelligence Layer
 *
 * Per-teacher intelligence hook for school team view.
 * Follows canonical Hook Lifecycle Contract.
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getSchoolTeamIntelligenceDetailed } from "../readers/school-team-detailed.reader";
import type { SchoolTeamDetailedIntelligence } from "../types/school-teacher-intelligence.types";

export type TeamDetailedResolvedState = "loading" | "unavailable" | "resolved";

export interface SchoolTeamDetailedResult {
  resolvedState: TeamDetailedResolvedState;
  data: SchoolTeamDetailedIntelligence | null;
}

const EMPTY: SchoolTeamDetailedResult = {
  resolvedState: "unavailable",
  data: null,
};

export function useSchoolTeamDetailedIntelligence(
  schoolId: string | undefined,
): SchoolTeamDetailedResult {
  const query = useQuery<SchoolTeamDetailedIntelligence>({
    queryKey: ["school_intelligence", "team_detailed", schoolId],
    enabled: !!schoolId,
    staleTime: 120_000,
    queryFn: () => getSchoolTeamIntelligenceDetailed(schoolId!),
  });

  return useMemo(() => {
    if (!schoolId) return EMPTY;
    if (query.isLoading) return { resolvedState: "loading" as const, data: null };
    if (!query.data) return EMPTY;
    return { resolvedState: "resolved" as const, data: query.data };
  }, [schoolId, query.isLoading, query.data]);
}
