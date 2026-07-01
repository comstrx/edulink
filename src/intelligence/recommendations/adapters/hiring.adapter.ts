/**
 * Hiring Domain Adapter (Read-Only)
 *
 * Pure interpretation layer for hiring-domain signals.
 * Reads ONLY from existing UIRecommendation fields — no DB, no services.
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

const REJECTION_PATTERNS = [
  "rejection",
  "rejected",
  "application_rejected",
  "hiring_rejection",
];

/** Whether the recommendation carries a rejection signal in its reasonCodes. */
export function hasRejectionSignal(rec: UIRecommendation): boolean {
  return rec.reasonCodes.some((code) =>
    REJECTION_PATTERNS.some((p) => code.toLowerCase().includes(p)),
  );
}

/** Whether the actionType represents a job/hiring recommendation. */
export function isJobType(rec: UIRecommendation): boolean {
  return (
    rec.actionType === "job_recommendation" ||
    rec.actionType === "job_application"
  );
}

/** Count the number of rejection-signaled recommendations in a list. */
export function countRejectionSignals(recs: UIRecommendation[]): number {
  return recs.filter(hasRejectionSignal).length;
}
