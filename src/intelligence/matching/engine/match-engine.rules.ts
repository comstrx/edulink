/**
 * Match Engine v1 — Rules & Thresholds
 *
 * Centralized constants for component weights, band thresholds,
 * and utility helpers used by the match engine.
 *
 * Phase 5A — Skeleton (placeholders only)
 */

import type { MatchBand } from "./match-engine.types";

// ── Component Weights (must sum to 100) ────────────────────────

export const MATCH_COMPONENT_WEIGHTS = {
  subjects: 20,
  curriculums: 15,
  grade_bands: 10,
  location: 10,
  employment_type: 10,
  work_arrangement: 10,
  languages: 10,
  visa_status: 5,
  certifications: 5,
  experience: 5,
} as const satisfies Record<string, number>;

// ── Band Thresholds ────────────────────────────────────────────

/** Ordered from highest to lowest — first match wins */
export const MATCH_BAND_THRESHOLDS: { minScore: number; band: MatchBand }[] = [
  { minScore: 80, band: "high" },
  { minScore: 60, band: "strong" },
  { minScore: 40, band: "partial" },
  { minScore: 0, band: "weak" },
];

// ── Hard Requirement Policies ──────────────────────────────────

/**
 * Components that are considered "hard requirements".
 * If a job specifies these, the teacher MUST have at least one overlap
 * to be considered eligible.
 */
export const HARD_REQUIREMENT_COMPONENTS = [
  "subjects",
  "curriculums",
  "certifications",
  "languages",
  "experience",
  "location",
] as const;

// ── Helpers ────────────────────────────────────────────────────

/**
 * Resolve a 0–100 score into its match band.
 */
export function resolveMatchBand(score: number): MatchBand {
  for (const entry of MATCH_BAND_THRESHOLDS) {
    if (score >= entry.minScore) return entry.band;
  }
  return "weak";
}

/**
 * Clamp a numeric value to 0–max range.
 */
export function clampMatchScore(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

/**
 * Compute overlap ratio between two ID arrays.
 * Returns 0 if required is empty (no requirement = automatic pass).
 */
export function overlapRatio(teacherIds: string[], requiredIds: string[]): number {
  if (requiredIds.length === 0) return 1;
  if (teacherIds.length === 0) return 0;
  const teacherSet = new Set(teacherIds);
  const matched = requiredIds.filter((id) => teacherSet.has(id)).length;
  return matched / requiredIds.length;
}
