/**
 * useFilterUrlSync — Bidirectional sync between TalentFilters and URL search params.
 * Delegates to the shared url-filter-sync factory.
 */
import { type TalentFilters, emptyFilters } from "@/components/talent-search/TalentSearchFilters";
import type { SortOption } from "@/components/talent-search/TalentSearchFilters";
import {
  type FilterFieldConfig,
  filtersToSearchParams,
  searchParamsToFilters,
  useUrlFilterSync,
} from "@/lib/url-filter-sync";

/** Internal shape that includes sort + query alongside filters */
interface TalentUrlState extends TalentFilters {
  _sort: string;
  _q: string;
}

const defaults: TalentUrlState = {
  ...emptyFilters,
  _sort: "recommended",
  _q: "",
};

const config: FilterFieldConfig<TalentUrlState> = {
  arrayKeys: [
    "subjects", "curriculums", "gradeBands", "languages", "nationalities",
    "workArrangements", "employmentTypes", "availabilityStatuses", "certifications",
  ],
  stringKeys: ["regionId", "countryId", "cityId", "expBucket", "_sort", "_q"],
  boolKeys: ["nativeSpeaker", "willingToRelocate", "hasTeachingLicense"],
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
    _sort: "sort",
    _q: "q",
  },
  defaults,
};

/** Legacy-compatible: convert filters + sort + q → URLSearchParams */
export function filtersToParams(filters: TalentFilters, sort: SortOption, q: string): URLSearchParams {
  return filtersToSearchParams<TalentUrlState>({ ...filters, _sort: sort || "recommended", _q: q.trim() }, config);
}

/** Legacy-compatible: convert URLSearchParams → filters + sort + q */
export function paramsToFilters(params: URLSearchParams): {
  filters: TalentFilters;
  sort: SortOption;
  q: string;
} {
  const state = searchParamsToFilters<TalentUrlState>(params, config);
  const { _sort, _q, ...filters } = state;
  return {
    filters: filters as TalentFilters,
    sort: (_sort as SortOption) || "recommended",
    q: _q || "",
  };
}

export function useFilterUrlSync(
  filters: TalentFilters,
  sort: SortOption,
  searchQuery: string,
  setFilters: (f: TalentFilters) => void,
  setSort: (s: SortOption) => void,
  setSearchQuery: (q: string) => void,
  options?: { enabled?: boolean }
) {
  // Merge into unified state for the shared hook
  const combined: TalentUrlState = {
    ...filters,
    _sort: sort || "recommended",
    _q: searchQuery,
  };

  const setCombined = (next: TalentUrlState) => {
    const { _sort, _q, ...f } = next;
    setFilters(f as TalentFilters);
    setSort((_sort as SortOption) || "recommended");
    if (_q) setSearchQuery(_q);
  };

  useUrlFilterSync(combined, setCombined, config, options);
}
