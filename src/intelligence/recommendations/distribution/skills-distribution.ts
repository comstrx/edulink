/**
 * Skills Distribution — Surface-specific slice
 *
 * Filters recommendations relevant to skill development:
 * - training_actions, evidence_actions, certification_actions only
 * - No primary framing — flat list for gap-linked display
 *
 * HARDENING: No cross-surface dependency. Filtering is purely
 * contract-based via allowedGroupKeys — not relative to dashboard.
 *
 * Pure function — no hooks, no side effects.
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

const SKILLS_GROUP_KEYS = ["training_actions", "evidence_actions", "certification_actions"];

export interface SkillsDistribution {
  /** Gap-linked recommendations (training/evidence/certification only) */
  items: UIRecommendation[];
  /** Grouped by groupKey for sectioned display */
  grouped: Record<string, UIRecommendation[]>;
  /** Total count before any capping */
  totalAvailable: number;
}

export function distributeSkills(
  fullItems: UIRecommendation[],
  maxItems = 8,
): SkillsDistribution {
  // 1. Filter to skills-relevant groupKeys
  let relevant = fullItems.filter(
    (r) => r.groupKey && SKILLS_GROUP_KEYS.includes(r.groupKey),
  );

  // 2. Exclude completed
  relevant = relevant.filter((r) => r.status !== "completed");

  const totalAvailable = relevant.length;

  // 3. Cap
  const items = relevant.slice(0, maxItems);

  // 4. Group by groupKey
  const grouped = items.reduce<Record<string, UIRecommendation[]>>((acc, r) => {
    const key = r.groupKey ?? "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return { items, grouped, totalAvailable };
}
