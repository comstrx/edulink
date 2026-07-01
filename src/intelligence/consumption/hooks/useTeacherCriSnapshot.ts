/**
 * useTeacherCriSnapshot — React Query hook for CRI consumption
 *
 * Reads the stable CRI snapshot for a teacher×job pair.
 * Does NOT compute CRI. Returns ConsumptionResult with status awareness.
 */

import { useQuery } from "@tanstack/react-query";
import { selectTeacherCriSnapshot } from "../selectors/intelligence-consumption.selectors";
import { loadingResult } from "../adapters/intelligence-consumption.adapters";
import type { CriConsumptionResult } from "../types/intelligence-consumption.types";

export function useTeacherCriSnapshot(
  teacherId: string | undefined,
  jobId: string | undefined,
): CriConsumptionResult {
  const { data, isLoading } = useQuery({
    queryKey: ["intelligence", "cri", teacherId, jobId],
    queryFn: () => selectTeacherCriSnapshot(teacherId!, jobId!),
    enabled: !!teacherId && !!jobId,
    staleTime: 5 * 60 * 1000,
  });

  if (!teacherId || !jobId || isLoading) return loadingResult();
  return data ?? loadingResult();
}
