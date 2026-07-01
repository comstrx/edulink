/**
 * useTeacherDegrees — Read-compatible hook with legacy fallback.
 *
 * Strategy:
 *   1. If teacher_degrees rows exist → use them.
 *   2. Otherwise fallback to teacher_profiles.degree_ids (legacy).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherDegreeEntry {
  id: string;
  degree_term_id: string;
  institution: string | null;
  year_completed: number | null;
  degree_name?: string;
}

export function useTeacherDegrees(teacherId: string | null) {
  return useQuery({
    queryKey: ["teacher_degrees", teacherId],
    enabled: !!teacherId,
    queryFn: async (): Promise<TeacherDegreeEntry[]> => {
      if (!teacherId) return [];

      const { data: rows, error } = await supabase
        .from("teacher_degrees")
        .select("id, degree_term_id, institution, year_completed")
        .eq("teacher_id", teacherId);

      if (error) throw error;

      if (rows && rows.length > 0) {
        const termIds = rows.map((r) => r.degree_term_id);
        const { data: terms } = await supabase
          .from("taxonomy_terms")
          .select("id, name")
          .in("id", termIds);

        const nameMap: Record<string, string> = {};
        terms?.forEach((t) => { nameMap[t.id] = t.name; });

        return rows.map((r) => ({
          id: r.id,
          degree_term_id: r.degree_term_id,
          institution: r.institution,
          year_completed: r.year_completed,
          degree_name: nameMap[r.degree_term_id],
        }));
      }

      // Fallback: legacy degree_ids array
      const { data: profile } = await supabase
        .from("teacher_profiles")
        .select("degree_ids")
        .eq("id", teacherId)
        .maybeSingle();

      if (!profile?.degree_ids?.length) return [];

      const { data: terms } = await supabase
        .from("taxonomy_terms")
        .select("id, name")
        .in("id", profile.degree_ids);

      return (terms ?? []).map((t) => ({
        id: `legacy-${t.id}`,
        degree_term_id: t.id,
        institution: null,
        year_completed: null,
        degree_name: t.name,
      }));
    },
  });
}
