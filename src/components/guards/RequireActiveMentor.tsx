import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guard that ensures the current user is an active mentor.
 * Must be nested inside RequireAuth with teacher role.
 * Redirects non-mentors to teacher dashboard.
 */
const RequireActiveMentor = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: mentorRecord, isLoading } = useQuery({
    queryKey: ["mentor_guard", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mentors")
        .select("id, status")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!mentorRecord || mentorRecord.status !== "active") {
    return <Navigate to="/app/teacher/dashboard" replace />;
  }

  return <Outlet />;
};

export default RequireActiveMentor;
