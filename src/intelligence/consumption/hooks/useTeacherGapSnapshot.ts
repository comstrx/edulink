/**
 * useTeacherGapSnapshot — React Query hook for Gap consumption
 *
 * Reads the stable gap snapshot for a teacher.
 * Does NOT compute gaps.
 */

import { useQuery } from "@tanstack/react-query";
import { selectTeacherGapSnapshot } from "../selectors/intelligence-consumption.selectors";
import { loadingResult } from "../adapters/intelligence-consumption.adapters";
import type { GapConsumptionResult } from "../types/intelligence-consumption.types";

export function useTeacherGapSnapshot(
  teacherId: string | undefined,
): GapConsumptionResult {
  const { data, isLoading } = useQuery({
    queryKey: ["intelligence", "gaps", teacherId],
    queryFn: () => selectTeacherGapSnapshot(teacherId!),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
  });

  if (!teacherId || isLoading) return loadingResult();
  return data ?? loadingResult();
}
