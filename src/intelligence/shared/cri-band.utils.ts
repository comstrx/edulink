/**
 * Canonical CRI Band Mapping
 *
 * Single source of truth for converting CRI scores to band labels.
 * Matches the CRI engine's classifyBand() exactly.
 *
 * MUST NOT be modified without updating cri-compute.ts in sync.
 * Decision engine uses numeric scores directly — bands are display-only.
 */

export type CanonicalCriBand = "not_ready" | "emerging" | "strong" | "highly_ready";

/** Canonical thresholds — identical to CRI engine */
export function mapCriScoreToBand(score: number): CanonicalCriBand {
  if (score >= 80) return "highly_ready";
  if (score >= 60) return "strong";
  if (score >= 40) return "emerging";
  return "not_ready";
}

/** Display labels for UI rendering */
export const CRI_BAND_LABELS: Record<CanonicalCriBand, string> = {
  not_ready: "Not Ready",
  emerging: "Emerging",
  strong: "Strong",
  highly_ready: "Highly Ready",
};
