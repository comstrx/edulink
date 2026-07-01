/**
 * @deprecated — LEGACY HOOK. Use `useJobSearch` for all job search needs.
 *
 * This hook is kept temporarily for backward-compatible imports
 * (e.g. usePublicJobDetail). The list search function `usePublicJobs`
 * is superseded by `useJobSearch` which provides self-contained URL sync,
 * standardized 0-indexed pagination, and the canonical filter object.
 *
 * Do NOT use `usePublicJobs` in new code.
 * The `usePublicJobDetail` export remains valid until migrated.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { resolveTermNames } from "@/lib/taxonomy-api";
import type { Job } from "@/components/jobs/JobCard";

// ── Columns selected for list view (lightweight) ──
const LIST_COLUMNS = `
  id, title, status, created_at, deadline,
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

// ── Columns for detail view (full) ──
const DETAIL_COLUMNS = `
  id, title, status, created_at, deadline, start_date,
  description, responsibilities, requirements_text, benefits,
  country_term_id, city_term_id, region_term_id,
  role_category_term_id, role_type_term_id,
  school_type_term_id, seniority_level_term_id,
  subject_term_ids, curriculum_term_ids, grade_band_term_ids,
  employment_type_term_ids, work_arrangement_term_ids,
  visa_status_term_ids, language_term_ids, language_level_term_id,
  certification_term_ids,
  visa_sponsorship, relocation_support, is_featured, is_verified,
  salary_range, experience_min, school_id
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
      j.visa_status_term_ids, j.language_term_ids, j.certification_term_ids,
    ]) {
      if (Array.isArray(arr)) arr.forEach((id: string) => ids.add(id));
    }
    if (j.language_level_term_id) ids.add(j.language_level_term_id);
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

  // Build salary display
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

export interface PublicJobFilters {
  // Single-select (location + role cascade)
  countryId?: string;
  cityId?: string;
  regionId?: string;
  roleCategoryId?: string;
  roleTypeId?: string;
  schoolTypeId?: string;
  seniorityLevelId?: string;

  // Multi-select arrays (aligned with TalentSearchFilters)
  subjects?: string[];
  curriculums?: string[];
  gradeBands?: string[];
  employmentTypes?: string[];
  workArrangements?: string[];
  certifications?: string[];

  // Boolean / other
  visaSponsorship?: boolean;
  relocationSupport?: boolean;
  searchQuery?: string;
  salaryMin?: number;
  salaryMax?: number;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

export interface PublicJobsResult {
  jobs: Job[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Fetch published jobs with optional filters and pagination.
 */
export function usePublicJobs(filters: PublicJobFilters = {}): { data: PublicJobsResult | undefined, isLoading: boolean, error: any } {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 12;
  const offset = (page - 1) * pageSize;
  
  // Debounce search query to avoid excessive server requests
  const debouncedSearchQuery = useDebouncedValue(filters.searchQuery || "", 300);

  return useQuery({
    queryKey: ["public_jobs", { ...filters, searchQuery: debouncedSearchQuery }],
    queryFn: async () => {
      let query = supabase
        .from("jobs")
        .select(LIST_COLUMNS, { count: "exact" });

      // Apply sorting
      if (filters.sortBy === "highest_paying") {
        query = query.order("salary_max", { ascending: false, nullsFirst: false });
      } else if (filters.sortBy === "lowest_paying") {
        query = query.order("salary_min", { ascending: true, nullsFirst: false });
      } else {
        query = query
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false });
      }

      query = query.range(offset, offset + pageSize - 1);
      query = applyPublishedFilter(query);

      // Location filters (single-select)
      if (filters.countryId) query = query.eq("country_term_id", filters.countryId);
      if (filters.cityId) query = query.eq("city_term_id", filters.cityId);
      if (filters.regionId) query = query.eq("region_term_id", filters.regionId);

      // Single-select taxonomy filters
      if (filters.roleCategoryId) query = query.eq("role_category_term_id", filters.roleCategoryId);
      if (filters.roleTypeId) query = query.eq("role_type_term_id", filters.roleTypeId);
      if (filters.schoolTypeId) query = query.eq("school_type_term_id", filters.schoolTypeId);
      if (filters.seniorityLevelId) query = query.eq("seniority_level_term_id", filters.seniorityLevelId);

      // Multi-select array overlap filters
      if (filters.subjects && filters.subjects.length > 0) {
        query = query.overlaps("subject_term_ids", filters.subjects);
      }
      if (filters.curriculums && filters.curriculums.length > 0) {
        query = query.overlaps("curriculum_term_ids", filters.curriculums);
      }
      if (filters.gradeBands && filters.gradeBands.length > 0) {
        query = query.overlaps("grade_band_term_ids", filters.gradeBands);
      }
      if (filters.employmentTypes && filters.employmentTypes.length > 0) {
        query = query.overlaps("employment_type_term_ids", filters.employmentTypes);
      }
      if (filters.workArrangements && filters.workArrangements.length > 0) {
        query = query.overlaps("work_arrangement_term_ids", filters.workArrangements);
      }
      if (filters.certifications && filters.certifications.length > 0) {
        query = query.overlaps("certification_term_ids", filters.certifications);
      }

      // Boolean filters
      if (filters.visaSponsorship !== undefined) query = query.eq("visa_sponsorship", filters.visaSponsorship);
      if (filters.relocationSupport) query = query.eq("relocation_support", true);

      // Salary filters
      if (filters.salaryMin != null) query = query.gte("salary_min", filters.salaryMin);
      if (filters.salaryMax != null) query = query.lte("salary_max", filters.salaryMax);

      // Text search filter (server-side with debouncing)
      if (debouncedSearchQuery.trim()) {
        query = query.ilike("title", `%${debouncedSearchQuery.trim()}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      const filtered = data ?? [];
      const termIds = collectTermIds(filtered);
      const nameMap = termIds.length > 0 ? await resolveTermNames(termIds) : {};
      const jobs = filtered.map((r: any) => toJobCard(r, nameMap));

      return {
        jobs,
        totalCount: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
        currentPage: page,
      } as PublicJobsResult;
    },
    staleTime: 60_000,
  });
}

/** Full job detail shape for /jobs/:id */
export interface JobDetail {
  id: string;
  title: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  salary: string;
  visa: boolean;
  relocationSupport: boolean;
  verified: boolean;
  featured: boolean;
  deadline: string;
  startDate: string;
  experienceMin: number | null;
  location: string;
  subject: string;
  curriculum: string;
  gradeBand: string;
  contractType: string;
  deliveryMode: string;
  schoolId: string;
  subjects: string[];
  curriculums: string[];
  gradeBands: string[];
  certifications: string[];
  languages: string[];
  languageLevel: string;
}

export function usePublicJobDetail(jobId: string | undefined) {
  return useQuery({
    queryKey: ["public_job_detail", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("jobs")
        .select(DETAIL_COLUMNS)
        .eq("id", jobId!)
        .eq("status", "published")
        .or(`deadline.is.null,deadline.gte.${today}`)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const termIds = collectTermIds([data]);
      const nameMap = termIds.length > 0 ? await resolveTermNames(termIds) : {};
      const resolve = (id: string | null) => (id ? nameMap[id] ?? "" : "");
      const resolveArr = (ids: string[] | null) => (ids ?? []).map((id) => nameMap[id]).filter(Boolean);

      const locationParts = [resolve(data.city_term_id), resolve(data.country_term_id)].filter(Boolean);

      const detail: JobDetail = {
        id: data.id,
        title: data.title,
        description: data.description ?? "",
        responsibilities: data.responsibilities ?? [],
        requirements: data.requirements_text ?? [],
        benefits: data.benefits ?? [],
        salary: data.salary_range ?? "",
        visa: data.visa_sponsorship ?? false,
        relocationSupport: data.relocation_support ?? false,
        verified: data.is_verified ?? false,
        featured: data.is_featured ?? false,
        deadline: data.deadline ?? "",
        startDate: data.start_date ?? "",
        experienceMin: data.experience_min,
        location: locationParts.join(", ") || "—",
        subject: resolveArr(data.subject_term_ids)[0] ?? "",
        curriculum: resolveArr(data.curriculum_term_ids)[0] ?? "",
        gradeBand: resolveArr(data.grade_band_term_ids)[0] ?? "",
        contractType: resolveArr(data.employment_type_term_ids)[0] ?? "",
        deliveryMode: resolveArr(data.work_arrangement_term_ids)[0] ?? "",
        schoolId: data.school_id,
        subjects: resolveArr(data.subject_term_ids),
        curriculums: resolveArr(data.curriculum_term_ids),
        gradeBands: resolveArr(data.grade_band_term_ids),
        certifications: resolveArr(data.certification_term_ids),
        languages: resolveArr(data.language_term_ids),
        languageLevel: resolve(data.language_level_term_id),
      };

      return detail;
    },
    staleTime: 60_000,
  });
}
