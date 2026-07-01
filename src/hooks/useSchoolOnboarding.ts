import { useAuth } from "@/contexts/AuthContext";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";

/**
 * Returns the school onboarding completion status.
 * Uses org-based resolution (membership-first), falls back to legacy.
 */
export function useSchoolOnboarding() {
  const { roles } = useAuth();
  const { workspace, isLoading } = useCurrentSchoolWorkspace();

  const isSchoolRole = roles.some((r) =>
    ["school_admin", "school_recruiter", "school_academic_lead", "school_training_manager"].includes(r)
  );

  return {
    isSchoolRole,
    onboardingCompleted: workspace?.onboardingCompleted ?? false,
    isLoading,
  };
}
