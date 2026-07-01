/**
 * Profile Domain Adapter (Read-Only)
 *
 * Pure interpretation layer for profile-domain signals.
 * Reads ONLY from existing UIRecommendation fields — no DB, no services.
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

/** Whether the recommendation is a profile completion gating action. */
export function isProfileCompletionAction(rec: UIRecommendation): boolean {
  return rec.actionType === "profile_completion_action";
}
