/**
 * useJobFilterUrlSync — Bidirectional sync between JobFilters and URL search params.
 * Delegates to the shared url-filter-sync factory.
 *
 * NOTE: JobFilters contains ONLY domain filters.
 * UI state (searchQuery, sortBy, currentPage) is managed by useJobSearch
 * via a unified internal URL state, mirroring the useTalentSearch pattern.
 */
import type { VisaSponsorshipFilter } from "@/components/jobs/JobFiltersContent";
import type { SalaryCurrency } from "@/components/jobs/SalaryRangeFilter";
import {
  type FilterFieldConfig,
  filtersToSearchParams,
  searchParamsToFilters,
  useUrlFilterSync,
} from "@/lib/url-filter-sync";

export interface JobFilters {
  // Location (single-select cascade)
  countryId: string;
  regionId: string;
  cityId: string;

  // Role (single-select cascade)
  roleCategoryId: string;
  roleTypeId: string;

  // Single-select taxonomy
  schoolTypeId: string;
  seniorityLevelId: string;
  languageLevelId: string;

  // Multi-select taxonomy arrays
  subjects: string[];
  curriculums: string[];
  gradeBands: string[];
  employmentTypes: string[];
  workArrangements: string[];
  certifications: string[];

  // Requirements
  visaSponsorshipFilter: VisaSponsorshipFilter;
  relocationSupport: boolean;

  // Salary
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: SalaryCurrency;
}

export const emptyJobFilters: JobFilters = {
  countryId: "",
  regionId: "",
  cityId: "",
  roleCategoryId: "",
  roleTypeId: "",
  schoolTypeId: "",
  seniorityLevelId: "",
  languageLevelId: "",
  subjects: [],
  curriculums: [],
  gradeBands: [],
  employmentTypes: [],
  workArrangements: [],
  certifications: [],
  visaSponsorshipFilter: "any",
  relocationSupport: false,
  salaryMin: 500,
  salaryMax: 7000,
  salaryCurrency: "USD",
};

/**
 * Internal unified URL state shape used by useJobSearch.
 * Combines domain filters with UI state for URL sync.
 */
export interface JobUrlState extends JobFilters {
  _q: string;
  _sort: string;
  _page: number;
}

export const jobUrlDefaults: JobUrlState = {
  ...emptyJobFilters,
  _q: "",
  _sort: "relevant",
  _page: 0,
};

export const jobUrlConfig: FilterFieldConfig<JobUrlState> = {
  arrayKeys: [
    "subjects", "curriculums", "gradeBands",
    "employmentTypes", "workArrangements", "certifications",
  ],
  stringKeys: [
    "countryId", "regionId", "cityId", "roleCategoryId", "roleTypeId",
    "schoolTypeId", "seniorityLevelId", "languageLevelId",
    "visaSponsorshipFilter", "salaryCurrency", "_q", "_sort",
  ],
  boolKeys: ["relocationSupport"],
  numberKeys: ["salaryMin", "salaryMax", "_page"],
  paramMap: {
    countryId: "country",
    regionId: "region",
    cityId: "city",
    roleCategoryId: "role-cat",
    roleTypeId: "role",
    schoolTypeId: "school-type",
    seniorityLevelId: "seniority",
    languageLevelId: "lang-level",
    subjects: "subject",
    curriculums: "curriculum",
    gradeBands: "grade",
    employmentTypes: "contract",
    workArrangements: "arrangement",
    certifications: "certs",
    visaSponsorshipFilter: "visa",
    relocationSupport: "relocation",
    salaryMin: "sal-min",
    salaryMax: "sal-max",
    salaryCurrency: "currency",
    _q: "q",
    _sort: "sort",
    _page: "page",
  },
  defaults: jobUrlDefaults,
};

export function jobFiltersToParams(filters: JobUrlState): URLSearchParams {
  return filtersToSearchParams(filters, jobUrlConfig);
}

export function paramsToJobFilters(params: URLSearchParams): JobUrlState {
  return searchParamsToFilters(params, jobUrlConfig);
}

export function useJobFilterUrlSync(
  state: JobUrlState,
  setState: (state: JobUrlState) => void,
  options?: { enabled?: boolean }
) {
  useUrlFilterSync(state, setState, jobUrlConfig, options);
}
