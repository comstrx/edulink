import { useQuery } from "@tanstack/react-query";
import { fetchTermsByDomain, TaxonomyTerm } from "@/lib/taxonomy-api";

/**
 * Fetch rejection reason terms from the taxonomy system.
 * Domain key: rejection_reasons
 */
export function useRejectionReasons() {
  return useQuery<TaxonomyTerm[]>({
    queryKey: ["taxonomy-terms", "rejection_reasons"],
    queryFn: () => fetchTermsByDomain("rejection_reasons"),
    staleTime: 5 * 60 * 1000,
  });
}
