import { supabase } from "@/integrations/supabase/client";
import { resolveDefaultRedirect, type AppRole } from "@/hooks/useShellSnapshot";
import { fetchPrimaryActiveSchoolMembership } from "@/lib/schoolMembershipQueries";

/**
 * Org-first school redirect resolution.
 *
 * Determines the correct landing page for a school user based on:
 * - Organization membership
 * - Organization onboarding state
 * - Membership role
 *
 * Does NOT read from legacy school_profiles for routing decisions.
 */
export async function getSchoolAdminRedirect(userId: string): Promise<string> {
  const membership = await fetchPrimaryActiveSchoolMembership(userId);

  if (!membership) {
    // No org membership — unresolved account, avoid redirecting into a guarded school route
    return "/account/resolve";
  }

  if (!membership.onboardingCompleted) {
    return "/app/school/start";
  }

  // All school roles land on the central dashboard
  return "/app/school/dashboard";
}

export async function getTeacherRedirect(userId: string): Promise<string> {
  const { data } = await supabase
    .from("teacher_profiles")
    .select("preferred_start")
    .eq("user_id", userId)
    .maybeSingle();

  const pref = data?.preferred_start;
  if (pref === "jobs") return "/jobs";
  if (pref === "training") return "/app/teacher/training";
  return "/app/teacher/start";
}

/**
 * Deterministic redirect path from roles.
 * Uses the centralized resolveDefaultRedirect from shell snapshot.
 */
export function getRedirectPath(userRoles: string[], _fallback?: string): string {
  return resolveDefaultRedirect(userRoles as AppRole[]);
}
