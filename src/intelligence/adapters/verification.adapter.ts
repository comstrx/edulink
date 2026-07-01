/**
 * Verification Adapter
 *
 * Converts TeacherVerifiedStateSnapshot → VerificationSignal.
 * No recomputation. Pure mapping only.
 *
 * Step 10C — Intelligence Injection Layer
 */

import type { TeacherVerifiedStateSnapshot } from "@/intelligence/read-models/types/intelligence-read-models.types";
import type { VerificationSignal, VerificationLevel, BadgeType } from "./types/adapter-signals.types";

function statusToLevel(status: "none" | "partial" | "full"): VerificationLevel {
  switch (status) {
    case "full": return "verified";
    case "partial": return "partial";
    default: return "unverified";
  }
}

function computeBadgeType(verifiedCount: number, totalCount: number): BadgeType {
  if (totalCount === 0) return "none";
  const ratio = verifiedCount / totalCount;
  if (ratio >= 1) return "gold";
  if (ratio >= 0.6) return "silver";
  if (ratio > 0) return "bronze";
  return "none";
}

export function adaptVerificationToSignal(
  snapshot: TeacherVerifiedStateSnapshot | null,
): VerificationSignal | null {
  if (!snapshot) return null;

  const verifiedComponents = snapshot.credentials
    .filter((c) => c.verified)
    .map((c) => ({
      termId: c.termId,
      credentialType: c.credentialType,
      verifiedAt: c.verifiedAt ?? null,
    }));

  const missingVerifications = snapshot.credentials
    .filter((c) => !c.verified)
    .map((c) => ({
      termId: c.termId,
      credentialType: c.credentialType,
    }));

  return {
    verificationLevel: statusToLevel(snapshot.overallStatus),
    verifiedComponents,
    missingVerifications,
    badgeType: computeBadgeType(snapshot.verifiedCount, snapshot.totalCount),
    verifiedCount: snapshot.verifiedCount,
    totalCount: snapshot.totalCount,
  };
}
