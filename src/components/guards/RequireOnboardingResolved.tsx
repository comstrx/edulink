import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useOnboardingSnapshot } from "@/hooks/useOnboardingSnapshot";

/**
 * Centralized onboarding guard.
 *
 * Sits after auth/role/membership/entitlement guards.
 * Uses the unified onboarding snapshot to determine whether the user
 * may proceed to their target route or must be redirected to a setup page.
 *
 * Setup/start routes are always allowed through to prevent redirect loops.
 *
 * For teacher persona: also redirects complete users away from setup
 * routes back to the dashboard (mirrors RequireTeacherOnboarding behavior).
 */

const SETUP_ROUTES = [
  "/app/teacher/start",
  "/app/teacher/onboarding",
  "/app/school/start",
  "/app/school/onboarding",
  "/app/mentor/start",
  "/app/mentor/onboarding",
  "/app/provider/start",
  "/app/provider/onboarding",
  "/app/provider/organization",
];

const RequireOnboardingResolved = () => {
  const { pathname } = useLocation();
  const snapshot = useOnboardingSnapshot();

  if (snapshot.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Always allow setup/start routes through — they are the onboarding destinations
  const isSetupRoute = SETUP_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );

  if (isSetupRoute) {
    // Teacher-specific: redirect complete users away from setup to dashboard
    if (
      snapshot.teacher.isComplete &&
      (pathname === "/app/teacher/start" || pathname === "/app/teacher/onboarding")
    ) {
      return <Navigate to="/app/teacher/dashboard" replace />;
    }
    return <Outlet />;
  }

  // If there's a blocking route and we're not already on it, redirect
  if (snapshot.hasBlockingOnboarding && snapshot.blockingRoute && pathname !== snapshot.blockingRoute) {
    return <Navigate to={snapshot.blockingRoute} replace />;
  }

  return <Outlet />;
};

export default RequireOnboardingResolved;
