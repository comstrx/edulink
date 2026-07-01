import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import {
  isSchoolProfileCompleted,
  getMissingSchoolProfileFields,
} from "@/lib/school-onboarding";

/**
 * Central source of truth for School onboarding state.
 * Reads from school_organizations via membership (org-first),
 * falls back to legacy school_profiles.user_id for compatibility.
 */
export function useSchoolOnboardingStatus() {
  const { user, roles } = useAuth();
  const { workspace, isLoading: wsLoading } = useCurrentSchoolWorkspace();

  const isSchoolRole = roles.some((r) =>
    ["school_admin", "school_recruiter", "school_academic_lead", "school_training_manager"].includes(r)
  );

  // Org-based: read from school_organizations directly
  const { data: orgProfile, isLoading: orgLoading } = useQuery({
    queryKey: ["school_onboarding_org", workspace?.schoolId],
    queryFn: async () => {
      if (!workspace) return null;
      const { data } = await supabase
        .from("school_organizations")
        .select("id, name, country_term_id, school_type_term_id, curriculum_term_ids, onboarding_completed, plan")
        .eq("id", workspace.schoolId)
        .maybeSingle();
      return data;
    },
    enabled: !!workspace,
    staleTime: 2 * 60 * 1000,
  });

  // Legacy fallback: read from school_profiles.user_id (for accounts not yet migrated)
  const { data: legacyProfile, isLoading: legacyLoading } = useQuery({
    queryKey: ["school_onboarding_legacy", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("school_profiles")
        .select("id, user_id, plan, preferred_start, onboarding_completed, name, country_term_id, school_type_term_id, curriculum_term_ids")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && isSchoolRole && !workspace,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = wsLoading || (workspace ? orgLoading : legacyLoading);

  // Use org data if available, else legacy
  const profileData = orgProfile ?? legacyProfile;

  const isCompleted = isSchoolProfileCompleted(profileData);
  const missingFields = getMissingSchoolProfileFields(profileData);
  const canActivateHiring = isCompleted;

  return {
    profile: profileData ?? null,
    isCompleted,
    missingFields,
    canActivateHiring,
    isLoading,
    isSchoolRole,
    // Expose the active workspace for callers that need it
    workspace,
  };
}
