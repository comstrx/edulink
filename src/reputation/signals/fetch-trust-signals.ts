/**
 * Trust Signal Fetcher — Reputation Graph Layer
 *
 * Reads account_verifications to derive trust signals.
 */

import { supabase } from "@/integrations/supabase/client";
import type { TrustSignals } from "../types/reputation-graph.types";

export async function fetchTrustSignals(
  teacherProfileId: string
): Promise<TrustSignals> {
  // Resolve user_id from teacher profile
  const { data: tp } = await supabase
    .from("teacher_profiles")
    .select("user_id")
    .eq("id", teacherProfileId)
    .maybeSingle();

  if (!tp?.user_id) {
    return { verifiedIdentity: false, verifiedCredentials: false, verificationCount: 0, trustLevel: "none" };
  }

  const { data } = await supabase
    .from("account_verifications")
    .select("verification_type")
    .eq("account_id", tp.user_id)
    .eq("status", "approved");

  const verifications = data ?? [];
  const types = new Set(verifications.map((v) => v.verification_type));
  const count = verifications.length;

  let trustLevel: TrustSignals["trustLevel"] = "none";
  if (count >= 4) trustLevel = "full";
  else if (count >= 2) trustLevel = "enhanced";
  else if (count >= 1) trustLevel = "basic";

  return {
    verifiedIdentity: types.has("teacher_identity"),
    verifiedCredentials: types.has("credential_verification"),
    verificationCount: count,
    trustLevel,
  };
}
