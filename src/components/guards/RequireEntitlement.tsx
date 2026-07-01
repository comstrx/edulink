import { Navigate, Outlet } from "react-router-dom";
import { useEffectiveEntitlements } from "@/hooks/useEffectiveEntitlements";

type EntitlementCheck =
  | "canUseHiring"
  | "canUseTraining"
  | "canUseMentorWorkspace"
  | "canUseProviderPortal"
  | "canUseAdminConsole";

interface RequireEntitlementProps {
  check: EntitlementCheck;
  fallback?: string;
}

const RequireEntitlement = ({ check, fallback = "/access-denied" }: RequireEntitlementProps) => {
  const entitlements = useEffectiveEntitlements();

  if (entitlements.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!entitlements[check]) {
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};

export default RequireEntitlement;
