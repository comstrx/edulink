/**
 * useTeacherJobMatchSnapshot — React Query hook for Match consumption
 *
 * Reads the stable match snapshot for a teacher×job pair.
 * Does NOT compute match scores.
 */

import { useQuery } from "@tanstack/react-query";
import { selectTeacherJobMatchSnapshot } from "../selectors/intelligence-consumption.selectors";
import { loadingResult } from "../adapters/intelligence-consumption.adapters";
import type { MatchConsumptionResult } from "../types/intelligence-consumption.types";

export function useTeacherJobMatchSnapshot(
  teacherId: string | undefined,
  jobId: string | undefined,
): MatchConsumptionResult {
  const { data, isLoading } = useQuery({
    queryKey: ["intelligence", "match", teacherId, jobId],
    queryFn: () => selectTeacherJobMatchSnapshot(teacherId!, jobId!),
    enabled: !!teacherId && !!jobId,
    staleTime: 5 * 60 * 1000,
  });

  if (!teacherId || !jobId || isLoading) return loadingResult();
  return data ?? loadingResult();
}
