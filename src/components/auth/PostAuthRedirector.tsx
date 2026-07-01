/**
 * PostAuthRedirector — Mounted after successful auth on /login.
 *
 * Uses the decision system to determine the best destination,
 * with the legacy resolveRedirect as a safe fallback.
 *
 * ⚠️ This component is ONLY rendered when user is authenticated + auth is loaded.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePostAuthDecision } from "@/hooks/usePostAuthDecision";
import { getRedirectPath, getSchoolAdminRedirect, getTeacherRedirect } from "@/lib/getSchoolRedirect";
import { supabase } from "@/integrations/supabase/client";

interface PostAuthRedirectorProps {
  onError: (message: string) => void;
}

async function legacyResolveRedirect(
  userId: string,
  roles: string[],
  intendedRole?: string,
): Promise<string> {
  if (roles.length > 0) {
    if (roles.includes("admin") || roles.includes("provider")) {
      return getRedirectPath(roles);
    }
    const hasSchoolRole = roles.some((role) => role.startsWith("school_"));
    if (hasSchoolRole) return getSchoolAdminRedirect(userId);
    if (roles.includes("teacher")) return getTeacherRedirect(userId);
    return getRedirectPath(roles);
  }

  if (intendedRole === "teacher" || intendedRole === "school_admin" || intendedRole === "provider") {
    const { error: rpcError } = await supabase.rpc("bootstrap_initial_role", { _role: intendedRole });
    if (rpcError) {
      console.error("[PostAuthRedirector] bootstrap_initial_role failed:", rpcError);
      throw new Error("Account setup failed. Please try again.");
    }
    if (intendedRole === "school_admin") return getSchoolAdminRedirect(userId);
    if (intendedRole === "provider") return "/app/provider/start";
    return "/app/teacher/onboarding";
  }

  return "/account/resolve";
}

export default function PostAuthRedirector({ onError }: PostAuthRedirectorProps) {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const decision = usePostAuthDecision();
  const navigatedRef = useRef(false);
  const [fallbackTriggered, setFallbackTriggered] = useState(false);

  // Timeout: if decision hook hasn't resolved in 4s, use legacy fallback
  useEffect(() => {
    if (navigatedRef.current) return;
    const timer = setTimeout(() => {
      if (!navigatedRef.current && !decision.isReady) {
        console.warn("[PostAuthRedirector] Decision timeout — using legacy fallback");
        setFallbackTriggered(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [decision.isReady]);

  // Decision-based navigation
  useEffect(() => {
    if (navigatedRef.current || !decision.isReady || !decision.destination) return;

    navigatedRef.current = true;
    console.log("[PostAuthRedirector] Decision route:", decision.destination, "reason:", decision.reasonKey);
    navigate(decision.destination, { replace: true });
  }, [decision.isReady, decision.destination, navigate]);

  // Fallback navigation (timeout or decision failure)
  useEffect(() => {
    if (!fallbackTriggered || navigatedRef.current || !user) return;

    navigatedRef.current = true;
    legacyResolveRedirect(user.id, roles, user.user_metadata?.intended_role)
      .then((dest) => {
        console.log("[PostAuthRedirector] Fallback route:", dest);
        navigate(dest, { replace: true });
      })
      .catch((err) => {
        console.error("[PostAuthRedirector] Fallback failed:", err);
        onError(err?.message || "Something went wrong. Please try again.");
      });
  }, [fallbackTriggered, user, roles, navigate, onError]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
