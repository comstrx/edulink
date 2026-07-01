/**
 * useTrainingSearch — Supabase-backed search engine for Training catalog pages.
 *
 * Implements SearchEngineReturn<TrainingFilters, TrainingSearchItem, TrainingSortOption>
 * with server-side filtering, sorting, and pagination against training_items.
 *
 * P2A Contract: reads from training_items where status='published' AND is_active=true.
 * RLS enforces the same rule, so the client simply queries without extra WHERE.
 */
import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type TrainingFilters,
  emptyTrainingFilters,
  useTrainingFilterUrlSync,
} from "@/hooks/useTrainingFilterUrlSync";
import type { SearchEngineReturn } from "@/lib/search-contract";

// ── Result item type ────────────────────────────────────────────

export interface TrainingSearchItem {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  thumbnail_url: string | null;
  type: "course" | "package" | "pathway";
  duration: string | null;
  duration_hours: number | null;
  learning_format_term_id: string | null;
  training_level_term_id: string | null;
  credential_eligible: boolean;
  micro_assessment: boolean;
  cri_boost_value: number | null;
  pricing_type: string | null;
  price_amount: number | null;
  price_currency: string | null;
  required_course_ids: string[] | null;
  cri_target: number | null;
  milestones_json: unknown[] | null;
  audience: string | null;
  created_at: string;
  competency_domain_term_ids: string[] | null;
  skill_term_ids: string[] | null;
  ownership_type: string | null;
  provider_id: string | null;
  // Resolved names
  learning_format_name: string | null;
  training_level_name: string | null;
  provider_name: string | null;
  provider_slug: string | null;
  provider_logo_url: string | null;
  // Computed convenience
  milestone_count: number;
}

// ── Sort options ─────────────────────────────────────────────────

export type TrainingSortOption = "recommended" | "newest" | "title-asc" | "duration";

export const TRAINING_SORT_OPTIONS: { value: TrainingSortOption; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "title-asc", label: "A → Z" },
  { value: "duration", label: "Duration" },
];

// ── Listing field select ─────────────────────────────────────────

const LISTING_SELECT = `
  id, slug, title, short_description, thumbnail_url, type,
  duration, duration_hours, learning_format_term_id, training_level_term_id,
  credential_eligible, micro_assessment, cri_boost_value,
  pricing_type, price_amount, price_currency,
  required_course_ids, cri_target, milestones_json,
  competency_domain_term_ids, skill_term_ids,
  audience, created_at, ownership_type, provider_id
`;

// ── Query builder ────────────────────────────────────────────────

interface FetchParams {
  type?: "course" | "package" | "pathway";
  filters: TrainingFilters;
  sortBy: TrainingSortOption;
  page: number;
  pageSize: number;
}

async function fetchTrainingItems({ type, filters, sortBy, page, pageSize }: FetchParams) {
  // Build base query — RLS already enforces published+active for platform items.
  // For provider-owned items, we additionally require review_status=approved
  // and the provider must be active (verified via pre-filter below).
  let query = supabase
    .from("training_items")
    .select(LISTING_SELECT, { count: "exact" })
    .eq("is_active", true)
    .eq("status", "published");

  // Provider governance: exclude provider-owned items whose provider is inactive.
  // Pre-fetch active provider IDs, then filter training_items to platform OR provider with active parent.
  const { data: activeProviders } = await supabase
    .from("providers")
    .select("id")
    .eq("status", "active");
  const activeProviderIds = (activeProviders ?? []).map((p) => p.id);

  if (activeProviderIds.length > 0) {
    query = query.or(
      `ownership_type.eq.platform,and(ownership_type.eq.provider,review_status.eq.approved,provider_id.in.(${activeProviderIds.join(",")}))`
    );
  } else {
    // No active providers — only show platform items
    query = query.eq("ownership_type", "platform");
  }

  // Route-level type filter
  if (type) {
    query = query.eq("type", type);
  }

  // Text search (ILIKE on title + short_description)
  const q = filters.searchQuery.trim();
  if (q) {
    query = query.or(`title.ilike.%${q}%,short_description.ilike.%${q}%`);
  }

  // Single-select taxonomy filters
  if (filters.competencyDomainId) {
    query = query.contains("competency_domain_term_ids", [filters.competencyDomainId]);
  }
  if (filters.gradeBandId) {
    query = query.contains("grade_band_term_ids", [filters.gradeBandId]);
  }
  if (filters.curriculumId) {
    query = query.contains("curriculum_term_ids", [filters.curriculumId]);
  }
  if (filters.subjectId) {
    query = query.contains("subject_term_ids", [filters.subjectId]);
  }
  if (filters.learningFormatId) {
    query = query.eq("learning_format_term_id", filters.learningFormatId);
  }
  if (filters.trainingLevelId) {
    query = query.eq("training_level_term_id", filters.trainingLevelId);
  }

  // Multi-select: skills (contains all selected)
  if (filters.skills.length > 0) {
    query = query.contains("skill_term_ids", filters.skills);
  }

  // Sorting
  switch (sortBy) {
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "recommended":
      // Recommended: prioritize credential-eligible, then by recency
      query = query
        .order("credential_eligible", { ascending: false })
        .order("cri_boost_value", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      break;
    case "title-asc":
      query = query.order("title", { ascending: true });
      break;
    case "duration":
      query = query.order("duration_hours", { ascending: true, nullsFirst: false });
      break;
  }

  // Pagination
  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  const items = (data ?? []).map((row: any) => ({
    ...row,
    milestone_count: Array.isArray(row.milestones_json) ? row.milestones_json.length : 0,
    provider_name: null,
    provider_slug: null,
    provider_logo_url: null,
  })) as TrainingSearchItem[];

  // Resolve provider info for provider-owned items
  const providerIds = [...new Set(items.filter(i => i.ownership_type === "provider" && i.provider_id).map(i => i.provider_id!))];
  let providerMap: Record<string, { name: string; slug: string; logo: string | null }> = {};
  if (providerIds.length > 0) {
    const { data: provs } = await supabase
      .from("providers")
      .select("id, display_name, slug, logo_url")
      .in("id", providerIds)
      .eq("status", "active");
    (provs ?? []).forEach((p: any) => {
      providerMap[p.id] = { name: p.display_name, slug: p.slug, logo: p.logo_url };
    });
  }

  const enrichedItems = items.map(item => {
    if (item.ownership_type === "provider" && item.provider_id && providerMap[item.provider_id]) {
      const p = providerMap[item.provider_id];
      return { ...item, provider_name: p.name, provider_slug: p.slug, provider_logo_url: p.logo };
    }
    return item;
  });

  return { items: enrichedItems, totalCount: count ?? 0 };
}

// ── Taxonomy name resolution (batch) ─────────────────────────────

async function resolveTermNames(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data } = await supabase
    .from("taxonomy_terms")
    .select("id, name")
    .in("id", ids);
  const map: Record<string, string> = {};
  data?.forEach((t) => (map[t.id] = t.name));
  return map;
}

// ── Hook ─────────────────────────────────────────────────────────

interface UseTrainingSearchOptions {
  type?: "course" | "package" | "pathway";
  pageSize?: number;
}

export function useTrainingSearch(
  options: UseTrainingSearchOptions = {},
): SearchEngineReturn<TrainingFilters, TrainingSearchItem, TrainingSortOption> {
  const { type, pageSize = 6 } = options;

  const [filters, setFilters] = useState<TrainingFilters>(emptyTrainingFilters);

  // URL sync
  useTrainingFilterUrlSync(filters, setFilters);

  const sortBy = (filters.sortBy || "recommended") as TrainingSortOption;
  const currentPage = filters.currentPage;

  // Main catalog query
  const { data, isLoading, error } = useQuery({
    queryKey: ["training_catalog", type, filters, sortBy, currentPage, pageSize],
    queryFn: () => fetchTrainingItems({ type, filters, sortBy, page: currentPage, pageSize }),
    staleTime: 2 * 60 * 1000,
  });

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Resolve taxonomy names for display
  const termIds = useMemo(() => {
    const ids = new Set<string>();
    items.forEach((item) => {
      if (item.learning_format_term_id) ids.add(item.learning_format_term_id);
      if (item.training_level_term_id) ids.add(item.training_level_term_id);
    });
    return Array.from(ids);
  }, [items]);

  const { data: termNameMap } = useQuery({
    queryKey: ["training_term_names", termIds],
    queryFn: () => resolveTermNames(termIds),
    enabled: termIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Enrich items with resolved names
  const results: TrainingSearchItem[] = useMemo(() => {
    if (!termNameMap) return items;
    return items.map((item) => ({
      ...item,
      learning_format_name: item.learning_format_term_id
        ? termNameMap[item.learning_format_term_id] ?? null
        : null,
      training_level_name: item.training_level_term_id
        ? termNameMap[item.training_level_term_id] ?? null
        : null,
    }));
  }, [items, termNameMap]);

  // Actions
  const updateFilters = useCallback(
    (partial: Partial<TrainingFilters>) =>
      setFilters((prev) => ({ ...prev, ...partial, currentPage: 0 })),
    [],
  );

  const setSearchQuery = useCallback(
    (query: string) => setFilters((prev) => ({ ...prev, searchQuery: query, currentPage: 0 })),
    [],
  );

  const setSortBy = useCallback(
    (sort: TrainingSortOption) => setFilters((prev) => ({ ...prev, sortBy: sort, currentPage: 0 })),
    [],
  );

  const setPage = useCallback(
    (page: number) => setFilters((prev) => ({ ...prev, currentPage: page })),
    [],
  );

  const resetFilters = useCallback(() => setFilters(emptyTrainingFilters), []);

  return {
    filters,
    searchQuery: filters.searchQuery,
    sortBy,
    currentPage: Math.min(currentPage, totalPages - 1),
    pageSize,
    results,
    totalCount,
    totalPages,
    isLoading,
    updateFilters,
    setSearchQuery,
    setSortBy,
    setPage,
    resetFilters,
  };
}
