/**
 * Verified State Engine
 *
 * Pure computation: takes teacher credentials and verifications,
 * produces a VerifiedStateResult.
 *
 * Sprint 4 — Fix 3
 */

export interface VerifiedStateInput {
  teacherId: string;
  credentials: Array<{
    id: string;
    title: string;
    status: string;
    credentialKind: string;
    verificationCode: string;
    issuedAt: string;
    expiryDate: string | null;
  }>;
  verifications: Array<{
    id: string;
    verificationType: string;
    status: string;
    verifiedAt: string | null;
  }>;
}

export interface VerifiedStateResult {
  teacherId: string;
  overallStatus: "none" | "partial" | "full";
  verifiedCount: number;
  totalCount: number;
  credentials: Array<{
    id: string;
    title: string;
    kind: string;
    status: string;
    verified: boolean;
  }>;
  engineVersion: string;
  computedAt: string;
}

const ENGINE_VERSION = "verified-v1";

export function runVerifiedStateEngine(input: VerifiedStateInput): VerifiedStateResult {
  const now = new Date().toISOString();

  const approvedVerificationTypes = new Set(
    input.verifications
      .filter((v) => v.status === "approved")
      .map((v) => v.verificationType),
  );

  const activeCredentials = input.credentials.filter((c) => c.status === "active");
  const totalCount = activeCredentials.length;

  // A credential is "verified" if:
  // 1. There's an approved credential_verification, OR
  // 2. There's an approved teacher_identity verification (baseline trust)
  const hasCredentialVerification = approvedVerificationTypes.has("credential_verification");
  const hasIdentityVerification = approvedVerificationTypes.has("teacher_identity");

  const credentialResults = activeCredentials.map((c) => ({
    id: c.id,
    title: c.title,
    kind: c.credentialKind,
    status: c.status,
    verified: hasCredentialVerification || hasIdentityVerification,
  }));

  const verifiedCount = credentialResults.filter((c) => c.verified).length;

  let overallStatus: "none" | "partial" | "full";
  if (totalCount === 0) {
    overallStatus = "none";
  } else if (verifiedCount === totalCount) {
    overallStatus = "full";
  } else if (verifiedCount > 0) {
    overallStatus = "partial";
  } else {
    overallStatus = "none";
  }

  return {
    teacherId: input.teacherId,
    overallStatus,
    verifiedCount,
    totalCount,
    credentials: credentialResults,
    engineVersion: ENGINE_VERSION,
    computedAt: now,
  };
}
