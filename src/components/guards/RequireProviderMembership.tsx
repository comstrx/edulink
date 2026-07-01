import { Navigate, Outlet } from "react-router-dom";
import { useProviderMembership } from "@/hooks/useProviderProfile";

/**
 * Guard that ensures the current user has an active provider membership.
 * Must be nested inside RequireAuth with provider role.
 * Redirects users without memberships to access-denied.
 */
const RequireProviderMembership = () => {
  const { data: membership, isLoading } = useProviderMembership();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!membership) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
};

export default RequireProviderMembership;
