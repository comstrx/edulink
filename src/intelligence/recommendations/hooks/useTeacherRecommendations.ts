/**
 * useTeacherRecommendations — Sprint 6
 *
 * Teacher-specific recommendation hook.
 * Wraps useUnifiedRecommendations and applies the Teacher adapter
 * to produce a role-specific view model.
 *
 * This hook is additive — existing consumers of useUnifiedRecommendations
 * continue to work unchanged.
 */

import { useMemo } from "react";
import { useUnifiedRecommendations } from "@/intelligence/adapters/hooks/useUnifiedRecommendations";
import {
  buildTeacherViewModel,
  type TeacherRecommendationViewModel,
} from "../adapters/teacher-recommendation.adapter";

export interface UseTeacherRecommendationsResult extends TeacherRecommendationViewModel {
  isLoading: boolean;
  error: string | null;
}

export function useTeacherRecommendations(
  teacherId?: string,
): UseTeacherRecommendationsResult {
  const { recommendations, allRecommendations, isLoading, error } =
    useUnifiedRecommendations(teacherId);

  const viewModel = useMemo(
    () =>
      buildTeacherViewModel({
        full: allRecommendations,
        exposed: recommendations,
      }),
    [recommendations, allRecommendations],
  );

  return {
    ...viewModel,
    isLoading,
    error,
  };
}
