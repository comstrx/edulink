/**
 * useEffectiveVisibility — Single canonical visibility resolution hook.
 *
 * Combines:
 * 1. Account-level visibility settings (account_visibility_settings)
 * 2. Domain-level publication flags (is_public_profile, mentor status, provider status)
 * 3. Readiness / onboarding state
 *
 * State contract:
 * - `resolvedState = 'loading'`     → data still fetching, UI should show skeleton
 * - `resolvedState = 'unavailable'` → no authenticated user, all flags false
 * - `resolvedState = 'resolved'`    → visibility is deterministic and safe to read
 *
 * Distinguishing states:
 * - `canShow*` = false + resolvedState = 'resolved' → explicitly hidden by rule
 * - `canShow*` = false + resolvedState = 'loading'  → not yet known, do NOT assume hidden
 * - `canShow*` = false + resolvedState = 'unavailable' → no user context
 *
 * Sprint 8 — Visibility + Trust Normalization
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useShellSnapshot } from "@/hooks/useShellSnapshot";
import { useMentorOnboardingStatus } from "@/hooks/useMentorOnboardingStatus";
import { useProviderOnboardingStatus } from "@/hooks/useProviderOnboardingStatus";
import { DEFAULT_VISIBILITY_SETTINGS, type VisibilityLevel } from "@/lib/visibility-rules";

export type { VisibilityLevel };
export type VisibilityResolvedState = "loading" | "unavailable" | "resolved";

export interface VisibilitySettings {
  profile_visibility: VisibilityLevel;
  photo_visibility: VisibilityLevel;
  contact_visibility: VisibilityLevel;
  credentials_visibility: VisibilityLevel;
  activity_visibility: VisibilityLevel;
}

export interface EffectiveVisibility {
  /** Explicit state machine — consumers MUST check before reading flags */
  resolvedState: VisibilityResolvedState;
  /** Teacher profile can appear in public directories / search */
  canShowTeacherPublicProfile: boolean;
  /** Teacher contact info can be revealed */
  canShowTeacherContact: boolean;
  /** Mentor appears in public mentor directory */
  canShowMentorPublicProfile: boolean;
  /** Provider appears in public provider directory */
  canShowProviderPublicProfile: boolean;
  /** School appears in public listings (currently always false — no school directory) */
  canShowSchoolPublicProfile: boolean;
  /** Raw account visibility settings for fine-grained use */
  settings: VisibilitySettings | null;
  /** @deprecated Use resolvedState === 'loading' instead */
  isLoading: boolean;
}

const DEFAULT_SETTINGS: VisibilitySettings = { ...DEFAULT_VISIBILITY_SETTINGS };
const EMPTY_VISIBILITY: Omit<EffectiveVisibility, "resolvedState" | "isLoading"> = {
  canShowTeacherPublicProfile: false,
  canShowTeacherContact: false,
  canShowMentorPublicProfile: false,
  canShowProviderPublicProfile: false,
  canShowSchoolPublicProfile: false,
  settings: null,
};

export function useEffectiveVisibility(): EffectiveVisibility {
  const { user } = useAuth();
  const shell = useShellSnapshot();
  const mentorOnboarding = useMentorOnboardingStatus();
  const providerOnboarding = useProviderOnboardingStatus();

  // Account-level visibility settings — keyed by user.id for cache isolation
  const { data: visSettings, isLoading: vsLoading } = useQuery({
    queryKey: ["account_visibility_settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_visibility_settings")
        .select("profile_visibility, photo_visibility, contact_visibility, credentials_visibility, activity_visibility")
        .eq("account_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as VisibilitySettings | null) ?? DEFAULT_SETTINGS;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Teacher domain flag: is_public_profile
  const { data: teacherFlags, isLoading: tfLoading } = useQuery({
    queryKey: ["teacher_visibility_flags", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("teacher_profiles")
        .select("is_public_profile, is_contact_visible")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && shell.isTeacher,
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    // Gate: no user → unavailable (deterministic empty)
    if (!user) {
      return { ...EMPTY_VISIBILITY, resolvedState: "unavailable" as const, isLoading: false };
    }

    // Gate: still loading upstream data
    const anyLoading =
      vsLoading ||
      (shell.isTeacher && tfLoading) ||
      shell.loading ||
      mentorOnboarding.isLoading ||
      providerOnboarding.isLoading;

    if (anyLoading) {
      return { ...EMPTY_VISIBILITY, resolvedState: "loading" as const, isLoading: true };
    }

    // --- Resolved: compute deterministic visibility ---

    const settings = visSettings ?? DEFAULT_SETTINGS;

    // Teacher public profile: requires BOTH domain flag AND account-level "public"
    const canShowTeacherPublicProfile =
      shell.isTeacher &&
      !!teacherFlags?.is_public_profile &&
      settings.profile_visibility === "public";

    // Teacher contact: domain flag + account setting is not "private"
    const canShowTeacherContact =
      shell.isTeacher &&
      !!teacherFlags?.is_contact_visible &&
      settings.contact_visibility !== "private";

    // Mentor public: domain truth — only active mentors with completed onboarding
    const canShowMentorPublicProfile =
      mentorOnboarding.mentorStatus === "active" &&
      !!mentorOnboarding.onboardingCompleted;

    // Provider public: domain truth — only active providers are discoverable
    const canShowProviderPublicProfile =
      providerOnboarding.providerStatus === "active";

    // School public: no public school directory exists yet
    const canShowSchoolPublicProfile = false;

    return {
      resolvedState: "resolved" as const,
      canShowTeacherPublicProfile,
      canShowTeacherContact,
      canShowMentorPublicProfile,
      canShowProviderPublicProfile,
      canShowSchoolPublicProfile,
      settings,
      isLoading: false,
    };
  }, [
    user,
    visSettings,
    vsLoading,
    teacherFlags,
    tfLoading,
    shell.isTeacher,
    shell.loading,
    mentorOnboarding.mentorStatus,
    mentorOnboarding.onboardingCompleted,
    mentorOnboarding.isLoading,
    providerOnboarding.providerStatus,
    providerOnboarding.isLoading,
  ]);
}
