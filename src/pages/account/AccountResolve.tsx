import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

/**
 * Safe landing page for authenticated users whose role/redirect could not be resolved.
 * Prevents silent drops to the public homepage.
 * Redirects unauthenticated visitors to login.
 */
const AccountResolve = () => {
  const { user, roles, loading, signOut } = useAuth();

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
          <AlertCircle className="h-8 w-8 text-warning" />
        </div>

        <h1 className="text-2xl font-bold text-foreground">Account Setup Incomplete</h1>

        <p className="text-muted-foreground">
          You're signed in as <strong className="text-foreground">{user?.email ?? "unknown"}</strong>,
          but your account doesn't have the required setup to access the platform yet.
        </p>

        {roles.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No roles have been assigned to your account. This may happen if signup
            didn't complete fully. Please try signing up again or contact support.
          </p>
        )}

        {roles.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Your current roles ({roles.join(", ")}) could not be resolved to a workspace.
            Please contact support if this persists.
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button variant="outline" asChild>
            <Link to="/signup">Sign up with a different account</Link>
          </Button>
          <Button variant="ghost" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountResolve;
