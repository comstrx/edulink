import { Navigate, Outlet } from "react-router-dom";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";

/**
 * Guard that ensures the current user has an active school membership.
 * Must be nested inside RequireAuth with school roles.
 * Redirects users without memberships to access-denied.
 */
const RequireSchoolMembership = () => {
  const { workspace, isLoading } = useCurrentSchoolWorkspace();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!workspace) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
};

export default RequireSchoolMembership;
