/**
 * Verification Explanation Adapter
 *
 * Transforms VerifiedStateConsumptionData → VerificationExplanationDTO per audience.
 *
 * Phase 4.3 — Explainability Layer
 */

import type { VerifiedStateConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";
import type { ExposureAudience } from "@/intelligence/exposure/types/exposure.types";
import type { VerificationExplanationDTO, EvidencePoint } from "../types/explanation.types";
import { FALLBACK_EXPLANATION } from "../types/explanation.types";
import { clampEvidence } from "../utils/explanation-helpers";

export function explainVerification(
  data: VerifiedStateConsumptionData | null,
  audience: ExposureAudience,
): VerificationExplanationDTO {
  if (!data) {
    return {
      ...FALLBACK_EXPLANATION,
      signal: "verification",
      verifiedCount: 0,
      totalCount: 0,
      overallStatus: "none",
    };
  }

  const { overallStatus, credentials, verifiedCount, totalCount } = data;
  const pct = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  const headline =
    overallStatus === "full"
      ? "Fully verified"
      : overallStatus === "partial"
        ? "Partially verified"
        : "Not yet verified";

  const shortDescription =
    audience === "teacher"
      ? overallStatus === "full"
        ? "All your credentials have been verified."
        : `${verifiedCount} of ${totalCount} credentials verified (${pct}%).`
      : audience === "school"
        ? overallStatus === "full"
          ? "This candidate's credentials are fully verified."
          : `${verifiedCount} of ${totalCount} credentials verified.`
        : overallStatus === "full"
          ? "Verified educator"
          : "Verification in progress";

  const evidencePoints: EvidencePoint[] = [];

  if (audience === "teacher" || audience === "admin") {
    // Show specific credential status
    const verified = credentials.filter((c) => c.verified);
    const unverified = credentials.filter((c) => !c.verified);

    for (const cred of verified.slice(0, 2)) {
      evidencePoints.push({
        label: cred.credentialType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        detail: cred.verifiedAt
          ? `Verified on ${new Date(cred.verifiedAt).toLocaleDateString()}`
          : "Verified",
        sentiment: "positive",
      });
    }
    for (const cred of unverified.slice(0, 2)) {
      evidencePoints.push({
        label: cred.credentialType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        detail: "Pending verification",
        sentiment: "negative",
      });
    }
  } else if (audience === "school") {
    evidencePoints.push({
      label: "Verification progress",
      detail: `${pct}% of credentials verified`,
      sentiment: pct >= 80 ? "positive" : pct >= 50 ? "neutral" : "negative",
    });
  }

  const suggestion =
    audience === "teacher" && overallStatus !== "full"
      ? "Submit your pending credentials for verification to strengthen your profile."
      : null;

  return {
    signal: "verification",
    verifiedCount,
    totalCount,
    overallStatus,
    headline,
    shortDescription,
    evidencePoints: clampEvidence(evidencePoints),
    suggestion,
  };
}
