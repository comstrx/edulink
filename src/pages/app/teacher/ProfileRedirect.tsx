import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Redirects /app/teacher/profile to /teachers/:profileId (the unified profile page).
 * Falls back to /app/teacher/dashboard if no profile exists yet.
 */
const TeacherProfileRedirect = () => {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my_teacher_profile_redirect", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (profile) {
    return <Navigate to={`/teachers/${profile.id}`} replace />;
  }

  // No profile yet — send to dashboard where they can create one
  return <Navigate to="/app/teacher/dashboard" replace />;
};

export default TeacherProfileRedirect;
