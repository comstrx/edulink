/**
 * Explanation Hooks
 *
 * Provide audience-aware explanation DTOs for UI components.
 * These wrap consumption hooks and apply explanation adapters.
 *
 * Phase 4.3 — Explainability Layer
 */

import { useMemo, useCallback } from "react";
import { useExposureAudience } from "@/intelligence/exposure/hooks/useExposureAudience";
import { useTeacherCriSnapshot } from "@/intelligence/consumption/hooks/useTeacherCriSnapshot";
import { useTeacherJobMatchSnapshot } from "@/intelligence/consumption/hooks/useTeacherJobMatchSnapshot";
import { useTeacherGapSnapshot } from "@/intelligence/consumption/hooks/useTeacherGapSnapshot";
import { useTeacherRecommendationsSnapshot } from "@/intelligence/consumption/hooks/useTeacherRecommendationsSnapshot";
import { useTeacherVerifiedStateSnapshot } from "@/intelligence/consumption/hooks/useTeacherVerifiedStateSnapshot";
import { explainCri } from "../adapters/cri-explanation.adapter";
import { explainMatch } from "../adapters/match-explanation.adapter";
import { explainGap } from "../adapters/gap-explanation.adapter";
import { explainRecommendation } from "../adapters/recommendation-explanation.adapter";
import { explainVerification } from "../adapters/verification-explanation.adapter";
import { trackExplanationView } from "../observability/explanation-tracker";
import type {
  CriExplanationDTO,
  MatchExplanationDTO,
  GapExplanationDTO,
  RecommendationExplanationDTO,
  VerificationExplanationDTO,
} from "../types/explanation.types";

interface ExplanationResult<T> {
  explanation: T;
  isReady: boolean;
  isLoading: boolean;
  /** Call when the user opens/views this explanation */
  trackView: () => void;
}

export function useCriExplanation(teacherId?: string, jobId?: string): ExplanationResult<CriExplanationDTO> {
  const audience = useExposureAudience();
  const result = useTeacherCriSnapshot(teacherId, jobId);
  const explanation = useMemo(
    () => explainCri(result.data ?? null, audience),
    [result.data, audience],
  );
  const trackView = useCallback(() => trackExplanationView("cri", audience), [audience]);
  return { explanation, isReady: result.status === "ready" || result.status === "stale", isLoading: result.status === "loading", trackView };
}

export function useMatchExplanation(teacherId?: string, jobId?: string): ExplanationResult<MatchExplanationDTO> {
  const audience = useExposureAudience();
  const result = useTeacherJobMatchSnapshot(teacherId, jobId);
  const explanation = useMemo(
    () => explainMatch(result.data ?? null, audience),
    [result.data, audience],
  );
  const trackView = useCallback(() => trackExplanationView("match", audience), [audience]);
  return { explanation, isReady: result.status === "ready" || result.status === "stale", isLoading: result.status === "loading", trackView };
}

export function useGapExplanation(teacherId?: string): ExplanationResult<GapExplanationDTO> {
  const audience = useExposureAudience();
  const result = useTeacherGapSnapshot(teacherId);
  const explanation = useMemo(
    () => explainGap(result.data ?? null, audience),
    [result.data, audience],
  );
  const trackView = useCallback(() => trackExplanationView("gap", audience), [audience]);
  return { explanation, isReady: result.status === "ready" || result.status === "stale", isLoading: result.status === "loading", trackView };
}

export function useRecommendationExplanation(teacherId?: string): ExplanationResult<RecommendationExplanationDTO> {
  const audience = useExposureAudience();
  const result = useTeacherRecommendationsSnapshot(teacherId);
  const explanation = useMemo(
    () => explainRecommendation(result.data ?? null, audience),
    [result.data, audience],
  );
  const trackView = useCallback(() => trackExplanationView("recommendation", audience), [audience]);
  return { explanation, isReady: result.status === "ready" || result.status === "stale", isLoading: result.status === "loading", trackView };
}

export function useVerificationExplanation(teacherId?: string): ExplanationResult<VerificationExplanationDTO> {
  const audience = useExposureAudience();
  const result = useTeacherVerifiedStateSnapshot(teacherId);
  const explanation = useMemo(
    () => explainVerification(result.data ?? null, audience),
    [result.data, audience],
  );
  const trackView = useCallback(() => trackExplanationView("verification", audience), [audience]);
  return { explanation, isReady: result.status === "ready" || result.status === "stale", isLoading: result.status === "loading", trackView };
}
