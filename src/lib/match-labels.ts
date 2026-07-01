/**
 * Canonical match label resolver — single source of truth.
 *
 * Used across: Applications, Job Detail, Jobs List, Professional Intelligence.
 * Thresholds: Strong ≥ 70, Moderate ≥ 45, Developing < 45.
 */

export type MatchLabel = "Strong" | "Moderate" | "Developing";

export function resolveMatchLabel(score: number | null | undefined): MatchLabel {
  if (score == null || score < 45) return "Developing";
  if (score >= 70) return "Strong";
  return "Moderate";
}

/** Style tokens per label for consistent badge rendering */
export const MATCH_LABEL_STYLES: Record<MatchLabel, string> = {
  Strong: "text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950",
  Moderate: "text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950",
  Developing: "text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950",
};

/** Tone mapping for narrative contexts */
export function resolveMatchTone(label: MatchLabel): "positive" | "neutral" | "cautious" {
  if (label === "Strong") return "positive";
  if (label === "Moderate") return "neutral";
  return "cautious";
}
