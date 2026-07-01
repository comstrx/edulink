/**
 * Growth Normalization — Reader-Side Only
 *
 * Normalizes legacy and current DB values into the canonical vocabulary
 * defined in growth-contract.ts. Does NOT modify engine output or stored records.
 *
 * This layer exists as a safety net during the transition period.
 * Once all producers are aligned (Sprint 3+), this becomes a passthrough.
 */

import {
  CANONICAL_SOURCE_TYPES,
  CANONICAL_ACTION_TYPES,
  SOURCE_TYPE_ALIASES,
  ACTION_TYPE_ALIASES,
  ACTION_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  toCanonicalSourceType,
  toCanonicalActionType,
  isCanonicalHiringSource,
  type CanonicalSourceType,
} from "./growth-contract";

// ── Re-exports from canonical contract ─────────────────────────

export { CANONICAL_SOURCE_TYPES as HIRING_SOURCE_TYPES };
export type { CanonicalSourceType };

// ── Source Type Normalization ──────────────────────────────────

export function normalizeSourceType(raw: string | null | undefined): string {
  return toCanonicalSourceType(raw);
}

export function isHiringDriven(raw: string | null | undefined): boolean {
  return isCanonicalHiringSource(raw);
}

// ── Action Type Normalization ──────────────────────────────────

export function normalizeActionType(raw: string | null | undefined): string {
  return toCanonicalActionType(raw);
}

// ── Display Label Mapping ──────────────────────────────────────

const LEGACY_DISPLAY_LABELS: Record<string, string> = {
  enroll_now: "Course Enrollment",
  general_development: "General Development",
};

// ── Cross-Domain Action Type Labels ───────────────────────────
// Explicit labels for cross-domain action types that are not part
// of the canonical growth contract but are written by other domains
// via the growth-recommendation-writer boundary.

const CROSS_DOMAIN_ACTION_LABELS: Record<string, string> = {
  workforce_growth: "Workforce Development",
};

// ── Cross-Domain Source Type Labels ────────────────────────────
// Explicit labels for cross-domain source types that are not part
// of the canonical growth contract but are written by other domains
// via the growth-recommendation-writer boundary.

const CROSS_DOMAIN_SOURCE_LABELS: Record<string, string> = {
  mobility_evaluation: "Mobility Evaluation",
  workforce_intelligence: "Workforce Intelligence",
};

export function sourceTypeLabel(raw: string | null | undefined): string {
  if (!raw || raw.trim() === "") return "Unknown Source";
  // Check canonical source labels
  const canonical = toCanonicalSourceType(raw);
  if (SOURCE_TYPE_LABELS[canonical as keyof typeof SOURCE_TYPE_LABELS]) {
    return SOURCE_TYPE_LABELS[canonical as keyof typeof SOURCE_TYPE_LABELS];
  }
  // Check cross-domain labels
  if (CROSS_DOMAIN_SOURCE_LABELS[raw]) return CROSS_DOMAIN_SOURCE_LABELS[raw];
  // Fallback: humanize
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function actionTypeLabel(raw: string | null | undefined): string {
  if (!raw || raw.trim() === "" || raw === "null" || raw === "undefined") {
    return "General Development";
  }
  // Check canonical labels first
  const canonical = toCanonicalActionType(raw);
  if (ACTION_TYPE_LABELS[canonical as keyof typeof ACTION_TYPE_LABELS]) {
    return ACTION_TYPE_LABELS[canonical as keyof typeof ACTION_TYPE_LABELS];
  }
  // Check cross-domain action labels
  if (CROSS_DOMAIN_ACTION_LABELS[raw]) return CROSS_DOMAIN_ACTION_LABELS[raw];
  // Check legacy display labels
  if (LEGACY_DISPLAY_LABELS[raw]) return LEGACY_DISPLAY_LABELS[raw];
  // Fallback: humanize snake_case
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
