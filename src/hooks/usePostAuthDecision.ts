/**
 * usePostAuthDecision — Smart post-auth routing decision.
 *
 * Builds on useUserContext to determine the ideal destination
 * AND the reason behind it. This is the "decision layer" that sits
 * above the raw role-based redirect.
 *
 * ⚠️ This hook does NOT navigate. It only returns a decision.
 * ⚠️ Consumers decide when/whether to act on it.
 * ⚠️ Falls back gracefully if context is loading or unavailable.
 */

import { useUserContext, type UserContext } from "@/hooks/useUserContext";

export type DecisionPriority = "high" | "medium" | "low";

export interface PostAuthDecision {
  /** Where to send the user */
  destination: string | null;
  /** Human-readable reason for this destination */
  reason: string;
  /** Machine-readable reason key for tracing */
  reasonKey: string;
  /** Priority — affects UI treatment */
  priority: DecisionPriority;
  /** The underlying context used to make this decision */
  context: UserContext;
  /** Whether the decision is ready (context fully loaded) */
  isReady: boolean;
}

function resolveTeacherDecision(ctx: UserContext): Pick<PostAuthDecision, "destination" | "reason" | "reasonKey" | "priority"> {
  if (!ctx.hasProfile) {
    return {
      destination: "/app/teacher/start",
      reason: "Complete your profile to get started",
      reasonKey: "teacher_no_profile",
      priority: "high",
    };
  }

  // Dashboard is the canonical destination for all teachers with a profile.
  // Readiness influences content WITHIN the dashboard, not the destination.
  return {
    destination: "/app/teacher/dashboard",
    reason: "Your professional hub — check your next steps",
    reasonKey: "teacher_has_profile",
    priority: "low",
  };
}

function resolveSchoolDecision(ctx: UserContext): Pick<PostAuthDecision, "destination" | "reason" | "reasonKey" | "priority"> {
  if (!ctx.hasProfile) {
    return {
      destination: "/app/school/start",
      reason: "Set up your school to start hiring",
      reasonKey: "school_no_org",
      priority: "high",
    };
  }

  if (!ctx.isOnboarded) {
    return {
      destination: "/app/school/start",
      reason: "Complete your school setup",
      reasonKey: "school_not_onboarded",
      priority: "high",
    };
  }

  return {
    destination: "/app/school/dashboard",
    reason: "Welcome back — here's your school overview",
    reasonKey: "school_ready",
    priority: "low",
  };
}

function resolveProviderDecision(ctx: UserContext): Pick<PostAuthDecision, "destination" | "reason" | "reasonKey" | "priority"> {
  if (!ctx.hasProfile) {
    return {
      destination: "/app/provider/start",
      reason: "Set up your provider profile",
      reasonKey: "provider_no_profile",
      priority: "high",
    };
  }

  return {
    destination: "/app/provider/start",
    reason: "Welcome back to your provider workspace",
    reasonKey: "provider_ready",
    priority: "low",
  };
}

function resolveAdminDecision(): Pick<PostAuthDecision, "destination" | "reason" | "reasonKey" | "priority"> {
  return {
    destination: "/admin/taxonomy",
    reason: "Admin console",
    reasonKey: "admin_default",
    priority: "low",
  };
}

export function usePostAuthDecision(): PostAuthDecision {
  const ctx = useUserContext();

  if (ctx.isLoading) {
    return {
      destination: null,
      reason: "Loading user context…",
      reasonKey: "loading",
      priority: "low",
      context: ctx,
      isReady: false,
    };
  }

  let decision: Pick<PostAuthDecision, "destination" | "reason" | "reasonKey" | "priority">;

  switch (ctx.role) {
    case "teacher":
      decision = resolveTeacherDecision(ctx);
      break;
    case "school":
      decision = resolveSchoolDecision(ctx);
      break;
    case "provider":
      decision = resolveProviderDecision(ctx);
      break;
    case "admin":
      decision = resolveAdminDecision();
      break;
    default:
      decision = {
        destination: "/account/resolve",
        reason: "We need more information to set up your account",
        reasonKey: "unresolved",
        priority: "high",
      };
  }

  // Log for traceability
  console.log("[PostAuthDecision]", {
    role: ctx.role,
    readinessLevel: ctx.readinessLevel,
    isOnboarded: ctx.isOnboarded,
    hasProfile: ctx.hasProfile,
    destination: decision.destination,
    reasonKey: decision.reasonKey,
    priority: decision.priority,
  });

  return {
    ...decision,
    context: ctx,
    isReady: true,
  };
}
