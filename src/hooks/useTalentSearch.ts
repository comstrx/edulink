/**
 * useTalentSearch — Canonical search engine for Talent Search.
 *
 * Implements SearchEngineReturn<TalentFilters, TeacherResult, SortOption>.
 * Self-contained hook: owns filter state, URL sync, sorting, pagination,
 * and server-side query logic.
 *
 * Sprint 7B — Intelligence Ranking integration.
 */
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRepository } from "@/intelligence/read-models/repositories/intelligence-read-models.repository";
import type { ReputationGraphLevel } from "@/reputation/types/reputation-graph.types";
import { fetchBatchReputation } from "@/reputation/batch/fetch-batch-reputation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { clampIdList, trackQueryPerf, STALE_TIMES, MAX_IN_FILTER_IDS } from "@/lib/performance-guardrails";
import { applyTeacherPublicFilters } from "@/lib/visibility-rules";
import {
  type TalentFilters,
  type SortOption,
  emptyFilters,
} from "@/components/talent-search/TalentSearchFilters";
import {
  type FilterFieldConfig,
  useUrlFilterSync,
} from "@/lib/url-filter-sync";
import type { SearchEngineReturn, SearchEngineOptions } from "@/lib/search-contract";
import { computeCandidateRankingScore, type RankingExplanation } from "@/intelligence/talent/ranking/candidate-ranking";
import type { TalentIntelligenceProfile, CredentialStrength, GrowthMomentum } from "@/intelligence/talent/types/talent-intelligence.types";

const PAGE_SIZE = 18;

/** Canonical teacher profile select columns */
const TEACHER_SELECT =
  "id, full_name, avatar_url, city, country, years_of_experience, availability_status, subject_ids, curriculum_ids, certification_ids, curriculum_experience_ids, nationality_id, country_id, city_id, region_id, language_ids, teaching_license_ids, grade_band_ids, visa_status_term_id, availability_status_term_id, availability_status_term_ids, work_arrangement_term_ids, employment_type_term_ids, profile_source";

function parseExpBucket(bucket: string): { min: number; max: number } | null {
  if (!bucket) return null;
  if (bucket === "0-2") return { min: 0, max: 2 };
  if (bucket === "3-5") return { min: 3, max: 5 };
  if (bucket === "6-10") return { min: 6, max: 10 };
  if (bucket === "10+") return { min: 10, max: 999 };
  return null;
}

// ── Internal URL state shape (filters + sort + search + page) ──

interface TalentUrlState extends TalentFilters {
  _sort: string;
  _q: string;
  _page: number;
}

const urlDefaults: TalentUrlState = {
  ...emptyFilters,
  _sort: "recommended",
  _q: "",
  _page: 0,
};

const urlConfig: FilterFieldConfig<TalentUrlState> = {
  arrayKeys: [
    "subjects", "curriculums", "gradeBands", "languages", "nationalities",
    "workArrangements", "employmentTypes", "availabilityStatuses", "certifications",
  ],
  stringKeys: ["regionId", "countryId", "cityId", "expBucket", "_sort", "_q"],
  boolKeys: ["nativeSpeaker", "willingToRelocate", "hasTeachingLicense", "verifiedOnly"],
  numberKeys: ["_page"],
  paramMap: {
    regionId: "region",
    countryId: "country",
    cityId: "city",
    subjects: "sub",
    curriculums: "cur",
    gradeBands: "gb",
    languages: "lang",
    nationalities: "nat",
    nativeSpeaker: "native",
    workArrangements: "wa",
    employmentTypes: "et",
    availabilityStatuses: "avail",
    willingToRelocate: "reloc",
    expBucket: "exp",
    certifications: "cert",
    hasTeachingLicense: "lic",
    verifiedOnly: "verified",
    _sort: "sort",
    _q: "q",
    _page: "page",
  },
  defaults: urlDefaults,
};

// ── Public API ──

/** Verification state map keyed by teacher ID */
export type VerificationMap = Record<string, { overallStatus: "none" | "partial" | "full"; verifiedCount: number; totalCount: number }>;

/** Lightweight reputation summary for search results — keyed by teacher ID */
export type ReputationMap = Record<string, {
  reputationScore: number;
  reputationLevel: ReputationGraphLevel;
  credentialCount: number;
  trainingCount: number;
}>;

/** Lightweight intelligence summary for search results — keyed by teacher ID */
export type IntelligenceMap = Record<string, {
  criScore: number;
  credentialStrength: CredentialStrength;
  growthMomentum: GrowthMomentum;
  verifiedSignalCount: number;
  pathwayCompletionCount: number;
  readinessLevel: string;
  rankingScore: number;
  rankingExplanation: RankingExplanation;
}>;

/** Convert a verification map entry to a VerifiedStateConsumptionResult for badge rendering */
export function toVerifiedResult(
  map: VerificationMap,
  teacherId: string,
): import("@/intelligence/consumption/types/intelligence-consumption.types").VerifiedStateConsumptionResult {
  const entry = map[teacherId];
  if (!entry) {
    return { status: "empty", data: null, metadata: { isStale: false, computedAt: null, engineVersion: null, freshnessStatus: "unknown", isInvalidated: false, isRecomputing: false } };
  }
  return {
    status: "ready",
    data: { overallStatus: entry.overallStatus, verifiedCount: entry.verifiedCount, totalCount: entry.totalCount, credentials: [] },
    metadata: { isStale: false, computedAt: new Date().toISOString(), engineVersion: "rule-v1", freshnessStatus: "fresh", isInvalidated: false, isRecomputing: false },
  };
}

export type UseTalentSearchReturn = SearchEngineReturn<TalentFilters, any, SortOption> & {
  /** Batch-fetched verification state for all result teachers */
  verificationMap: VerificationMap;
  /** Batch-fetched intelligence profiles for all result teachers */
  intelligenceMap: IntelligenceMap;
  /** Batch-fetched reputation summaries for all result teachers */
  reputationMap: ReputationMap;
};

export function useTalentSearch(options?: SearchEngineOptions<TalentFilters> & { excludeDemo?: boolean }): UseTalentSearchReturn {
  // ── Unified internal state ──
  const [state, setStateRaw] = useState<TalentUrlState>(() => ({
    ...emptyFilters,
    ...(options?.initialFilters ?? {}),
    _sort: "recommended",
    _q: "",
    _page: 0,
  }));

  const setState = useCallback((next: TalentUrlState) => setStateRaw(next), []);

  const enabled = options?.enabled !== false;

  // ── URL sync (bidirectional, self-contained) ──
  useUrlFilterSync(state, setState, urlConfig, { enabled });

  // ── Derived values ──
  const { _sort, _q, _page, ...filters } = state;
  const sortBy = (_sort as SortOption) || "recommended";
  const searchQuery = _q || "";
  const currentPage = Math.max(0, _page);

  // ── State setters with page reset ──
  const updateFilters = useCallback((partial: Partial<TalentFilters>) => {
    setStateRaw((prev) => ({ ...prev, ...partial, _page: 0 }));
  }, []);

  const setSortBy = useCallback((s: SortOption) => {
    setStateRaw((prev) => ({ ...prev, _sort: s, _page: 0 }));
  }, []);

  const setPage = useCallback((p: number) => {
    setStateRaw((prev) => ({ ...prev, _page: p }));
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setStateRaw((prev) => ({ ...prev, _q: q, _page: 0 }));
  }, []);

  const resetFilters = useCallback(() => {
    setStateRaw((prev) => ({
      ...emptyFilters,
      _sort: prev._sort,
      _q: "",
      _page: 0,
    }));
  }, []);

  // ── Debounced search ──
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // ── Query ──
  const { data, isLoading } = useQuery({
    queryKey: ["talent_search_unified", filters, sortBy, currentPage, debouncedSearch, enabled],
    enabled,
    staleTime: STALE_TIMES.searchResults,
    queryFn: () => trackQueryPerf("talent_search", async () => {
      // ── Verified filter: pre-fetch verified teacher IDs via repository ──
      let verifiedTeacherIds: string[] | null = null;
      if (filters.verifiedOnly) {
        const repo = getRepository();
        const rawIds = await repo.getVerifiedTeacherIds("full", MAX_IN_FILTER_IDS);
        verifiedTeacherIds = clampIdList(rawIds);
        if (verifiedTeacherIds.length === 0) {
          return { results: [], totalCount: 0, verificationMap: {} };
        }
      }

      let query = applyTeacherPublicFilters(
        supabase
          .from("teacher_profiles")
          .select(TEACHER_SELECT, { count: "exact" })
      );

      // ── Profile source filter: school hiring workspace excludes demo profiles ──
      if (options?.excludeDemo) {
        query = query.eq("profile_source", "auth");
      }

      // ── Location ──
      if (filters.regionId) query = query.eq("region_id", filters.regionId);
      if (filters.countryId) query = query.eq("country_id", filters.countryId);
      if (filters.cityId) query = query.eq("city_id", filters.cityId);

      // ── Teaching Context ──
      if (filters.subjects.length > 0) query = query.overlaps("subject_ids", filters.subjects);
      if (filters.curriculums.length > 0) query = query.overlaps("curriculum_ids", filters.curriculums);
      if (filters.gradeBands.length > 0) query = query.overlaps("grade_band_ids", filters.gradeBands);

      // ── International Profile ──
      if (filters.nationalities.length > 0) query = query.in("nationality_id", filters.nationalities);
      if (filters.languages.length > 0) query = query.overlaps("language_ids", filters.languages);

      // ── Work Preferences ──
      if (filters.availabilityStatuses.length > 0) {
        query = query.overlaps("availability_status_term_ids", filters.availabilityStatuses);
      }
      if (filters.workArrangements.length > 0) {
        query = query.overlaps("work_arrangement_term_ids", filters.workArrangements);
      }
      if (filters.employmentTypes.length > 0) {
        query = query.overlaps("employment_type_term_ids", filters.employmentTypes);
      }

      // ── Experience ──
      const expRange = parseExpBucket(filters.expBucket);
      if (expRange) {
        query = query.gte("years_of_experience", expRange.min);
        if (expRange.max < 999) query = query.lte("years_of_experience", expRange.max);
      }
      if (filters.certifications.length > 0) query = query.overlaps("certification_ids", filters.certifications);
      if (filters.hasTeachingLicense) query = query.not("teaching_license_ids", "eq", "{}");

      // ── Verified filter ──
      if (verifiedTeacherIds) {
        query = query.in("id", verifiedTeacherIds);
      }

      // ── Text search (server-side) ──
      // Search full_name directly; also resolve matching city/country taxonomy names
      // to their IDs so location-name search works without legacy free-text fields.
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.trim();

        // Pre-query taxonomy_terms for city/country names matching the search text
        const { data: matchingTerms } = await supabase
          .from("taxonomy_terms")
          .select("id, term_type_id")
          .ilike("name", `%${q}%`)
          .eq("is_active", true)
          .limit(50);

        // Separate matching term IDs by whether they could be city or country terms
        // We match against the teacher_profiles city_id and country_id columns
        const matchingTermIds = (matchingTerms ?? []).map((t) => t.id);

        if (matchingTermIds.length > 0) {
          // Build OR clause: name match OR location term ID match on city_id/country_id
          query = query.or(
            `full_name.ilike.%${q}%,city_id.in.(${matchingTermIds.join(",")}),country_id.in.(${matchingTermIds.join(",")})`
          );
        } else {
          query = query.or(`full_name.ilike.%${q}%`);
        }
      }

      // ── Sort ──
      switch (sortBy) {
        case "experienced":
          query = query.order("years_of_experience", { ascending: false, nullsFirst: false });
          break;
        case "updated":
          query = query.order("updated_at", { ascending: false });
          break;
        case "available":
          query = query.order("availability_status", { ascending: true }).order("updated_at", { ascending: false });
          break;
        case "intelligence":
          // For intelligence sort, use default DB ordering; re-rank client-side after fetching profiles
          query = query
            .order("is_featured", { ascending: false })
            .order("updated_at", { ascending: false });
          break;
        case "recommended":
        case "relevant":
        default:
          // Sort-ready: auth profiles rank before demo profiles when both exist
          query = query
            .order("profile_source", { ascending: true })
            .order("is_featured", { ascending: false })
            .order("availability_status", { ascending: true })
            .order("years_of_experience", { ascending: false, nullsFirst: false });
          break;
      }

      // ── Pagination ──
      const from = currentPage * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      const resultTeacherIds = (data ?? []).map((r: any) => r.id as string);

      // ── Batch-fetch verification snapshots for result teachers ──
      let verificationMap: VerificationMap = {};
      let intelligenceMap: IntelligenceMap = {};
      let reputationMap: ReputationMap = {};

      if (resultTeacherIds.length > 0) {
        // Fetch verification via repository + intelligence profiles + canonical reputation in parallel
        const repo = getRepository();
        const teacherExperience: Record<string, number | null> = {};
        for (const r of (data ?? []) as any[]) {
          teacherExperience[r.id] = r.years_of_experience ?? null;
        }
        const [verifiedBatch, intelRes, batchReputation] = await Promise.all([
          repo.getVerifiedStateForTeachers(resultTeacherIds),
          supabase
            .from("intelligence_talent_profiles")
            .select("teacher_id, cri_score, credential_strength, growth_momentum, verified_signal_count, pathway_completion_count, readiness_level, best_match_score, unresolved_gap_count, credential_verified_count, active_pathway_count, training_completion_count, credential_count")
            .in("teacher_id", resultTeacherIds),
          fetchBatchReputation(resultTeacherIds, teacherExperience),
        ]);

        for (const tid of resultTeacherIds) {
          const entry = verifiedBatch[tid];
          if (entry && entry.status !== "not_found") {
            verificationMap[tid] = {
              overallStatus: entry.data.overallStatus,
              verifiedCount: entry.data.verifiedCount,
              totalCount: entry.data.totalCount,
            };
          }
        }

        for (const p of intelRes.data ?? []) {
          const profile: TalentIntelligenceProfile = {
            teacherId: p.teacher_id,
            criScore: Number(p.cri_score) || 0,
            criDimensions: [],
            criJobId: null,
            verifiedSignalCount: p.verified_signal_count ?? 0,
            verifiedCompletionCount: 0,
            credentialCount: p.credential_count ?? 0,
            credentialVerifiedCount: p.credential_verified_count ?? 0,
            credentialStrength: (p.credential_strength ?? "none") as CredentialStrength,
            pathwayCompletionCount: p.pathway_completion_count ?? 0,
            activePathwayCount: p.active_pathway_count ?? 0,
            trainingCompletionCount: p.training_completion_count ?? 0,
            unresolvedGapCount: p.unresolved_gap_count ?? 0,
            gapCategories: [],
            bestMatchScore: p.best_match_score != null ? Number(p.best_match_score) : null,
            bestMatchJobId: null,
            hiringAdvantageSignals: [],
            growthMomentum: (p.growth_momentum ?? "inactive") as GrowthMomentum,
            readinessLevel: (p.readiness_level ?? "early") as any,
            intelligenceUpdatedAt: "",
            engineVersion: "",
          };
          const explanation = computeCandidateRankingScore(profile);
          intelligenceMap[p.teacher_id] = {
            criScore: profile.criScore,
            credentialStrength: profile.credentialStrength,
            growthMomentum: profile.growthMomentum,
            verifiedSignalCount: profile.verifiedSignalCount,
            pathwayCompletionCount: profile.pathwayCompletionCount,
            readinessLevel: profile.readinessLevel,
            rankingScore: explanation.totalScore,
            rankingExplanation: explanation,
          };
        }

        // ── Canonical reputation from batch adapter ──
        reputationMap = batchReputation;
      }

      // ── Intelligence re-rank: sort results by ranking score ──
      let finalResults = data ?? [];
      if (sortBy === "intelligence") {
        finalResults = [...finalResults].sort((a: any, b: any) => {
          const scoreA = intelligenceMap[a.id]?.rankingScore ?? 0;
          const scoreB = intelligenceMap[b.id]?.rankingScore ?? 0;
          return scoreB - scoreA;
        });
      }

      return { results: finalResults, totalCount: count ?? 0, verificationMap, intelligenceMap, reputationMap };
    }, { filters: filters as Record<string, unknown> }),
  });

  const results = data?.results ?? [];
  const totalCount = data?.totalCount ?? 0;
  const verificationMap = data?.verificationMap ?? {};
  const intelligenceMap = data?.intelligenceMap ?? {};
  const reputationMap = data?.reputationMap ?? {};
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return {
    filters: filters as TalentFilters,
    searchQuery,
    sortBy,
    currentPage,
    pageSize: PAGE_SIZE,
    results,
    totalCount,
    totalPages,
    isLoading,
    verificationMap,
    intelligenceMap,
    reputationMap,
    updateFilters,
    setSearchQuery,
    setSortBy,
    setPage,
    resetFilters,
  };
}
