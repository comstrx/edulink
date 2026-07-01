import { Navigate, useLocation } from "react-router-dom";
import { useSchoolOnboardingStatus } from "@/hooks/useSchoolOnboardingStatus";

export function SchoolHiringGate({ children }: { children: React.ReactNode }) {
  const { isCompleted, isLoading } = useSchoolOnboardingStatus();
  const { pathname } = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isCompleted) {
    return <Navigate to="/app/school/start" replace state={{ reason: "onboarding", returnTo: pathname }} />;
  }

  return <>{children}</>;
}
