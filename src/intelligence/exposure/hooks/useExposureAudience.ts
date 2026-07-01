/**
 * useExposureAudience — Resolves the current user's exposure audience
 *
 * Uses auth context and route to determine whether the consumer
 * is a teacher, school, admin, or public visitor.
 *
 * Phase 4A — Intelligence Governance
 */

import { useAuth } from "@/contexts/AuthContext";
import type { ExposureAudience } from "../types/exposure.types";

/**
 * Resolves exposure audience from current auth + route context.
 * Defaults to "public" (most restrictive) when context is ambiguous.
 */
export function useExposureAudience(): ExposureAudience {
  const { user, roles } = useAuth();

  // Not authenticated → public
  if (!user) return "public";

  // Admin role
  if (roles.includes("admin" as any)) return "admin";

  // School roles
  if (
    roles.includes("school_admin" as any) ||
    roles.includes("school_recruiter" as any) ||
    roles.includes("school_academic_lead" as any)
  ) {
    return "school";
  }

  // Teacher role
  if (roles.includes("teacher" as any)) return "teacher";

  // Authenticated but unknown role → safe default
  return "public";
}

/**
 * Pure function variant for non-React contexts (e.g., tests, adapters).
 * Follows same logic as the hook.
 */
export function resolveExposureAudience(
  role: string | null | undefined,
  isAuthenticated: boolean,
): ExposureAudience {
  if (!isAuthenticated || !role) return "public";
  if (role === "admin") return "admin";
  if (role === "school_admin" || role === "school_recruiter" || role === "school_academic_lead") return "school";
  if (role === "teacher") return "teacher";
  return "public";
}
