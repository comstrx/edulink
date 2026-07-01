/**
 * Intelligence Exposure Rules
 *
 * Defines the exposure matrix: which audience sees which intelligence
 * output at what detail level. This is the single source of truth
 * for intelligence access control at the product layer.
 *
 * Phase 4A — Intelligence Governance
 */

import type { ExposureAudience, ExposureLevel } from "../types/exposure.types";

// ── Intelligence output identifiers ────────────────────────────

export type IntelligenceOutput =
  | "cri"
  | "match"
  | "gap"
  | "recommendation"
  | "verification"
  | "rejection";

// ── Exposure matrix ────────────────────────────────────────────

/**
 * The master exposure matrix.
 *
 * Rules:
 * - CRI:            Teacher=full, School=summary (banded), Public=hidden, Admin=full
 * - Match:          Teacher=summary (strengths/gaps), School=full, Public=hidden, Admin=full
 * - Gap:            Teacher=full, School=summary (applied only), Public=hidden, Admin=full
 * - Recommendation: Teacher=full, School=hidden, Public=hidden, Admin=full
 * - Verification:   Teacher=full, School=badge, Public=badge, Admin=full
 */
export const EXPOSURE_MATRIX: Record<IntelligenceOutput, Record<ExposureAudience, ExposureLevel>> = {
  cri: {
    teacher: "full",
    school: "summary",
    public: "hidden",
    admin: "full",
  },
  match: {
    teacher: "summary",
    school: "full",
    public: "hidden",
    admin: "full",
  },
  gap: {
    teacher: "full",
    school: "summary",
    public: "hidden",
    admin: "full",
  },
  recommendation: {
    teacher: "full",
    school: "summary",
    public: "hidden",
    admin: "full",
  },
  verification: {
    teacher: "full",
    school: "badge",
    public: "badge",
    admin: "full",
  },
  rejection: {
    teacher: "summary",
    school: "full",
    public: "hidden",
    admin: "full",
  },
};

// ── Lookup helper ──────────────────────────────────────────────

/**
 * Resolves the exposure level for a given output × audience.
 * Defaults to "hidden" if lookup fails (safe default).
 */
export function getExposureLevel(
  output: IntelligenceOutput,
  audience: ExposureAudience,
): ExposureLevel {
  return EXPOSURE_MATRIX[output]?.[audience] ?? "hidden";
}
