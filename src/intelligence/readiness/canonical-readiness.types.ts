/**
 * Canonical Readiness Types — Single Source of Truth
 *
 * Readiness is a PERSISTED intelligence signal from intelligence_talent_profiles.
 * It is NOT computed in the frontend. It is NOT derived from growth signals.
 *
 * Canonical owner: intelligence_talent_profiles.readiness_level
 * Canonical producer: talent-intelligence-aggregator.ts → computeReadinessLevel()
 * Thresholds: CRI ≥86 → highly_ready, ≥71 → ready, ≥41 → developing, <41 → early
 */

/** The ONLY readiness enum used across the entire platform */
export type CanonicalReadinessLevel = "early" | "developing" | "ready" | "highly_ready";

/** Display labels — the ONLY label mapping allowed */
export const CANONICAL_READINESS_LABELS: Record<CanonicalReadinessLevel, string> = {
  early: "Early Stage",
  developing: "Developing",
  ready: "Ready",
  highly_ready: "Highly Ready",
};

/** Badge styling — the ONLY styling mapping allowed */
export const CANONICAL_READINESS_STYLES: Record<CanonicalReadinessLevel, string> = {
  early: "bg-muted text-muted-foreground",
  developing: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  highly_ready: "bg-primary/10 text-primary",
};

/** Type guard */
export function isCanonicalReadinessLevel(value: string): value is CanonicalReadinessLevel {
  return ["early", "developing", "ready", "highly_ready"].includes(value);
}
