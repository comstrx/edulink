/**
 * useTeacherVerifiedStateSnapshot — React Query hook for Verified State consumption
 *
 * Reads the stable verified state snapshot for a teacher.
 * Does NOT compute verification status.
 */

import { useQuery } from "@tanstack/react-query";
import { selectTeacherVerifiedStateSnapshot } from "../selectors/intelligence-consumption.selectors";
import { loadingResult } from "../adapters/intelligence-consumption.adapters";
import type { VerifiedStateConsumptionResult } from "../types/intelligence-consumption.types";

export function useTeacherVerifiedStateSnapshot(
  teacherId: string | undefined,
): VerifiedStateConsumptionResult {
  const { data, isLoading } = useQuery({
    queryKey: ["intelligence", "verified-state", teacherId],
    queryFn: () => selectTeacherVerifiedStateSnapshot(teacherId!),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
  });

  if (!teacherId || isLoading) return loadingResult();
  return data ?? loadingResult();
}
