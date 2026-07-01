/**
 * useTeacherMobility — Sprint 8C
 *
 * Reads teacher's precomputed mobility states for UI consumption.
 */

import { useQuery } from "@tanstack/react-query";
import type { TeacherMobilityState } from "../types/mobility.types";
import { buildMobilitySignals } from "../engine/mobility-signals";
import { fetchTeacherMobilityStates } from "@/lib/supabase-typed-queries";

export interface TeacherMobilityView {
  states: TeacherMobilityState[];
  signals: ReturnType<typeof buildMobilitySignals>;
  isLoading: boolean;
}

export function useTeacherMobility(teacherId?: string): TeacherMobilityView {
  const { data, isLoading } = useQuery({
    queryKey: ["teacher_mobility_states", teacherId],
    queryFn: () => fetchTeacherMobilityStates(teacherId!),
    enabled: !!teacherId,
  });

  const states = data ?? [];
  const signals = buildMobilitySignals(states);

  return { states, signals, isLoading };
}
