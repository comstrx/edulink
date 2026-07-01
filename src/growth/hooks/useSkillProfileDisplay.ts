/**
 * useSkillProfileDisplay — Identity Display Hook
 *
 * Reads teacher_skills for DISPLAY purposes only.
 * This is identity/profile data, NOT intelligence.
 * No computation, no derivation, no intelligence meaning.
 *
 * Sprint 2.2 — Intelligence Consumption Convergence
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SkillDisplayEntry {
  termId: string;
  name: string;
  proficiencyLevel: string | null;
  yearsExperience: number | null;
}

export function useSkillProfileDisplay(profileId?: string) {
  return useQuery({
    queryKey: ["skill_profile_display", profileId],
    queryFn: async (): Promise<SkillDisplayEntry[]> => {
      const { data: rows } = await supabase
        .from("teacher_skills")
        .select("skill_term_id, proficiency_level, years_experience")
        .eq("teacher_id", profileId!);
      if (!rows?.length) return [];
      const termIds = rows.map((r) => r.skill_term_id);
      const { data: terms } = await supabase
        .from("taxonomy_terms")
        .select("id, name")
        .in("id", termIds);
      const nameMap: Record<string, string> = {};
      terms?.forEach((t) => { nameMap[t.id] = t.name; });
      return rows.map((r) => ({
        termId: r.skill_term_id,
        name: nameMap[r.skill_term_id] ?? r.skill_term_id,
        proficiencyLevel: r.proficiency_level,
        yearsExperience: r.years_experience,
      }));
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });
}
