import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared hook to resolve taxonomy term IDs to display names.
 * Uses a unified cache key so all consumers share the same query cache.
 */
export function useTaxonomyNames(ids: string[]) {
  return useQuery({
    queryKey: ["taxonomy_names", ids],
    queryFn: async () => {
      if (ids.length === 0) return {};
      const { data } = await supabase
        .from("taxonomy_terms")
        .select("id, name")
        .in("id", ids);
      const map: Record<string, string> = {};
      data?.forEach((t) => (map[t.id] = t.name));
      return map;
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
