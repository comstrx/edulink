/**
 * useJobSearch — Unified search engine for Job Search.
 *
 * Implements SearchEngineReturn<JobFilters, Job, string>.
 * Mirrors the useTalentSearch pattern: unified internal URL state,
 * with domain filters separated from UI state (searchQuery, sortBy, currentPage).
 */
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { resolveTermNames } from "@/lib/taxonomy-api";
import { trackQueryPerf, STALE_TIMES } from "@/lib/performance-guardrails";
import {
  useJobFilterUrlSync,
  type JobFilters,
  type JobUrlState,
  emptyJobFilters,
  jobUrlDefaults,
} from "@/hooks/useJobFilterUrlSync";
import type { Job } from "@/components/jobs/JobCard";
import type { SearchEngineReturn, SearchEngineOptions } from "@/lib/search-contract";

const PAGE_SIZE = 12;

// ── Columns selected for list view (lightweight) ──
const LIST_COLUMNS = `
  id, title, description, status, created_at, deadline,
  country_term_id, city_term_id, region_term_id,
  role_category_term_id, role_type_term_id,
  school_type_term_id, seniority_level_term_id,
  subject_term_ids, curriculum_term_ids, grade_band_term_ids,
  employment_type_term_ids, work_arrangement_term_ids,
  certification_term_ids,
  visa_sponsorship, relocation_support, is_featured,
  salary_range, salary_min, salary_max, salary_currency, salary_period,
  experience_min, school_id, benefits
` as const;

/** Published filter: status='published' AND (deadline is null OR deadline >= today) */
function applyPublishedFilter(query: any) {
  const today = new Date().toISOString().split("T")[0];
  return query
    .eq("status", "published")
    .or(`deadline.is.null,deadline.gte.${today}`);
}

/** Collect all taxonomy term IDs from a list of raw jobs for batch resolution */
function collectTermIds(jobs: any[]): string[] {
  const ids = new Set<string>();
  for (const j of jobs) {
    if (j.country_term_id) ids.add(j.country_term_id);
    if (j.city_term_id) ids.add(j.city_term_id);
    if (j.region_term_id) ids.add(j.region_term_id);
    if (j.role_category_term_id) ids.add(j.role_category_term_id);
    if (j.role_type_term_id) ids.add(j.role_type_term_id);
    if (j.school_type_term_id) ids.add(j.school_type_term_id);
    if (j.seniority_level_term_id) ids.add(j.seniority_level_term_id);
    for (const arr of [
      j.subject_term_ids, j.curriculum_term_ids, j.grade_band_term_ids,
      j.employment_type_term_ids, j.work_arrangement_term_ids,
      j.certification_term_ids,
    ]) {
      if (Array.isArray(arr)) arr.forEach((id: string) => ids.add(id));
    }
  }
  return [...ids];
}

/** Transform a raw DB job row + resolved names into the Job card shape */
function toJobCard(raw: any, nameMap: Record<string, string>): Job {
  const resolve = (id: string | null) => (id ? nameMap[id] ?? "" : "");
  const resolveArr = (ids: string[] | null) => (ids ?? []).map((id) => nameMap[id]).filter(Boolean);

  const locationParts = [
    resolve(raw.city_term_id),
    resolve(raw.country_term_id),
  ].filter(Boolean);

  const subjects = resolveArr(raw.subject_term_ids);
  const curriculums = resolveArr(raw.curriculum_term_ids);
  const gradeBands = resolveArr(raw.grade_band_term_ids);
  const employmentTypes = resolveArr(raw.employment_type_term_ids);
  const workArrangements = resolveArr(raw.work_arrangement_term_ids);

  const salaryDisplay = (() => {
    if (raw.salary_min != null && raw.salary_max != null) {
      const cur = raw.salary_currency ?? "USD";
      const period = raw.salary_period ?? "monthly";
      const periodLabel = period === "monthly" ? "month" : period === "yearly" ? "year" : period;
      return `${raw.salary_min} – ${raw.salary_max} ${cur} / ${periodLabel}`;
    }
    return raw.salary_range ?? "";
  })();

  return {
    id: raw.id,
    title: raw.title,
    school: "",
    schoolId: raw.school_id,
    subject: subjects[0] ?? "",
    curriculum: curriculums[0] ?? "",
    gradeBand: gradeBands[0] ?? "",
    region: locationParts.join(", ") || "—",
    deliveryMode: workArrangements[0] ?? "",
    contractType: employmentTypes[0] ?? "",
    salary: salaryDisplay,
    salaryMin: raw.salary_min ?? null,
    salaryMax: raw.salary_max ?? null,
    salaryCurrency: raw.salary_currency ?? null,
    salaryPeriod: raw.salary_period ?? null,
    visa: raw.visa_sponsorship ?? false,
    tags: [...subjects, ...curriculums, ...gradeBands],
    smartTags: [],
    summary: raw.description?.slice(0, 200) ?? "",
    verified: raw.is_verified ?? false,
    accredited: false,
    internationalCurriculum: false,
    benefits: raw.benefits ?? [],
    experienceRequired: raw.experience_min ? `${raw.experience_min}+ Years` : "",
    deadline: raw.deadline ?? "",
    requirements: raw.requirements_text ?? [],
  };
}

// ── Public API ──

export type UseJobSearchReturn = SearchEngineReturn<JobFilters, Job> & {
  /** @deprecated Use resetFilters() */
  clearFilters: () => void;
  /** Whether more pages exist after the current page */
  hasMore: boolean;
};

export function useJobSearch(options?: SearchEngineOptions<JobFilters>): UseJobSearchReturn {
  // ── Unified internal state (domain filters + UI state) ──
  const [state, setStateRaw] = useState<JobUrlState>(() => ({
    ...jobUrlDefaults,
    ...(options?.initialFilters ?? {}),
  }));

  const setState = useCallback((next: JobUrlState) => setStateRaw(next), []);

  const enabled = options?.enabled !== false;

  // ── URL sync (bidirectional, self-contained) ──
  useJobFilterUrlSync(state, setState, { enabled });

  // ── Derived values: separate domain filters from UI state ──
  const { _q, _sort, _page, ...filters } = state;
  const searchQuery = _q || "";
  const sortBy = _sort || "relevant";
  const currentPage = Math.max(0, _page);

  // ── State setters with page reset ──
  const updateFilters = useCallback((partial: Partial<JobFilters>) => {
    setStateRaw((prev) => ({ ...prev, ...partial, _page: 0 }));
  }, []);

  const resetFilters = useCallback(() => {
    setStateRaw((prev) => ({
      ...emptyJobFilters,
      _sort: prev._sort,
      _q: "",
      _page: 0,
    }));
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setStateRaw((prev) => ({ ...prev, _q: q, _page: 0 }));
  }, []);

  const setSortBy = useCallback((s: string) => {
    setStateRaw((prev) => ({ ...prev, _sort: s, _page: 0 }));
  }, []);

  const setPage = useCallback((p: number) => {
    setStateRaw((prev) => ({ ...prev, _page: p }));
  }, []);

  // ── Debounced search ──
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // ── Query ──
  const offset = currentPage * PAGE_SIZE;

  const { data, isLoading } = useQuery({
    queryKey: ["job_search_unified", filters, sortBy, currentPage, debouncedSearch, enabled],
    enabled,
    staleTime: STALE_TIMES.searchResults,
    queryFn: () => trackQueryPerf("job_search", async () => {
      let query = supabase
        .from("jobs")
        .select(LIST_COLUMNS, { count: "exact" });

      // ── Sort ──
      if (sortBy === "highest_paying") {
        query = query.order("salary_max", { ascending: false, nullsFirst: false });
      } else if (sortBy === "lowest_paying") {
        query = query.order("salary_min", { ascending: true, nullsFirst: false });
      } else {
        query = query
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false });
      }

      query = query.range(offset, offset + PAGE_SIZE - 1);
      query = applyPublishedFilter(query);

      // ── Location ──
      if (filters.regionId) query = query.eq("region_term_id", filters.regionId);
      if (filters.countryId) query = query.eq("country_term_id", filters.countryId);
      if (filters.cityId) query = query.eq("city_term_id", filters.cityId);

      // ── Single-select taxonomy ──
      if (filters.roleCategoryId) query = query.eq("role_category_term_id", filters.roleCategoryId);
      if (filters.roleTypeId) query = query.eq("role_type_term_id", filters.roleTypeId);
      if (filters.schoolTypeId) query = query.eq("school_type_term_id", filters.schoolTypeId);
      if (filters.seniorityLevelId) query = query.eq("seniority_level_term_id", filters.seniorityLevelId);

      // ── Multi-select array overlap ──
      if (filters.subjects.length > 0) query = query.overlaps("subject_term_ids", filters.subjects);
      if (filters.curriculums.length > 0) query = query.overlaps("curriculum_term_ids", filters.curriculums);
      if (filters.gradeBands.length > 0) query = query.overlaps("grade_band_term_ids", filters.gradeBands);
      if (filters.employmentTypes.length > 0) query = query.overlaps("employment_type_term_ids", filters.employmentTypes);
      if (filters.workArrangements.length > 0) query = query.overlaps("work_arrangement_term_ids", filters.workArrangements);
      if (filters.certifications.length > 0) query = query.overlaps("certification_term_ids", filters.certifications);

      // ── Language level ──
      if (filters.languageLevelId) query = query.eq("language_level_term_id", filters.languageLevelId);

      // ── Boolean filters ──
      const visaFilter = filters.visaSponsorshipFilter;
      if (visaFilter === "yes") query = query.eq("visa_sponsorship", true);
      else if (visaFilter === "no") query = query.eq("visa_sponsorship", false);
      if (filters.relocationSupport) query = query.eq("relocation_support", true);

      // ── Salary ──
      if (filters.salaryMin > 500) query = query.gte("salary_min", filters.salaryMin);
      if (filters.salaryMax < 7000) query = query.lte("salary_max", filters.salaryMax);

      // ── Text search (server-side) ──
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.trim();
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      const rows = data ?? [];
      const termIds = collectTermIds(rows);
      const nameMap = termIds.length > 0 ? await resolveTermNames(termIds) : {};
      const jobs = rows.map((r: any) => toJobCard(r, nameMap));

      return {
        results: jobs,
        totalCount: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
      };
    }, { filters: filters as Record<string, unknown> }),
  });

  const results = data?.results ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const hasMore = (currentPage + 1) < totalPages;

  return {
    // ── Canonical contract ──
    filters: filters as JobFilters,
    searchQuery,
    sortBy,
    currentPage,
    pageSize: PAGE_SIZE,
    results,
    totalCount,
    totalPages,
    isLoading,
    updateFilters,
    setSearchQuery,
    setSortBy,
    setPage,
    resetFilters,

    // ── Extensions ──
    clearFilters: resetFilters,
    hasMore,
  };
}
