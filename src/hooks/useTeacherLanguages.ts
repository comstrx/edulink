/**
 * useTeacherLanguages — Read-compatible hook for teacher language proficiency.
 *
 * Strategy:
 *   1. If teacher_languages rows exist → use them (source of truth).
 *   2. Otherwise fallback to teacher_profiles.language_ids (legacy).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherLanguageEntry {
  id: string;
  language_term_id: string;
  language_level_term_id: string | null;
  /** Resolved display name from taxonomy */
  language_name?: string;
  level_name?: string;
}

export function useTeacherLanguages(teacherId: string | null) {
  return useQuery({
    queryKey: ["teacher_languages", teacherId],
    enabled: !!teacherId,
    queryFn: async (): Promise<TeacherLanguageEntry[]> => {
      if (!teacherId) return [];

      // Try relational table first
      const { data: rows, error } = await supabase
        .from("teacher_languages")
        .select(`
          id,
          language_term_id,
          language_level_term_id
        `)
        .eq("teacher_id", teacherId);

      if (error) throw error;

      if (rows && rows.length > 0) {
        // Resolve names in batch
        const langIds = rows.map((r) => r.language_term_id);
        const levelIds = rows
          .map((r) => r.language_level_term_id)
          .filter(Boolean) as string[];
        const allIds = [...new Set([...langIds, ...levelIds])];

        const { data: terms } = await supabase
          .from("taxonomy_terms")
          .select("id, name")
          .in("id", allIds);

        const nameMap: Record<string, string> = {};
        terms?.forEach((t) => { nameMap[t.id] = t.name; });

        return rows.map((r) => ({
          id: r.id,
          language_term_id: r.language_term_id,
          language_level_term_id: r.language_level_term_id,
          language_name: nameMap[r.language_term_id],
          level_name: r.language_level_term_id
            ? nameMap[r.language_level_term_id]
            : undefined,
        }));
      }

      // Fallback: legacy language_ids array
      const { data: profile } = await supabase
        .from("teacher_profiles")
        .select("language_ids")
        .eq("id", teacherId)
        .maybeSingle();

      if (!profile?.language_ids?.length) return [];

      const { data: terms } = await supabase
        .from("taxonomy_terms")
        .select("id, name")
        .in("id", profile.language_ids);

      return (terms ?? []).map((t) => ({
        id: `legacy-${t.id}`,
        language_term_id: t.id,
        language_level_term_id: null,
        language_name: t.name,
        level_name: undefined,
      }));
    },
  });
}
