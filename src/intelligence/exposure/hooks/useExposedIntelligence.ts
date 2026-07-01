/**
 * Exposure-Aware Intelligence Hooks
 *
 * These hooks wrap the consumption hooks and apply the exposure adapters
 * based on the current user's audience. Components should prefer these
 * hooks over raw consumption hooks to enforce governance rules.
 *
 * Phase 4.1 — Intelligence Governance
 */

import { useMemo } from "react";
import { useExposureAudience } from "./useExposureAudience";
import { useTeacherCriSnapshot } from "@/intelligence/consumption/hooks/useTeacherCriSnapshot";
import { useTeacherJobMatchSnapshot } from "@/intelligence/consumption/hooks/useTeacherJobMatchSnapshot";
import { useTeacherGapSnapshot } from "@/intelligence/consumption/hooks/useTeacherGapSnapshot";
import { useTeacherRecommendationsSnapshot } from "@/intelligence/consumption/hooks/useTeacherRecommendationsSnapshot";
import { useTeacherVerifiedStateSnapshot } from "@/intelligence/consumption/hooks/useTeacherVerifiedStateSnapshot";
import { exposeCri } from "../adapters/cri-exposure.adapter";
import { exposeMatch } from "../adapters/match-exposure.adapter";
import { exposeGap } from "../adapters/gap-exposure.adapter";
import { exposeRecommendation } from "../adapters/recommendation-exposure.adapter";
import { exposeVerification } from "../adapters/verification-exposure.adapter";
import type { CriExposed, MatchExposed, GapExposed, RecommendationExposed, VerificationExposed, ExposedHidden } from "../types/exposure.types";
import type { ConsumptionResult, ConsumptionMeta } from "@/intelligence/consumption/types/intelligence-consumption.types";

// ── Exposed result type ────────────────────────────────────────

export interface ExposedResult<T> {
  status: "ready" | "stale" | "empty" | "loading" | "error";
  exposed: T;
  metadata: ConsumptionMeta;
  error?: string | null;
}

const HIDDEN: ExposedHidden = { level: "hidden" };

function toExposedResult<TData, TExposed>(
  result: ConsumptionResult<TData>,
  transform: (data: TData | null) => TExposed,
  hiddenValue: TExposed,
): ExposedResult<TExposed> {
  if (result.status === "loading" || result.status === "error") {
    return { status: result.status, exposed: hiddenValue, metadata: result.metadata, error: result.error };
  }
  if (result.status === "empty" || !result.data) {
    return { status: "empty", exposed: hiddenValue, metadata: result.metadata };
  }
  return {
    status: result.status,
    exposed: transform(result.data),
    metadata: result.metadata,
  };
}

// ── Hooks ──────────────────────────────────────────────────────

export function useExposedCri(teacherId?: string, jobId?: string): ExposedResult<CriExposed> {
  const audience = useExposureAudience();
  const result = useTeacherCriSnapshot(teacherId, jobId);
  return useMemo(
    () => toExposedResult(result, (data) => exposeCri(data, audience), HIDDEN),
    [result, audience],
  );
}

export function useExposedMatch(teacherId?: string, jobId?: string): ExposedResult<MatchExposed> {
  const audience = useExposureAudience();
  const result = useTeacherJobMatchSnapshot(teacherId, jobId);
  return useMemo(
    () => toExposedResult(result, (data) => exposeMatch(data, audience), HIDDEN),
    [result, audience],
  );
}

export function useExposedGap(teacherId?: string): ExposedResult<GapExposed> {
  const audience = useExposureAudience();
  const result = useTeacherGapSnapshot(teacherId);
  return useMemo(
    () => toExposedResult(result, (data) => exposeGap(data, audience), HIDDEN),
    [result, audience],
  );
}

export function useExposedRecommendation(teacherId?: string): ExposedResult<RecommendationExposed> {
  const audience = useExposureAudience();
  const result = useTeacherRecommendationsSnapshot(teacherId);
  return useMemo(
    () => toExposedResult(result, (data) => exposeRecommendation(data, audience), HIDDEN),
    [result, audience],
  );
}

export function useExposedVerification(teacherId?: string): ExposedResult<VerificationExposed> {
  const audience = useExposureAudience();
  const result = useTeacherVerifiedStateSnapshot(teacherId);
  return useMemo(
    () => toExposedResult(result, (data) => exposeVerification(data, audience), HIDDEN),
    [result, audience],
  );
}
