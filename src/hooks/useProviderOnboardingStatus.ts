import { useMemo } from "react";
import { useProviderMembership } from "@/hooks/useProviderProfile";
import { getProviderCompleteness, type ProviderCompleteness } from "@/lib/provider-completeness";

export type ProviderLifecycleStatus =
  | "no_membership"
  | "draft"
  | "pending_review"
  | "active"
  | "rejected"
  | "suspended"
  | "inactive";

export type ProviderMemberRole = "owner" | "admin" | "editor" | "finance" | "mentor_manager";

export interface ProviderOnboardingState {
  providerId: string | null;
  providerStatus: ProviderLifecycleStatus;
  memberRole: ProviderMemberRole | null;
  onboardingStarted: boolean;
  onboardingCompleted: boolean;
  readiness: ProviderCompleteness;
  canAccessProviderWorkspace: boolean;
  isLoading: boolean;
}

export function useProviderOnboardingStatus(): ProviderOnboardingState {
  const { data: membership, isLoading } = useProviderMembership();

  return useMemo(() => {
    if (isLoading) {
      return {
        providerId: null,
        providerStatus: "no_membership" as const,
        memberRole: null,
        onboardingStarted: false,
        onboardingCompleted: false,
        readiness: { isComplete: false, completionPercent: 0, missingFields: [] },
        canAccessProviderWorkspace: false,
        isLoading: true,
      };
    }

    if (!membership) {
      return {
        providerId: null,
        providerStatus: "no_membership" as const,
        memberRole: null,
        onboardingStarted: false,
        onboardingCompleted: false,
        readiness: { isComplete: false, completionPercent: 0, missingFields: [] },
        canAccessProviderWorkspace: false,
        isLoading: false,
      };
    }

    const provider = membership.provider;
    const readiness = getProviderCompleteness({
      display_name: provider.display_name,
      legal_name: provider.legal_name,
      bio: provider.bio,
      contact_email: provider.contact_email,
      logo_url: provider.logo_url,
      status: provider.status,
    });

    const status = (provider.status as ProviderLifecycleStatus) ?? "no_membership";
    const providerAny = membership.provider as any;
    // onboardingCompleted is derived from data-driven readiness, NOT flags
    const isDataComplete = readiness.isComplete;

    return {
      providerId: provider.id,
      providerStatus: status,
      memberRole: membership.role as ProviderMemberRole,
      onboardingStarted: !!providerAny.onboarding_started_at,
      onboardingCompleted: isDataComplete,
      readiness,
      canAccessProviderWorkspace: status === "active" && isDataComplete,
      isLoading: false,
    };
  }, [membership, isLoading]);
}
