/**
 * useCompetencyTerms — Fetches taxonomy terms from skills + competency-domains
 * for use in the session outcome competency picker.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompetencyTerm {
  id: string;
  name: string;
  vocabulary: string;
}

export function useCompetencyTerms() {
  return useQuery({
    queryKey: ["competency_terms"],
    queryFn: async (): Promise<CompetencyTerm[]> => {
      // Get vocabulary IDs for skills and competency-domains
      // taxonomy_vocabularies not in generated types — cast required
      const { data: vocabs } = await (supabase as any)
        .from("taxonomy_vocabularies")
        .select("id, slug")
        .in("slug", ["skills", "competency-domains"]);

      if (!vocabs?.length) return [];

      const vocabIds = vocabs.map((v: any) => v.id);
      const vocabMap: Record<string, string> = {};
      vocabs.forEach((v: any) => { vocabMap[v.id] = v.slug; });

      // vocabIds from untyped taxonomy_vocabularies — cast required
      const { data: terms, error } = await (supabase as any)
        .from("taxonomy_terms")
        .select("id, name, vocabulary_id")
        .in("vocabulary_id", vocabIds)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      return (terms ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        vocabulary: vocabMap[t.vocabulary_id] ?? "unknown",
      }));
    },
    staleTime: 10 * 60 * 1000,
  });
}
