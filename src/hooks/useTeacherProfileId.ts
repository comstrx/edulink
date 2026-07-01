/**
 * useTeacherProfileId — resolves the teacher_profiles.id for the current user.
 * Shared utility for intelligence hooks that need the teacher profile ID.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useTeacherProfileId() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["teacher_profile_id", user?.id],
    queryFn: async (): Promise<string | null> => {
      if (!user) return null;
      const { data } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
}
