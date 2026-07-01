/**
 * Growth Contract — Canonical Vocabulary
 * Sprint 3: Single source of truth for Growth domain vocabulary.
 *
 * ALL growth producers and consumers MUST reference this file
 * for source_type and action_type values.
 *
 * Rules:
 * - DB reality is canonical for source_type
 * - Type system is canonical for action_type
 * - Legacy aliases exist ONLY for normalization compatibility
 */

// ── Canonical Source Types ─────────────────────────────────────
// These are the ONLY values that should be written to DB
// and used in filters, aggregations, and UI.

export const CANONICAL_SOURCE_TYPES = [
  "rejection_feedback",
  "gap_analysis",
  "training_completion",
] as const;

export type CanonicalSourceType = (typeof CANONICAL_SOURCE_TYPES)[number];

/** Legacy source_type aliases → canonical mapping (reader-side only) */
export const SOURCE_TYPE_ALIASES: Record<string, CanonicalSourceType> = {
  rejection_reason: "rejection_feedback",
  hiring_gap: "gap_analysis",
  match_weakness: "gap_analysis",
  gap_profile: "gap_analysis",
  talent_intelligence: "gap_analysis",
};

// ── Canonical Action Types ─────────────────────────────────────
// These are the ONLY values that should be written to DB
// and used in engine output, filters, and UI.

export const CANONICAL_ACTION_TYPES = [
  "enroll_course",
  "continue_pathway",
  "submit_evidence",
  "request_mentor_validation",
  "start_pathway",
  "revise_evidence",
  "pursue_credential",
  "complete_missing_course",
] as const;

export type CanonicalActionType = (typeof CANONICAL_ACTION_TYPES)[number];

/** Legacy action_type aliases → canonical mapping (reader-side only) */
export const ACTION_TYPE_ALIASES: Record<string, CanonicalActionType> = {
  enroll_now: "enroll_course",
};

// ── Display Labels ─────────────────────────────────────────────

export const ACTION_TYPE_LABELS: Record<CanonicalActionType, string> = {
  enroll_course: "Course Enrollment",
  start_pathway: "Start Pathway",
  continue_pathway: "Continue Pathway",
  submit_evidence: "Submit Evidence",
  revise_evidence: "Revise Evidence",
  request_mentor_validation: "Mentor Validation",
  pursue_credential: "Pursue Credential",
  complete_missing_course: "Complete Missing Course",
};

export const SOURCE_TYPE_LABELS: Record<CanonicalSourceType, string> = {
  rejection_feedback: "Hiring Feedback",
  gap_analysis: "Gap Analysis",
  training_completion: "Training Completion",
};

// ── Helpers ────────────────────────────────────────────────────

/** Resolve any source_type (canonical or legacy) to canonical */
export function toCanonicalSourceType(raw: string | null | undefined): CanonicalSourceType | string {
  if (!raw || raw.trim() === "") return "unknown";
  if ((CANONICAL_SOURCE_TYPES as readonly string[]).includes(raw)) return raw as CanonicalSourceType;
  return SOURCE_TYPE_ALIASES[raw] ?? raw;
}

/** Resolve any action_type (canonical or legacy) to canonical */
export function toCanonicalActionType(raw: string | null | undefined): CanonicalActionType | string {
  if (!raw || raw.trim() === "") return "general_development";
  if ((CANONICAL_ACTION_TYPES as readonly string[]).includes(raw)) return raw as CanonicalActionType;
  return ACTION_TYPE_ALIASES[raw] ?? raw;
}

/** Check if a source_type is hiring-driven (canonical) */
export function isCanonicalHiringSource(raw: string | null | undefined): boolean {
  const canonical = toCanonicalSourceType(raw);
  return (CANONICAL_SOURCE_TYPES as readonly string[]).includes(canonical);
}
