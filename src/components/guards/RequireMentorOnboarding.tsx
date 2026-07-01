import { Navigate, Outlet } from "react-router-dom";
import { useMentorOnboardingStatus } from "@/hooks/useMentorOnboardingStatus";

/**
 * Guard for mentor workspace routes.
 * Must be nested inside RequireAuth(teacher) + RequireEntitlement(canUseMentorWorkspace).
 *
 * Redirects based on mentor lifecycle state:
 * - not_mentor → /app/mentor/start
 * - draft / onboarding incomplete → /app/mentor/onboarding
 * - pending_review → /app/mentor/onboarding (shows pending state)
 * - paused / rejected / suspended → /app/mentor/onboarding (shows status)
 * - active + onboarding complete → allow through
 */
const RequireMentorOnboarding = () => {
  const { mentorStatus, onboardingCompleted, isLoading } = useMentorOnboardingStatus();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (mentorStatus === "not_mentor") {
    return <Navigate to="/app/mentor/start" replace />;
  }

  if (mentorStatus === "active" && onboardingCompleted) {
    return <Outlet />;
  }

  // All other states: draft, pending_review, paused, rejected, suspended
  return <Navigate to="/app/mentor/onboarding" replace />;
};

export default RequireMentorOnboarding;
