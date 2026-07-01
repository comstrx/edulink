import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "teacher" | "school_admin" | "school_recruiter" | "school_academic_lead" | "school_training_manager" | "admin" | "provider";

interface RequireAuthProps {
  allowedRoles?: AppRole[];
}

const RequireAuth = ({ allowedRoles }: RequireAuthProps) => {
  const { user, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = roles.some((r) => allowedRoles.includes(r));
    if (!hasAccess) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  return <Outlet />;
};

export default RequireAuth;
