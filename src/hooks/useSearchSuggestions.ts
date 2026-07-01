/**
 * useSearchSuggestions — Load dynamic search suggestions from taxonomy terms.
 * Replaces hardcoded suggestions with real data from the platform.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SearchSuggestion {
  value: string;
  category: "subject" | "curriculum" | "location" | "role" | "recent";
  termId?: string;
}

export function useSearchSuggestions() {
  return useQuery({
    queryKey: ["search_suggestions"],
    staleTime: 15 * 60 * 1000, // 15 min cache
    queryFn: async () => {
      // Get term type IDs for relevant domains
      const { data: termTypes } = await supabase
        .from("taxonomy_term_types")
        .select("id, key")
        .in("key", ["subjects", "curriculums", "countries", "cities", "role_categories"])
        .eq("is_active", true);

      if (!termTypes || termTypes.length === 0) return [];

      const typeMap: Record<string, string> = {};
      termTypes.forEach((t) => { typeMap[t.key] = t.id; });

      // Fetch popular/common terms from each domain
      const suggestions: SearchSuggestion[] = [];

      // Subjects - get common teaching subjects
      if (typeMap.subjects) {
        const { data: subjects } = await supabase
          .from("taxonomy_terms")
          .select("id, name, slug")
          .eq("term_type_id", typeMap.subjects)
          .eq("is_active", true)
          .in("slug", [
            "mathematics", "english-first-language", "english-elt-esl", "science", 
            "chemistry", "physics", "biology", "history", "geography", 
            "arabic", "islamic-studies", "french", "music", "art", "pe-physical-education"
          ])
          .order("name");

        subjects?.forEach((subject) => {
          suggestions.push({
            value: `${subject.name} Teacher`,
            category: "subject",
            termId: subject.id,
          });
        });
      }

      // Curriculums
      if (typeMap.curriculums) {
        const { data: curriculums } = await supabase
          .from("taxonomy_terms")
          .select("id, name, slug")
          .eq("term_type_id", typeMap.curriculums)
          .eq("is_active", true)
          .in("slug", ["ib", "british", "american", "cambridge-igcse", "french"])
          .order("name");

        curriculums?.forEach((curriculum) => {
          suggestions.push({
            value: `${curriculum.name} Curriculum`,
            category: "curriculum",
            termId: curriculum.id,
          });
          suggestions.push({
            value: `${curriculum.name} Teacher`,
            category: "curriculum", 
            termId: curriculum.id,
          });
        });
      }

      // Popular locations
      if (typeMap.countries) {
        const { data: countries } = await supabase
          .from("taxonomy_terms")
          .select("id, name, slug")
          .eq("term_type_id", typeMap.countries)
          .eq("is_active", true)
          .in("slug", ["uae", "saudi-arabia", "egypt", "qatar", "kuwait", "oman"])
          .order("name");

        countries?.forEach((country) => {
          suggestions.push({
            value: country.name,
            category: "location",
            termId: country.id,
          });
        });
      }

      if (typeMap.cities) {
        const { data: cities } = await supabase
          .from("taxonomy_terms")
          .select("id, name, slug")
          .eq("term_type_id", typeMap.cities)
          .eq("is_active", true)
          .in("slug", ["dubai", "abu-dhabi", "riyadh", "jeddah", "cairo", "doha", "kuwait-city"])
          .order("name");

        cities?.forEach((city) => {
          suggestions.push({
            value: city.name,
            category: "location",
            termId: city.id,
          });
        });
      }

      // Role categories
      if (typeMap.role_categories) {
        const { data: roles } = await supabase
          .from("taxonomy_terms")
          .select("id, name, slug")
          .eq("term_type_id", typeMap.role_categories)
          .eq("is_active", true)
          .order("name");

        roles?.slice(0, 8).forEach((role) => {
          suggestions.push({
            value: role.name,
            category: "role",
            termId: role.id,
          });
        });
      }

      // Add some common search phrases
      const commonPhrases = [
        { value: "ESL Instructor", category: "subject" as const },
        { value: "Head of Department", category: "role" as const },
        { value: "SEN Coordinator", category: "role" as const },
        { value: "Early Years Lead", category: "role" as const },
        { value: "Primary Homeroom Teacher", category: "role" as const },
        { value: "Online ESL", category: "subject" as const },
      ];

      suggestions.push(...commonPhrases);

      // Sort by category priority and alphabetically
      const categoryOrder = { subject: 1, curriculum: 2, role: 3, location: 4 };
      suggestions.sort((a, b) => {
        const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category];
        if (categoryDiff !== 0) return categoryDiff;
        return a.value.localeCompare(b.value);
      });

      return suggestions;
    },
  });
}