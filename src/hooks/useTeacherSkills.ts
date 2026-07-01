/**
 * useTeacherSkills — Read-compatible hook for teacher skills.
 *
 * Strategy:
 *   1. If teacher_skills rows exist → use them (source of truth).
 *   2. No legacy fallback (skills were never stored as arrays on teacher_profiles).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherSkillEntry {
  id: string;
  skill_term_id: string;
  proficiency_level: string | null;
  years_experience: number | null;
  skill_name?: string;
}

export function useTeacherSkills(teacherId: string | null) {
  return useQuery({
    queryKey: ["teacher_skills", teacherId],
    enabled: !!teacherId,
    queryFn: async (): Promise<TeacherSkillEntry[]> => {
      if (!teacherId) return [];

      const { data: rows, error } = await supabase
        .from("teacher_skills")
        .select("id, skill_term_id, proficiency_level, years_experience")
        .eq("teacher_id", teacherId);

      if (error) throw error;
      if (!rows?.length) return [];

      const termIds = rows.map((r) => r.skill_term_id);
      const { data: terms } = await supabase
        .from("taxonomy_terms")
        .select("id, name")
        .in("id", termIds);

      const nameMap: Record<string, string> = {};
      terms?.forEach((t) => { nameMap[t.id] = t.name; });

      return rows.map((r) => ({
        id: r.id,
        skill_term_id: r.skill_term_id,
        proficiency_level: r.proficiency_level,
        years_experience: r.years_experience,
        skill_name: nameMap[r.skill_term_id],
      }));
    },
  });
}
