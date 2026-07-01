import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, type AccountCore } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { fetchPrimaryActiveSchoolMembership } from "@/lib/schoolMembershipQueries";

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * SHELL CONTRACT — useShellSnapshot
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This hook is the SOLE source of truth for IDENTITY and CONTEXT state:
 *
 *   ✅ Authenticated user presence & account core
 *   ✅ Resolved roles / primary persona
 *   ✅ Shell area (teacher | school | provider | admin | unknown)
 *   ✅ Organization membership context (school & provider)
 *   ✅ Domain profile signals (teacher profile, mentor status)
 *   ✅ Sidebar identity type & default redirect
 *
 * This hook does NOT own and MUST NEVER contain:
 *
 *   ❌ Entitlement / module arrays (use useEffectiveEntitlements)
 *   ❌ Capability booleans like canUseHiring (use useEffectiveEntitlements)
 *   ❌ Navigation item lists
 *   ❌ Onboarding step resolution (use useOnboardingSnapshot)
 *
 * Dependency direction:
 *   useShellSnapshot ← useEffectiveEntitlements (reads snapshot)
 *   useShellSnapshot ← useOrganizationEntitlements (reads snapshot for org context)
 *   useShellSnapshot does NOT import any entitlement hook (prevents circular deps)
 *
 * Consumers that need both identity + entitlements should compose:
 *   const shell = useShellSnapshot();
 *   const entitlements = useEffectiveEntitlements();
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type AppRole = "teacher" | "school_admin" | "school_recruiter" | "school_academic_lead" | "school_training_manager" | "admin" | "provider";
export type ShellArea = "teacher" | "school" | "provider" | "admin" | "unknown";
export type SidebarType = "teacher" | "school" | "provider" | "admin";

export interface ShellSnapshot {
  /** Auth & account identity */
  user: User | null;
  account: AccountCore | null;
  roles: AppRole[];
  loading: boolean;

  /** Primary resolved persona (highest-precedence role) */
  primaryRole: AppRole | null;

  /** Role convenience booleans */
  isTeacher: boolean;
  isSchoolUser: boolean;
  isSchoolAdmin: boolean;
  isSchoolRecruiter: boolean;
  isSchoolAcademicLead: boolean;
  isSchoolTrainingManager: boolean;
  isProvider: boolean;
  isAdmin: boolean;

  /** Domain profile signals */
  hasTeacherProfile: boolean;
  hasActiveMentorProfile: boolean;
  canAccessMentorWorkspace: boolean;

  /** School organization membership context */
  currentSchoolId: string | null;
  currentSchoolName: string | null;
  currentSchoolRole: string | null;
  hasSchoolMembership: boolean;

  /** Provider organization membership context */
  currentProviderId: string | null;
  currentProviderName: string | null;
  currentProviderRole: string | null;
  hasProviderMembership: boolean;

  /** Shell orchestration — derived from identity, not entitlements */
  shellArea: ShellArea;
  defaultRedirect: string;
  sidebarType: SidebarType | null;
}

// ── Resolution helpers ──────────────────────────────────────────────────

/** Precedence: admin > provider > school_* > teacher */
function resolvePrimaryRole(roles: AppRole[]): AppRole | null {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("provider")) return "provider";
  if (roles.includes("school_admin")) return "school_admin";
  if (roles.includes("school_recruiter")) return "school_recruiter";
  if (roles.includes("school_academic_lead")) return "school_academic_lead";
  if (roles.includes("school_training_manager")) return "school_training_manager";
  if (roles.includes("teacher")) return "teacher";
  return null;
}

function resolveShellArea(primaryRole: AppRole | null): ShellArea {
  if (!primaryRole) return "unknown";
  if (primaryRole === "admin") return "admin";
  if (primaryRole === "provider") return "provider";
  if (primaryRole === "teacher") return "teacher";
  return "school"; // all school_* roles
}

function resolveSidebarType(shellArea: ShellArea): SidebarType | null {
  if (shellArea === "unknown") return null;
  return shellArea;
}

export function resolveDefaultRedirect(roles: AppRole[]): string {
  if (roles.includes("admin")) return "/admin/taxonomy";
  if (roles.includes("provider")) return "/app/provider/start";
  if (roles.includes("school_admin")) return "/app/school/dashboard";
  if (roles.includes("school_recruiter")) return "/app/school/dashboard";
  if (roles.includes("school_academic_lead")) return "/app/school/dashboard";
  if (roles.includes("school_training_manager")) return "/app/school/dashboard";
  if (roles.includes("teacher")) return "/app/teacher/dashboard";
  return "/account/resolve";
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useShellSnapshot(): ShellSnapshot {
  const { user, roles, account, loading: authLoading } = useAuth();

  const isSchoolUser = roles.some((r) => r.startsWith("school_"));
  const isTeacher = roles.includes("teacher");
  const isProvider = roles.includes("provider");
  const primaryRole = resolvePrimaryRole(roles);
  const shellArea = resolveShellArea(primaryRole);

  // Teacher profile existence
  const { data: teacherProfile, isLoading: tpLoading } = useQuery({
    queryKey: ["shell_teacher_profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .eq("profile_source", "auth")
        .maybeSingle();
      return data;
    },
    enabled: !!user && shellArea === "teacher",
    staleTime: 5 * 60 * 1000,
  });

  // Active mentor status (informational for the teacher shell; should not block first render)
  const { data: mentorRecord } = useQuery({
    queryKey: ["shell_mentor_status", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mentors")
        .select("id, status")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && shellArea === "teacher",
    staleTime: 5 * 60 * 1000,
  });

  // School membership (primary workspace)
  const { data: schoolMembership, isLoading: smLoading } = useQuery({
    queryKey: ["shell_school_membership", user?.id],
    queryFn: async () => {
      const membership = await fetchPrimaryActiveSchoolMembership(user!.id);
      if (!membership) return null;
      return {
        schoolId: membership.schoolId,
        schoolName: membership.schoolName,
        role: membership.membershipRole,
      };
    },
    enabled: !!user && shellArea === "school",
    staleTime: 5 * 60 * 1000,
  });

  // Provider membership (primary workspace)
  const { data: providerMembership, isLoading: pmLoading } = useQuery({
    queryKey: ["shell_provider_membership", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_members")
        .select(`
          id, role, status,
          provider:provider_id ( id, display_name, slug )
        `)
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      return {
        providerId: data.provider.id as string,
        providerName: data.provider.display_name as string,
        role: data.role as string,
      };
    },
    enabled: !!user && shellArea === "provider",
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const sidebarType = resolveSidebarType(shellArea);
    const defaultRedirect = resolveDefaultRedirect(roles);
    const hasActiveMentorProfile = mentorRecord?.status === "active";

    return {
      user,
      account,
      roles,
      loading:
        authLoading ||
        (shellArea === "teacher" && tpLoading) ||
        (shellArea === "school" && smLoading) ||
        (shellArea === "provider" && pmLoading),

      primaryRole,
      isTeacher,
      isSchoolUser,
      isSchoolAdmin: roles.includes("school_admin"),
      isSchoolRecruiter: roles.includes("school_recruiter"),
      isSchoolAcademicLead: roles.includes("school_academic_lead"),
      isSchoolTrainingManager: roles.includes("school_training_manager"),
      isProvider,
      isAdmin: roles.includes("admin"),

      hasTeacherProfile: !!teacherProfile,
      hasActiveMentorProfile,
      canAccessMentorWorkspace: isTeacher && hasActiveMentorProfile,

      currentSchoolId: schoolMembership?.schoolId ?? null,
      currentSchoolName: schoolMembership?.schoolName ?? null,
      currentSchoolRole: schoolMembership?.role ?? null,
      hasSchoolMembership: !!schoolMembership,

      currentProviderId: providerMembership?.providerId ?? null,
      currentProviderName: providerMembership?.providerName ?? null,
      currentProviderRole: providerMembership?.role ?? null,
      hasProviderMembership: !!providerMembership,

      shellArea,
      defaultRedirect,
      sidebarType,
    };
  }, [user, account, roles, authLoading, primaryRole, shellArea, teacherProfile, tpLoading, mentorRecord, schoolMembership, smLoading, providerMembership, pmLoading, isTeacher, isSchoolUser, isProvider]);
}
