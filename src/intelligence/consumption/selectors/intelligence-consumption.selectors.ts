/**
 * Intelligence Consumption Layer — Selectors
 *
 * Async selectors that read from the intelligence repository
 * and return UI-safe ConsumptionResult wrappers.
 *
 * Selectors MUST NOT compute intelligence values.
 * They read, adapt, and return.
 *
 * Step 8A — Consumption Selectors
 */

import { getRepository } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";
import type {
  CriConsumptionResult,
  MatchConsumptionResult,
  GapConsumptionResult,
  RecommendationConsumptionResult,
  VerifiedStateConsumptionResult,
} from "../types/intelligence-consumption.types";
import {
  adaptCriSnapshot,
  adaptMatchSnapshot,
  adaptGapSnapshot,
  adaptRecommendationSnapshot,
  adaptVerifiedStateSnapshot,
  errorResult,
} from "../adapters/intelligence-consumption.adapters";

// ── CRI ────────────────────────────────────────────────────────

export async function selectTeacherCriSnapshot(
  teacherId: string,
  jobId: string,
): Promise<CriConsumptionResult> {
  try {
    const repo = getRepository();
    const result = await repo.getTeacherCriSnapshot(teacherId, jobId);
    return adaptCriSnapshot(result);
  } catch (err) {
    return errorResult<CriConsumptionResult["data"]>(
      err instanceof Error ? err.message : "Failed to fetch CRI snapshot",
    );
  }
}

// ── Match ──────────────────────────────────────────────────────

export async function selectTeacherJobMatchSnapshot(
  teacherId: string,
  jobId: string,
): Promise<MatchConsumptionResult> {
  try {
    const repo = getRepository();
    const result = await repo.getTeacherJobMatchSnapshot(teacherId, jobId);
    return adaptMatchSnapshot(result);
  } catch (err) {
    return errorResult<MatchConsumptionResult["data"]>(
      err instanceof Error ? err.message : "Failed to fetch match snapshot",
    );
  }
}

// ── Gaps ───────────────────────────────────────────────────────

export async function selectTeacherGapSnapshot(
  teacherId: string,
): Promise<GapConsumptionResult> {
  try {
    const repo = getRepository();
    const result = await repo.getTeacherGapSnapshot(teacherId);
    return adaptGapSnapshot(result);
  } catch (err) {
    return errorResult<GapConsumptionResult["data"]>(
      err instanceof Error ? err.message : "Failed to fetch gap snapshot",
    );
  }
}

// ── Recommendations ────────────────────────────────────────────

export async function selectTeacherRecommendationsSnapshot(
  teacherId: string,
): Promise<RecommendationConsumptionResult> {
  try {
    const repo = getRepository();
    const result = await repo.getTeacherRecommendationsSnapshot(teacherId);
    return adaptRecommendationSnapshot(result);
  } catch (err) {
    return errorResult<RecommendationConsumptionResult["data"]>(
      err instanceof Error ? err.message : "Failed to fetch recommendation snapshot",
    );
  }
}

// ── Verified State ─────────────────────────────────────────────

export async function selectTeacherVerifiedStateSnapshot(
  teacherId: string,
): Promise<VerifiedStateConsumptionResult> {
  try {
    const repo = getRepository();
    const result = await repo.getTeacherVerifiedStateSnapshot(teacherId);
    return adaptVerifiedStateSnapshot(result);
  } catch (err) {
    return errorResult<VerifiedStateConsumptionResult["data"]>(
      err instanceof Error ? err.message : "Failed to fetch verified state snapshot",
    );
  }
}
