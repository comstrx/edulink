/**
 * useMentorDirectory — Public mentor discovery hook.
 * Fetches active mentors with specializations, review counts, and teacher profile data.
 *
 * Strategy: Fetch ALL visible mentors without pagination at the DB level,
 * enrich with joined data, then apply client-side filters (search, specialization, rating)
 * and paginate the final filtered set. This ensures pagination counts are accurate.
 *
 * The full dataset is cached (staleTime: 60s) so page navigation is instant.
 */
import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { applyMentorPublicFilters } from "@/lib/visibility-rules";

export interface MentorDirectoryItem {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  years_experience: number | null;
  languages: string[];
  is_independent: boolean;
  specialization_ids: string[];
  specialization_names: string[];
  approved_review_count: number;
  provider_name: string | null;
  average_rating: number;
  session_review_count: number;
}

export interface MentorDirectoryFilters {
  searchQuery: string;
  specializationId: string;
  language: string;
  experienceRange: string; // "" | "0-3" | "3-7" | "7-15" | "15+"
  minRating: string; // "" | "4" | "4.5"
  sortBy: string; // "" | "rating" | "reviews" | "experience"
}

const emptyFilters: MentorDirectoryFilters = {
  searchQuery: "",
  specializationId: "",
  language: "",
  experienceRange: "",
  minRating: "",
  sortBy: "",
};

const PAGE_SIZE = 12;

export function useMentorDirectory() {
  const [filters, setFilters] = useState<MentorDirectoryFilters>(emptyFilters);
  const [currentPage, setCurrentPage] = useState(0);
  const debouncedQuery = useDebouncedValue(filters.searchQuery, 300);

  const updateFilters = useCallback((patch: Partial<MentorDirectoryFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setCurrentPage(0);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(emptyFilters);
    setCurrentPage(0);
  }, []);

  // ── Step 1: Fetch full enriched mentor dataset (cached, no pagination) ──
  const { data: allMentors, isLoading } = useQuery({
    queryKey: ["mentor_directory_full", filters.experienceRange, filters.language],
    queryFn: async () => {
      let mentorQuery = applyMentorPublicFilters(
        supabase
          .from("mentors")
          .select("id, user_id, bio, years_experience, languages, is_independent, primary_provider_id")
      )
        .order("years_experience", { ascending: false });

      // Server-side filters that can be applied at DB level
      if (filters.experienceRange) {
        const [min, max] = parseExperienceRange(filters.experienceRange);
        if (min !== null) mentorQuery = mentorQuery.gte("years_experience", min);
        if (max !== null) mentorQuery = mentorQuery.lt("years_experience", max);
      }

      if (filters.language) {
        mentorQuery = mentorQuery.contains("languages", [filters.language]);
      }

      const { data: mentors, error: mErr } = await mentorQuery;
      if (mErr) throw mErr;
      if (!mentors || mentors.length === 0) return [];

      const mentorIds = mentors.map((m: any) => m.id);
      const userIds = mentors.map((m: any) => m.user_id);

      // Parallel lookups for enrichment
      const [profilesRes, specsRes, reviewsRes, sessionReviewsRes] = await Promise.all([
        supabase.from("teacher_profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
        supabase.from("mentor_specializations").select("mentor_id, term_id").in("mentor_id", mentorIds),
        supabase.from("mentor_reviews").select("mentor_id").in("mentor_id", mentorIds).eq("review_decision", "approved"),
        supabase.from("mentor_session_reviews").select("mentor_id, rating").in("mentor_id", mentorIds).eq("status", "approved"),
      ]);

      const profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      (profilesRes.data ?? []).forEach((p: any) => { profileMap[p.user_id] = p; });

      const specMap: Record<string, string[]> = {};
      (specsRes.data ?? []).forEach((s: any) => {
        if (!specMap[s.mentor_id]) specMap[s.mentor_id] = [];
        specMap[s.mentor_id].push(s.term_id);
      });

      // Resolve specialization term names
      const allTermIds = [...new Set((specsRes.data ?? []).map((s: any) => s.term_id))];
      let termNameMap: Record<string, string> = {};
      if (allTermIds.length > 0) {
        const { data: terms } = await supabase.from("taxonomy_terms").select("id, name").in("id", allTermIds as string[]);
        terms?.forEach((t) => { termNameMap[t.id] = t.name; });
      }

      const reviewCountMap: Record<string, number> = {};
      (reviewsRes.data ?? []).forEach((r: any) => {
        reviewCountMap[r.mentor_id] = (reviewCountMap[r.mentor_id] || 0) + 1;
      });

      const ratingMap: Record<string, { sum: number; count: number }> = {};
      (sessionReviewsRes.data ?? []).forEach((r: any) => {
        if (!ratingMap[r.mentor_id]) ratingMap[r.mentor_id] = { sum: 0, count: 0 };
        ratingMap[r.mentor_id].sum += r.rating;
        ratingMap[r.mentor_id].count += 1;
      });

      // Provider names
      const providerIds = [...new Set(mentors.map((m: any) => m.primary_provider_id).filter(Boolean))];
      let providerMap: Record<string, string> = {};
      if (providerIds.length > 0) {
        const { data: provs } = await supabase.from("providers").select("id, display_name").in("id", providerIds);
        (provs ?? []).forEach((p: any) => { providerMap[p.id] = p.display_name; });
      }

      return mentors.map((m: any): MentorDirectoryItem => {
        const profile = profileMap[m.user_id];
        const specIds = specMap[m.id] ?? [];
        const rating = ratingMap[m.id];
        const avgRating = rating ? Math.round((rating.sum / rating.count) * 10) / 10 : 0;
        return {
          id: m.id,
          full_name: profile?.full_name ?? "Mentor",
          avatar_url: profile?.avatar_url ?? null,
          bio: m.bio,
          years_experience: m.years_experience,
          languages: m.languages ?? [],
          is_independent: m.is_independent,
          specialization_ids: specIds,
          specialization_names: specIds.map((id: string) => termNameMap[id] ?? id.slice(0, 8)),
          approved_review_count: reviewCountMap[m.id] ?? 0,
          provider_name: m.primary_provider_id ? providerMap[m.primary_provider_id] ?? null : null,
          average_rating: avgRating,
          session_review_count: rating?.count ?? 0,
        };
      });
    },
    staleTime: 60_000,
  });

  // ── Step 2: Apply client-side filters + sort + paginate on the full cached set ──
  const { paged, filteredCount } = useMemo(() => {
    let items = allMentors ?? [];

    // Text search
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.trim().toLowerCase();
      items = items.filter((m) =>
        m.full_name.toLowerCase().includes(q) ||
        (m.bio?.toLowerCase().includes(q)) ||
        m.specialization_names.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Specialization filter
    if (filters.specializationId) {
      items = items.filter((m) => m.specialization_ids.includes(filters.specializationId));
    }

    // Rating filter
    if (filters.minRating) {
      const minRating = parseFloat(filters.minRating);
      items = items.filter((m) => m.average_rating >= minRating && m.session_review_count > 0);
    }

    // Sorting
    if (filters.sortBy === "rating") {
      items = [...items].sort((a, b) => b.average_rating - a.average_rating);
    } else if (filters.sortBy === "reviews") {
      items = [...items].sort((a, b) => (b.session_review_count + b.approved_review_count) - (a.session_review_count + a.approved_review_count));
    } else if (filters.sortBy === "experience") {
      items = [...items].sort((a, b) => (b.years_experience ?? 0) - (a.years_experience ?? 0));
    }

    const filteredCount = items.length;
    const paged = items.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
    return { paged, filteredCount };
  }, [allMentors, debouncedQuery, filters.specializationId, filters.minRating, filters.sortBy, currentPage]);

  const totalPages = Math.ceil(filteredCount / PAGE_SIZE);

  return {
    results: paged,
    totalCount: filteredCount,
    totalPages,
    currentPage,
    isLoading,
    filters,
    updateFilters,
    resetFilters,
    setPage: setCurrentPage,
  };
}

function parseExperienceRange(range: string): [number | null, number | null] {
  switch (range) {
    case "0-3": return [0, 3];
    case "3-7": return [3, 7];
    case "7-15": return [7, 15];
    case "15+": return [15, null];
    default: return [null, null];
  }
}

/** Get unique languages from all active mentors for filter dropdown */
export function useMentorLanguages() {
  return useQuery({
    queryKey: ["mentor_languages"],
    queryFn: async () => {
      const { data } = await applyMentorPublicFilters(
        supabase
          .from("mentors")
          .select("languages")
      );
      const langs = new Set<string>();
      (data ?? []).forEach((m: any) => (m.languages ?? []).forEach((l: string) => langs.add(l)));
      return Array.from(langs).sort();
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * useMentorList — Simplified mentor list hook for internal pages.
 * Returns all active mentors without pagination or complex filters.
 * Replaces the old useMentors hook.
 */
export function useMentorList() {
  return useQuery({
    queryKey: ["mentor_list"],
    queryFn: async (): Promise<MentorDirectoryItem[]> => {
      const { data: mentors, error: mErr } = await applyMentorPublicFilters(
        supabase
          .from("mentors")
          .select("id, user_id, bio, years_experience, languages, is_independent, primary_provider_id, status")
      )
        .order("years_experience", { ascending: false });

      if (mErr) throw mErr;
      if (!mentors?.length) return [];

      const mentorIds = mentors.map((m: any) => m.id);
      const userIds = mentors.map((m: any) => m.user_id);

      const [profilesRes, specsRes, reviewsRes, sessionReviewsRes] = await Promise.all([
        supabase.from("teacher_profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
        supabase.from("mentor_specializations").select("mentor_id, term_id").in("mentor_id", mentorIds),
        supabase.from("mentor_reviews").select("mentor_id").in("mentor_id", mentorIds).eq("review_decision", "approved"),
        supabase.from("mentor_session_reviews").select("mentor_id, rating").in("mentor_id", mentorIds).eq("status", "approved"),
      ]);

      const profileMap: Record<string, any> = {};
      (profilesRes.data ?? []).forEach((p: any) => { profileMap[p.user_id] = p; });

      const specMap: Record<string, string[]> = {};
      (specsRes.data ?? []).forEach((s: any) => {
        if (!specMap[s.mentor_id]) specMap[s.mentor_id] = [];
        specMap[s.mentor_id].push(s.term_id);
      });

      const allTermIds = [...new Set((specsRes.data ?? []).map((s: any) => s.term_id))];
      let termNameMap: Record<string, string> = {};
      if (allTermIds.length > 0) {
        const { data: terms } = await supabase.from("taxonomy_terms").select("id, name").in("id", allTermIds as string[]);
        terms?.forEach((t) => { termNameMap[t.id] = t.name; });
      }

      const reviewCountMap: Record<string, number> = {};
      (reviewsRes.data ?? []).forEach((r: any) => {
        reviewCountMap[r.mentor_id] = (reviewCountMap[r.mentor_id] || 0) + 1;
      });

      const ratingMap: Record<string, { sum: number; count: number }> = {};
      (sessionReviewsRes.data ?? []).forEach((r: any) => {
        if (!ratingMap[r.mentor_id]) ratingMap[r.mentor_id] = { sum: 0, count: 0 };
        ratingMap[r.mentor_id].sum += r.rating;
        ratingMap[r.mentor_id].count += 1;
      });

      return mentors.map((m: any) => {
        const profile = profileMap[m.user_id];
        const specIds = specMap[m.id] ?? [];
        const rating = ratingMap[m.id];
        const avgRating = rating ? Math.round((rating.sum / rating.count) * 10) / 10 : 0;
        return {
          id: m.id,
          full_name: profile?.full_name ?? "Mentor",
          avatar_url: profile?.avatar_url ?? null,
          bio: m.bio,
          years_experience: m.years_experience,
          languages: m.languages ?? [],
          is_independent: m.is_independent,
          specialization_ids: specIds,
          specialization_names: specIds.map((id: string) => termNameMap[id] ?? id.slice(0, 8)),
          approved_review_count: reviewCountMap[m.id] ?? 0,
          provider_name: null,
          average_rating: avgRating,
          session_review_count: rating?.count ?? 0,
        } as MentorDirectoryItem;
      });
    },
    staleTime: 5 * 60_000,
  });
}
