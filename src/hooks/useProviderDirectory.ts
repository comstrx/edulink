/**
 * useProviderDirectory — Search engine for public provider discovery.
 * Returns active providers with search, filters, and pagination.
 */
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { applyProviderPublicFilters } from "@/lib/visibility-rules";
import { fetchProviderDirectory, fetchTrainingItemAgg } from "@/lib/supabase-typed-queries";

export interface ProviderDirectoryItem {
  id: string;
  display_name: string;
  slug: string;
  logo_url: string | null;
  bio: string | null;
  website_url: string | null;
  country_term_id: string | null;
  city_term_id: string | null;
  type: string;
  verification_status: string;
  approved_item_count: number;
  item_types: string[];
  country_name: string | null;
  credential_count: number;
}

export interface ProviderDirectoryFilters {
  searchQuery: string;
  countryId: string;
  contentType: string; // course | package | pathway | ""
}

const emptyFilters: ProviderDirectoryFilters = {
  searchQuery: "",
  countryId: "",
  contentType: "",
};

const PAGE_SIZE = 12;

export function useProviderDirectory() {
  const [filters, setFilters] = useState<ProviderDirectoryFilters>(emptyFilters);
  const [currentPage, setCurrentPage] = useState(0);
  const debouncedQuery = useDebouncedValue(filters.searchQuery, 300);

  const updateFilters = useCallback((patch: Partial<ProviderDirectoryFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setCurrentPage(0);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(emptyFilters);
    setCurrentPage(0);
  }, []);

  // Main query: fetch active providers with catalog counts
  const { data, isLoading } = useQuery({
    queryKey: ["provider_directory", debouncedQuery, filters.countryId, filters.contentType, currentPage],
    queryFn: async () => {
      // Step 0: If contentType is active, pre-fetch provider IDs that have matching items.
      // This allows the main query to apply this filter server-side for correct pagination.
      let contentTypeProviderIds: string[] | null = null;
      if (filters.contentType) {
        const { data: matchingItems, error: itemErr } = await supabase
          .from("training_items")
          .select("provider_id")
          .eq("ownership_type", "provider")
          .eq("review_status", "approved")
          .eq("is_active", true)
          .eq("status", "published")
          .eq("type", filters.contentType)
          .not("provider_id", "is", null);
        if (itemErr) throw itemErr;
        const uniqueIds = [...new Set((matchingItems ?? []).map((r) => r.provider_id).filter(Boolean) as string[])];
        contentTypeProviderIds = uniqueIds;
        if (uniqueIds.length === 0) {
          return { items: [] as ProviderDirectoryItem[], totalCount: 0 };
        }
      }

      // Step 1: Get publicly discoverable providers via typed helper
      const { providers, count } = await fetchProviderDirectory({
        applyPublicFilters: applyProviderPublicFilters,
        searchQuery: debouncedQuery,
        countryId: filters.countryId,
        providerIds: contentTypeProviderIds,
        offset: currentPage * PAGE_SIZE,
        limit: PAGE_SIZE,
      });

      if (providers.length === 0) {
        return { items: [] as ProviderDirectoryItem[], totalCount: count };
      }

      const providerIds = providers.map((p: any) => p.id);

      // Step 2: Get approved item counts & types per provider via typed helper
      const itemAgg = await fetchTrainingItemAgg(providerIds);

      const countMap: Record<string, { count: number; types: Set<string> }> = {};
      (itemAgg ?? []).forEach((row: any) => {
        if (!countMap[row.provider_id]) countMap[row.provider_id] = { count: 0, types: new Set() };
        countMap[row.provider_id].count++;
        countMap[row.provider_id].types.add(row.type);
      });

      // Step 3: Get credential counts per provider
      const { data: credAgg } = await supabase
        .from("earned_credentials")
        .select("issuer_provider_id")
        .in("issuer_provider_id", providerIds)
        .eq("status", "active");

      const credCountMap: Record<string, number> = {};
      (credAgg ?? []).forEach((row: any) => {
        credCountMap[row.issuer_provider_id] = (credCountMap[row.issuer_provider_id] || 0) + 1;
      });

      // Step 4: Resolve country names
      const countryIds = providers.map((p: any) => p.country_term_id).filter(Boolean);
      let countryMap: Record<string, string> = {};
      if (countryIds.length > 0) {
        const { data: terms } = await supabase.from("taxonomy_terms").select("id, name").in("id", countryIds);
        terms?.forEach((t) => (countryMap[t.id] = t.name));
      }

      // Step 5: Build items (contentType already filtered server-side via providerIds pre-filter)
      const items: ProviderDirectoryItem[] = providers.map((p: any) => ({
        id: p.id,
        display_name: p.display_name,
        slug: p.slug,
        logo_url: p.logo_url,
        bio: p.bio,
        website_url: p.website_url,
        country_term_id: p.country_term_id,
        city_term_id: p.city_term_id,
        type: p.type,
        verification_status: p.verification_status,
        approved_item_count: countMap[p.id]?.count ?? 0,
        item_types: Array.from(countMap[p.id]?.types ?? []),
        country_name: p.country_term_id ? countryMap[p.country_term_id] ?? null : null,
        credential_count: credCountMap[p.id] ?? 0,
      }));

      return { items, totalCount: count ?? 0 };
    },
    staleTime: 60_000,
  });

  const totalPages = Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE);

  return {
    results: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    totalPages,
    currentPage,
    isLoading,
    filters,
    updateFilters,
    resetFilters,
    setPage: setCurrentPage,
  };
}
