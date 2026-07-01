import { supabase } from "@/integrations/supabase/client";
import type { EarnedCredential } from "./earned-credentials-service";

// ── Types ──

export type VerificationStatus = "valid" | "expired" | "revoked" | "not_found" | "invalid_code" | "error";

export interface PublicCredentialVerification {
  title: string;
  credentialKind: "badge" | "certificate";
  issuerName: string;
  issuedAt: string;
  expiryDate: string | null;
  verificationCode: string;
  holderName: string;
  sourceLabel: string;
}

export interface VerificationResult {
  status: VerificationStatus;
  credential?: PublicCredentialVerification;
  message?: string;
}

// ── Public Verification (via Edge Function) ──

export async function getPublicCredentialVerification(
  verificationCode: string,
): Promise<VerificationResult> {
  if (!verificationCode || verificationCode.trim().length === 0) {
    return { status: "invalid_code", message: "No verification code provided." };
  }

  // Sanitize
  const code = verificationCode.trim();
  if (!/^[A-Za-z0-9\-]+$/.test(code)) {
    return { status: "invalid_code", message: "Invalid verification code format." };
  }

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-credential?code=${encodeURIComponent(code)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    const result = await response.json();
    return result as VerificationResult;
  } catch {
    return { status: "error", message: "Unable to reach verification service." };
  }
}

// ── Local Verification (authenticated users) ──

export function computeVerificationStatus(credential: EarnedCredential): VerificationStatus {
  if (credential.status === "revoked") return "revoked";
  if (credential.status === "expired") return "expired";
  if (credential.expiry_date && new Date(credential.expiry_date) < new Date()) return "expired";
  return "valid";
}
