import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared hook for school follow state.
 * Single source of truth — used by SchoolProfile, SchoolsDiscovery, and any future surface.
 */
export function useSchoolFollows() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data: followedSchoolIds = [], isLoading } = useQuery({
    queryKey: ["school-follows", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_follows")
        .select("school_id")
        .eq("teacher_user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.school_id);
    },
  });

  const followedSchoolIdSet = useMemo(
    () => new Set(followedSchoolIds),
    [followedSchoolIds],
  );

  return {
    followedSchoolIds,
    followedSchoolIdSet,
    isLoading,
    isAuthenticated: !!userId,
  };
}

/** Returns a helper to invalidate school-follows for the current user. */
export function useInvalidateSchoolFollows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return () => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ["school-follows", user.id] });
    }
  };
}
