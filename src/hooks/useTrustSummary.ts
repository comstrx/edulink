/**
 * useTrustSummary — Single canonical trust-summary read hook.
 *
 * Derives trust from two sources:
 * 1. `account_verifications` table (normalized cross-cutting layer)
 * 2. Domain-specific signals (provider status, mentor status)
 *
 * Does NOT invent approval states — only reflects real data.
 *
 * State contract:
 * - `resolvedState = 'loading'`     → data still fetching, UI should show skeleton
 * - `resolvedState = 'unavailable'` → no authenticated user, all flags false
 * - `resolvedState = 'resolved'`    → trust data is ready and deterministic
 *
 * Sprint 8 — Visibility + Trust Normalization
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useProviderOnboardingStatus } from "@/hooks/useProviderOnboardingStatus";
import { useMentorOnboardingStatus } from "@/hooks/useMentorOnboardingStatus";
import { useSchoolOnboardingStatus } from "@/hooks/useSchoolOnboardingStatus";
import { useShellSnapshot } from "@/hooks/useShellSnapshot";

export type TrustResolvedState = "loading" | "unavailable" | "resolved";

export interface TrustSummary {
  /** Explicit state machine — consumers MUST check this before reading flags */
  resolvedState: TrustResolvedState;
  /** Email verified via auth provider or account_verifications */
  isEmailVerified: boolean;
  /** Phone verified via account_verifications */
  isPhoneVerified: boolean;
  /** Teacher identity verified via account_verifications */
  isTeacherVerified: boolean;
  /** Mentor approved (status = active in mentors table) */
  isMentorVerified: boolean;
  /** Provider verified (status = active) */
  isProviderVerified: boolean;
  /** School reviewed via account_verifications */
  isSchoolVerified: boolean;
  /** Badge keys for display (e.g. ["email", "provider_verified"]) */
  verificationBadges: string[];
  /** Convenience count of earned badges */
  verifiedCount: number;
  /** @deprecated Use resolvedState === 'loading' instead */
  isLoading: boolean;
}

/** Deterministic empty summary — returned when no user or data unavailable */
const EMPTY_SUMMARY: Omit<TrustSummary, "resolvedState" | "isLoading"> = {
  isEmailVerified: false,
  isPhoneVerified: false,
  isTeacherVerified: false,
  isMentorVerified: false,
  isProviderVerified: false,
  isSchoolVerified: false,
  verificationBadges: [],
  verifiedCount: 0,
};

interface VerificationRecord {
  verification_type: string;
  status: string;
}

export function useTrustSummary(): TrustSummary {
  const { user } = useAuth();
  const shell = useShellSnapshot();
  const providerOnboarding = useProviderOnboardingStatus();
  const mentorOnboarding = useMentorOnboardingStatus();
  const schoolOnboarding = useSchoolOnboardingStatus();

  // Fetch normalized account_verifications — keyed by user.id so cache
  // is invalidated automatically on identity switch
  const { data: verifications, isLoading: vLoading } = useQuery({
    queryKey: ["account_verifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_verifications")
        .select("verification_type, status")
        .eq("account_id", user!.id);
      if (error) throw error;
      return (data ?? []) as VerificationRecord[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  return useMemo(() => {
    // Gate: no user → unavailable (deterministic empty)
    if (!user) {
      return { ...EMPTY_SUMMARY, resolvedState: "unavailable" as const, isLoading: false };
    }

    // Gate: still loading upstream data
    const anyLoading =
      vLoading ||
      shell.loading ||
      mentorOnboarding.isLoading ||
      providerOnboarding.isLoading ||
      schoolOnboarding.isLoading;

    if (anyLoading) {
      return { ...EMPTY_SUMMARY, resolvedState: "loading" as const, isLoading: true };
    }

    // --- Resolved: compute from real data ---

    const approved = (verifications ?? []).filter((v) => v.status === "approved");
    const approvedTypes = new Set(approved.map((v) => v.verification_type));

    // Email: check auth metadata first, then account_verifications
    const isEmailVerified =
      !!user.email_confirmed_at || approvedTypes.has("email");

    // Phone: account_verifications only
    const isPhoneVerified = approvedTypes.has("phone");

    // Teacher identity: account_verifications
    const isTeacherVerified = approvedTypes.has("teacher_identity");

    // Mentor: domain truth — mentor status === "active" means admin-approved
    const isMentorVerified =
      mentorOnboarding.mentorStatus === "active" || approvedTypes.has("mentor_review");

    // Provider: domain truth — active status
    const providerMembership = providerOnboarding.providerId !== null;
    const isProviderVerified =
      (providerMembership && providerOnboarding.providerStatus === "active") ||
      approvedTypes.has("provider_review");

    // School: account_verifications (no domain-level verification exists on schools)
    const isSchoolVerified = approvedTypes.has("school_review");

    // Build badge list from real signals only
    const badges: string[] = [];
    if (isEmailVerified) badges.push("email");
    if (isPhoneVerified) badges.push("phone");
    if (isTeacherVerified) badges.push("teacher_identity");
    if (isMentorVerified) badges.push("mentor_verified");
    if (isProviderVerified) badges.push("provider_verified");
    if (isSchoolVerified) badges.push("school_verified");

    return {
      resolvedState: "resolved" as const,
      isEmailVerified,
      isPhoneVerified,
      isTeacherVerified,
      isMentorVerified,
      isProviderVerified,
      isSchoolVerified,
      verificationBadges: badges,
      verifiedCount: badges.length,
      isLoading: false,
    };
  }, [
    user,
    verifications,
    vLoading,
    shell.loading,
    mentorOnboarding.mentorStatus,
    mentorOnboarding.isLoading,
    providerOnboarding.providerId,
    providerOnboarding.providerStatus,
    providerOnboarding.isLoading,
    schoolOnboarding.isLoading,
  ]);
}
