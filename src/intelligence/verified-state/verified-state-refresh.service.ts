/**
 * Verified State Refresh Service
 *
 * Orchestrates: Load → Run → Persist for verified state snapshots.
 *
 * Sprint 4 — Fix 3
 */

import { supabase } from "@/integrations/supabase/client";
import { runVerifiedStateEngine, type VerifiedStateInput } from "./verified-state-engine";
import { writeVerifiedStateSnapshot } from "./verified-state-writer";

export interface VerifiedStateRefreshRequest {
  teacherId: string;
  triggeredBy?: string;
}

export interface VerifiedStateRefreshOutcome {
  success: boolean;
  teacherId: string;
  overallStatus: string | null;
  snapshotWritten: boolean;
  completedAt: string;
  error?: string;
}

export async function refreshVerifiedState(
  request: VerifiedStateRefreshRequest,
): Promise<VerifiedStateRefreshOutcome> {
  const { teacherId, triggeredBy } = request;

  if (!teacherId) {
    console.warn(`[VerifiedStateService] Missing teacherId — aborting`);
    return {
      success: false,
      teacherId: "",
      overallStatus: null,
      snapshotWritten: false,
      completedAt: new Date().toISOString(),
      error: "Missing teacherId",
    };
  }

  console.log(`[VerifiedStateService] Starting refresh`, { teacherId, triggeredBy });

  try {
    // Step 1: Load credentials
    const { data: credentials, error: credErr } = await supabase
      .from("earned_credentials")
      .select("id, title, status, credential_kind, verification_code, issued_at, expiry_date")
      .eq("teacher_id", teacherId)
      .eq("status", "active");

    if (credErr) {
      throw new Error(`Failed to load credentials: ${credErr.message}`);
    }

    // Step 2: Load verifications (via teacher_profiles → user_id → account_verifications)
    const { data: teacherProfile } = await supabase
      .from("teacher_profiles")
      .select("user_id")
      .eq("id", teacherId)
      .maybeSingle();

    let verifications: Array<{
      id: string;
      verificationType: string;
      status: string;
      verifiedAt: string | null;
    }> = [];

    if (teacherProfile?.user_id) {
      const { data: verData } = await supabase
        .from("account_verifications")
        .select("id, verification_type, status, verified_at")
        .eq("account_id", teacherProfile.user_id);

      verifications = (verData ?? []).map((v) => ({
        id: v.id,
        verificationType: v.verification_type,
        status: v.status,
        verifiedAt: v.verified_at,
      }));
    }

    // Step 3: Build engine input
    const input: VerifiedStateInput = {
      teacherId,
      credentials: (credentials ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        credentialKind: c.credential_kind,
        verificationCode: c.verification_code,
        issuedAt: c.issued_at,
        expiryDate: c.expiry_date,
      })),
      verifications,
    };

    // Step 4: Run engine
    const result = runVerifiedStateEngine(input);

    console.log(`[VerifiedStateService] Engine completed`, {
      teacherId,
      overallStatus: result.overallStatus,
      verifiedCount: result.verifiedCount,
      totalCount: result.totalCount,
    });

    // Step 5: Write snapshot
    const writeOutcome = await writeVerifiedStateSnapshot(result);

    return {
      success: writeOutcome.success,
      teacherId,
      overallStatus: result.overallStatus,
      snapshotWritten: writeOutcome.success,
      completedAt: new Date().toISOString(),
      error: writeOutcome.error,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[VerifiedStateService] Unexpected error`, { teacherId, error: message });
    return {
      success: false,
      teacherId,
      overallStatus: null,
      snapshotWritten: false,
      completedAt: new Date().toISOString(),
      error: message,
    };
  }
}
