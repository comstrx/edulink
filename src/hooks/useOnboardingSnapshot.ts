import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useShellSnapshot } from "@/hooks/useShellSnapshot";
import { useSchoolOnboardingStatus } from "@/hooks/useSchoolOnboardingStatus";
import { useMentorOnboardingStatus } from "@/hooks/useMentorOnboardingStatus";
import { useProviderOnboardingStatus } from "@/hooks/useProviderOnboardingStatus";
import {
  type OnboardingSnapshot,
  mapTeacherOnboarding,
  mapSchoolOnboarding,
  mapMentorOnboarding,
  mapProviderOnboarding,
  resolveNextOnboardingStep,
} from "@/lib/onboarding-states";

/**
 * Unified onboarding orchestration hook.
 *
 * Composes all persona-specific onboarding hooks into a single snapshot
 * that the shell, guards, and UI can consume to determine:
 * - current onboarding state per persona
 * - blocking routes
 * - recommended next steps
 *
 * Does NOT replace domain-specific hooks — it aggregates them.
 *
 * Teacher readiness is resolved HERE (not in shell snapshot) to keep
 * onboarding logic out of the identity layer.
 */
export function useOnboardingSnapshot(): OnboardingSnapshot & { isLoading: boolean } {
  const { user } = useAuth();
  const shell = useShellSnapshot();
  const schoolOnboarding = useSchoolOnboardingStatus();
  const mentorOnboarding = useMentorOnboardingStatus();
  const providerOnboarding = useProviderOnboardingStatus();

  // Teacher readiness: derived from required fields, not boolean flags
  const { data: teacherReadiness, isLoading: trLoading } = useQuery({
    queryKey: ["teacher_readiness", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("teacher_profiles")
        .select("preferred_start, subject_ids, country_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!data) return { hasProfile: false, isReady: false, needsStart: true, needsOnboarding: false };

      const hasPreferredStart = !!data.preferred_start;
      const hasSubjects = (data.subject_ids?.length ?? 0) > 0;
      const hasCountry = !!data.country_id;

      return {
        hasProfile: true,
        isReady: hasPreferredStart && hasSubjects && hasCountry,
        needsStart: !hasPreferredStart,
        needsOnboarding: hasPreferredStart && (!hasSubjects || !hasCountry),
      };
    },
    enabled: !!user && shell.shellArea === "teacher",
    staleTime: 5 * 60 * 1000,
  });

  const isLoading =
    shell.loading ||
    (shell.shellArea === "teacher" && trLoading) ||
    (shell.shellArea === "school" && schoolOnboarding.isLoading) ||
    (shell.shellArea === "provider" && providerOnboarding.isLoading);

  return useMemo(() => {
    const teacher = mapTeacherOnboarding({
      isTeacher: shell.isTeacher,
      hasProfile: teacherReadiness?.hasProfile ?? shell.hasTeacherProfile,
      isReady: teacherReadiness?.isReady ?? false,
      needsStart: teacherReadiness?.needsStart ?? true,
    });

    const school = mapSchoolOnboarding({
      isSchoolUser: shell.isSchoolUser,
      hasMembership: shell.hasSchoolMembership,
      schoolId: shell.currentSchoolId,
      orgComplete: schoolOnboarding.isCompleted,
    });

    const mentor = mapMentorOnboarding({
      mentorStatus: mentorOnboarding.mentorStatus,
      onboardingCompleted: mentorOnboarding.onboardingCompleted,
    });

    const provider = mapProviderOnboarding({
      providerStatus: providerOnboarding.providerStatus,
      hasMembership: providerOnboarding.providerId !== null,
      providerId: providerOnboarding.providerId,
      onboardingCompleted: providerOnboarding.onboardingCompleted,
    });

    const resolution = resolveNextOnboardingStep(
      shell.shellArea,
      teacher,
      school,
      mentor,
      provider,
    );

    return {
      accountId: user?.id ?? null,
      roles: shell.roles,
      currentShellArea: shell.shellArea,
      teacher,
      school,
      mentor,
      provider,
      ...resolution,
      isLoading,
    };
  }, [
    user?.id,
    shell.roles,
    shell.shellArea,
    shell.isTeacher,
    shell.hasTeacherProfile,
    teacherReadiness,
    shell.isSchoolUser,
    shell.hasSchoolMembership,
    shell.currentSchoolId,
    schoolOnboarding.isCompleted,
    mentorOnboarding.mentorStatus,
    mentorOnboarding.onboardingCompleted,
    providerOnboarding.providerStatus,
    providerOnboarding.providerId,
    providerOnboarding.onboardingCompleted,
    isLoading,
  ]);
}
