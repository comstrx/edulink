/**
 * useUserContext — Unified post-auth user state reader.
 *
 * Infers the user's current "situation" from existing data sources:
 * - Auth roles (from AuthContext)
 * - Teacher profile existence + readiness (from intelligence)
 * - School membership + onboarding state (from shell snapshot)
 *
 * ⚠️ No new calculations. No new queries. Reads only from existing hooks.
 * ⚠️ This is a READER, not an engine.
 */

import { useAuth } from "@/contexts/AuthContext";
import { useShellSnapshot } from "@/hooks/useShellSnapshot";
import { useTeacherProfileId } from "@/hooks/useTeacherProfileId";
import { useCanonicalReadiness } from "@/intelligence/readiness/useCanonicalReadiness";
import type { CanonicalReadinessLevel } from "@/intelligence/readiness/canonical-readiness.types";

export type UserContextRole = "teacher" | "school" | "provider" | "admin" | "unknown";
export type PrimaryGoal = "get_job" | "hire" | "train_team" | "provide_training" | "manage_platform" | "unknown";
export type ReadinessLevel = "low" | "medium" | "high" | "unknown";

export interface UserContext {
  /** Resolved primary persona */
  role: UserContextRole;
  /** Whether onboarding is complete for this persona */
  isOnboarded: boolean;
  /** Whether the user has a domain profile (teacher_profile / school_org) */
  hasProfile: boolean;
  /** Inferred primary goal based on role + state */
  primaryGoal: PrimaryGoal;
  /** Mapped readiness level from canonical intelligence */
  readinessLevel: ReadinessLevel;
  /** Raw canonical readiness for traceability */
  rawReadiness: CanonicalReadinessLevel | null;
  /** Loading state — true until all sources are resolved */
  isLoading: boolean;
}

function mapReadiness(canonical: CanonicalReadinessLevel | null): ReadinessLevel {
  if (!canonical) return "unknown";
  if (canonical === "ready" || canonical === "highly_ready") return "high";
  if (canonical === "developing") return "medium";
  return "low"; // "early"
}

function inferGoal(role: UserContextRole, isOnboarded: boolean): PrimaryGoal {
  switch (role) {
    case "teacher": return "get_job";
    case "school": return isOnboarded ? "hire" : "hire";
    case "provider": return "provide_training";
    case "admin": return "manage_platform";
    default: return "unknown";
  }
}

export function useUserContext(): UserContext {
  const { loading: authLoading } = useAuth();
  const shell = useShellSnapshot();
  const { data: teacherProfileId, isLoading: profileIdLoading } = useTeacherProfileId();

  // Only fetch readiness for teachers (avoids unnecessary queries for school/admin)
  const isTeacherRole = shell.shellArea === "teacher";
  const { readinessLevel: canonicalReadiness, isLoading: readinessLoading } =
    useCanonicalReadiness(isTeacherRole ? (teacherProfileId ?? undefined) : undefined);

  const isLoading = authLoading || shell.loading || (isTeacherRole && profileIdLoading);

  // Resolve role
  const role: UserContextRole = shell.shellArea === "unknown" ? "unknown" : shell.shellArea;

  // Resolve onboarded state per persona
  let isOnboarded = false;
  let hasProfile = false;

  if (role === "teacher") {
    hasProfile = shell.hasTeacherProfile;
    // Teacher is onboarded if they have a profile (onboarding guard checks preferred_start + subjects)
    isOnboarded = hasProfile;
  } else if (role === "school") {
    hasProfile = shell.hasSchoolMembership;
    // School onboarding is tracked on the org itself
    isOnboarded = hasProfile; // membership exists = org exists; onboarding_completed checked by redirect
  } else if (role === "provider") {
    hasProfile = shell.hasProviderMembership;
    isOnboarded = hasProfile;
  } else if (role === "admin") {
    hasProfile = true;
    isOnboarded = true;
  }

  const readinessLevel = isTeacherRole ? mapReadiness(canonicalReadiness) : "unknown";
  const primaryGoal = inferGoal(role, isOnboarded);

  return {
    role,
    isOnboarded,
    hasProfile,
    primaryGoal,
    readinessLevel,
    rawReadiness: canonicalReadiness,
    isLoading: isLoading || (isTeacherRole && readinessLoading),
  };
}
