/**
 * Intelligence Read Models — Mappers
 *
 * Transform raw DB rows or matching-engine output into
 * typed read-model snapshots. No scoring logic — only shape mapping.
 *
 * Workstream 2B
 */

import type { MatchResult, DimensionResult } from "@/lib/matching";
import type {
  TeacherCriSnapshot,
  CriDimensionScore,
  TeacherJobMatchSnapshot,
  MatchDimensionScore,
  SnapshotMeta,
} from "../types/intelligence-read-models.types";

// ── Weights reference (mirrors matching.ts for label/maxScore) ─

const DIMENSION_META: Record<string, { label: string; maxScore: number }> = {
  subjects: { label: "Subjects", maxScore: 20 },
  curriculums: { label: "Curriculums", maxScore: 15 },
  gradeBands: { label: "Grade Bands", maxScore: 10 },
  location: { label: "Location", maxScore: 10 },
  employmentTypes: { label: "Employment", maxScore: 10 },
  workArrangements: { label: "Work Arrangement", maxScore: 10 },
  languages: { label: "Languages", maxScore: 10 },
  visaStatus: { label: "Visa Status", maxScore: 5 },
  certifications: { label: "Certifications", maxScore: 5 },
  experience: { label: "Experience", maxScore: 5 },
};

// ── Helpers ────────────────────────────────────────────────────

function buildMeta(engineVersion = "rule-v1"): SnapshotMeta {
  return {
    computedAt: new Date().toISOString(),
    staleness: "fresh",
    engineVersion,
  };
}

function mapDimensionsToCri(
  breakdown: Record<string, DimensionResult>,
): CriDimensionScore[] {
  return Object.entries(breakdown).map(([key, dim]) => ({
    dimension: key,
    label: DIMENSION_META[key]?.label ?? key,
    score: dim.score,
    maxScore: DIMENSION_META[key]?.maxScore ?? 0,
    matched: dim.matched,
  }));
}

function mapDimensionsToMatch(
  breakdown: Record<string, DimensionResult>,
): MatchDimensionScore[] {
  return Object.entries(breakdown).map(([key, dim]) => ({
    dimension: key,
    label: DIMENSION_META[key]?.label ?? key,
    score: dim.score,
    maxScore: DIMENSION_META[key]?.maxScore ?? 0,
    matched: dim.matched,
    reason: dim.reason,
  }));
}

// ── Mappers ────────────────────────────────────────────────────

/**
 * Map a MatchResult (from matchTeacherToJob) into a TeacherCriSnapshot.
 * This is a shape transformation — no new scoring logic.
 */
export function mapMatchResultToCriSnapshot(
  teacherId: string,
  jobId: string,
  result: MatchResult,
): TeacherCriSnapshot {
  return {
    teacherId,
    jobId,
    score: result.score,
    dimensions: mapDimensionsToCri(result.breakdown),
    gapTermIds: result.unmatchedTermIds,
    meta: buildMeta(),
  };
}

/**
 * Map a MatchResult into a TeacherJobMatchSnapshot.
 * Shape transformation only.
 */
export function mapMatchResultToMatchSnapshot(
  teacherId: string,
  jobId: string,
  result: MatchResult,
): TeacherJobMatchSnapshot {
  return {
    teacherId,
    jobId,
    score: result.score,
    confidence: result.confidence,
    dimensions: mapDimensionsToMatch(result.breakdown),
    matchedTermIds: result.matchedTermIds,
    unmatchedTermIds: result.unmatchedTermIds,
    meta: buildMeta(),
  };
}
