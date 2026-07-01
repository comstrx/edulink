import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchActiveSchoolMemberships, type ResolvedSchoolMembership } from "@/lib/schoolMembershipQueries";

export interface SchoolMembership extends ResolvedSchoolMembership {}

/**
 * Returns all school memberships for the current authenticated user.
 */
export function useSchoolMemberships() {
  const { user, roles } = useAuth();

  const isSchoolRole = roles.some((r) =>
    ["school_admin", "school_recruiter", "school_academic_lead", "school_training_manager"].includes(r)
  );

  const { data: memberships, isLoading } = useQuery({
    queryKey: ["school_memberships", user?.id],
    queryFn: async () => {
      if (!user) return [];
      return fetchActiveSchoolMemberships(user.id);
    },
    enabled: !!user && isSchoolRole,
    staleTime: 5 * 60 * 1000,
  });

  return {
    memberships: memberships ?? [],
    isLoading,
    isSchoolRole,
    hasMembership: (memberships ?? []).length > 0,
  };
}
