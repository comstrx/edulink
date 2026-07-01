import { supabase } from "@/integrations/supabase/client";

export interface ResolvedSchoolMembership {
  membershipId: string;
  schoolId: string;
  schoolName: string;
  schoolSlug: string | null;
  membershipRole: string;
  membershipStatus: string;
  onboardingCompleted: boolean;
  plan: string;
  legacySchoolProfileId: string | null;
}

const SCHOOL_ROLE_PRECEDENCE: Record<string, number> = {
  school_admin: 0,
  school_recruiter: 1,
  school_academic_lead: 2,
  school_training_manager: 3,
};

async function fetchSchoolOrganizationsByIds(schoolIds: string[]) {
  if (schoolIds.length === 0) {
    return new Map<string, {
      id: string;
      name: string;
      slug: string | null;
      plan: string | null;
      onboarding_completed: boolean | null;
      legacy_school_profile_id: string | null;
    }>();
  }

  const { data, error } = await supabase
    .from("school_organizations")
    .select("id, name, slug, plan, onboarding_completed, legacy_school_profile_id")
    .in("id", schoolIds);

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? []).map((org) => [org.id, org])
  );
}

export async function fetchActiveSchoolMemberships(userId: string): Promise<ResolvedSchoolMembership[]> {
  const { data, error } = await supabase
    .from("school_members")
    .select("id, role_key, status, school_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    throw error;
  }

  const memberships = data ?? [];
  const schoolIds = Array.from(new Set(memberships.map((row) => row.school_id)));
  const organizations = await fetchSchoolOrganizationsByIds(schoolIds);

  return memberships.map((row) => {
    const org = organizations.get(row.school_id);

    return {
      membershipId: row.id,
      schoolId: row.school_id,
      schoolName: org?.name ?? "My School",
      schoolSlug: org?.slug ?? null,
      membershipRole: row.role_key,
      membershipStatus: row.status,
      onboardingCompleted: org?.onboarding_completed ?? false,
      plan: org?.plan ?? "",
      legacySchoolProfileId: org?.legacy_school_profile_id ?? null,
    };
  });
}

export async function fetchPrimaryActiveSchoolMembership(userId: string): Promise<ResolvedSchoolMembership | null> {
  const memberships = await fetchActiveSchoolMemberships(userId);

  const sorted = [...memberships].sort(
    (a, b) =>
      (SCHOOL_ROLE_PRECEDENCE[a.membershipRole] ?? 99) -
      (SCHOOL_ROLE_PRECEDENCE[b.membershipRole] ?? 99)
  );

  return sorted[0] ?? null;
}
