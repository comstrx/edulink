import { useMemo } from "react";
import { useSchoolMemberships, type SchoolMembership } from "@/hooks/useSchoolMemberships";

export interface SchoolWorkspace {
  schoolId: string;
  schoolName: string;
  schoolSlug: string | null;
  role: string;
  onboardingCompleted: boolean;
  plan: string;
  legacySchoolProfileId: string | null;
}

/**
 * Resolves the currently active school workspace for the authenticated user.
 * 
 * Resolution order:
 * 1. If user has exactly one membership → use it
 * 2. If user has multiple → use the one with highest-precedence role (school_admin first)
 * 3. If none → null
 * 
 * Future: support explicit school selection / URL param override.
 */
export function useCurrentSchoolWorkspace() {
  const { memberships, isLoading, isSchoolRole, hasMembership } = useSchoolMemberships();

  const workspace = useMemo((): SchoolWorkspace | null => {
    if (!memberships.length) return null;

    // Sort by role precedence: school_admin > school_recruiter > school_academic_lead > school_training_manager
    const ROLE_PRECEDENCE: Record<string, number> = {
      school_admin: 0,
      school_recruiter: 1,
      school_academic_lead: 2,
      school_training_manager: 3,
    };

    // Group by school — a user might have multiple roles in same school
    const schoolMap = new Map<string, SchoolMembership>();
    for (const m of memberships) {
      const existing = schoolMap.get(m.schoolId);
      if (!existing || (ROLE_PRECEDENCE[m.membershipRole] ?? 99) < (ROLE_PRECEDENCE[existing.membershipRole] ?? 99)) {
        schoolMap.set(m.schoolId, m);
      }
    }

    // Pick the school where user has highest-precedence role
    const sorted = Array.from(schoolMap.values()).sort(
      (a, b) => (ROLE_PRECEDENCE[a.membershipRole] ?? 99) - (ROLE_PRECEDENCE[b.membershipRole] ?? 99)
    );

    const best = sorted[0];
    if (!best) return null;

    return {
      schoolId: best.schoolId,
      schoolName: best.schoolName,
      schoolSlug: best.schoolSlug,
      role: best.membershipRole,
      onboardingCompleted: best.onboardingCompleted,
      plan: best.plan,
      legacySchoolProfileId: best.legacySchoolProfileId,
    };
  }, [memberships]);

  return {
    workspace,
    isLoading,
    isSchoolRole,
    hasMembership,
    allMemberships: memberships,
  };
}
