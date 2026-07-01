/**
 * Trust Domain Adapter (Read-Only)
 *
 * Pure interpretation layer for trust/verification signals.
 * Reads ONLY from existing UIRecommendation fields — no DB, no services.
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

/** Whether the recommendation is a verification gating action. */
export function isVerificationAction(rec: UIRecommendation): boolean {
  return rec.actionType === "verification_action";
}

/** Whether the recommendation is any gating action (profile or verification). */
export function isGatingAction(rec: UIRecommendation): boolean {
  return (
    rec.actionType === "profile_completion_action" ||
    rec.actionType === "verification_action"
  );
}
