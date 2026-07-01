/**
 * School Recommendation Adapter — Sprint 6
 *
 * Transforms orchestrator output into a School-specific view model.
 * Groups recommendations as institutional alerts and priority issues.
 * Pure transformation — no policy logic, no domain state mutation.
 *
 * Note: This is a foundational adapter. School-facing surfaces
 * will consume this when the school recommendation UI is built.
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";
import type { OrchestratorOutput } from "../orchestrator/recommendation-orchestrator";

// ── View Model ────────────────────────────────────────────────

export interface SchoolAlertGroup {
  category: string;
  label: string;
  items: UIRecommendation[];
  highestPriority: string;
}

export interface SchoolRecommendationViewModel {
  /** Recommendations grouped by issue category */
  alerts: SchoolAlertGroup[];
  /** Top priority issues across all categories */
  topIssues: UIRecommendation[];
}

// ── Constants ─────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  training_actions: "Training Gaps",
  evidence_actions: "Credential Verification",
  certification_actions: "Missing Certifications",
  hiring_actions: "Hiring Pipeline",
  trust_actions: "Trust & Verification",
  profile_actions: "Profile Completeness",
};

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

// ── Builder ───────────────────────────────────────────────────

/**
 * Builds the School view model from orchestrator output.
 * Groups full list by groupKey for institutional alerting.
 */
export function buildSchoolViewModel(
  output: OrchestratorOutput,
): SchoolRecommendationViewModel {
  const grouped: Record<string, UIRecommendation[]> = {};

  for (const rec of output.full) {
    const key = rec.groupKey ?? "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(rec);
  }

  const alerts: SchoolAlertGroup[] = Object.entries(grouped).map(
    ([category, items]) => {
      const sorted = [...items].sort(
        (a, b) => (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2),
      );
      return {
        category,
        label: CATEGORY_LABELS[category] ?? category.replace(/_/g, " "),
        items: sorted,
        highestPriority: sorted[0]?.priority ?? "low",
      };
    },
  );

  // Top issues: highest-priority non-completed across all groups
  const topIssues = output.full
    .filter((r) => r.status !== "completed")
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2))
    .slice(0, 5);

  return { alerts, topIssues };
}
