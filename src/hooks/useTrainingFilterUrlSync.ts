/**
 * useTrainingFilterUrlSync — Bidirectional sync between TrainingFilters and URL search params.
 * Delegates to the shared url-filter-sync factory.
 *
 * P2A Contract: Only approved filters are included.
 */
import {
  type FilterFieldConfig,
  filtersToSearchParams,
  searchParamsToFilters,
  useUrlFilterSync,
} from "@/lib/url-filter-sync";

export interface TrainingFilters {
  // Single-select taxonomy (P2A approved)
  competencyDomainId: string;
  gradeBandId: string;
  curriculumId: string;
  subjectId: string;
  learningFormatId: string;
  trainingLevelId: string;

  // Multi-select taxonomy (P2A approved)
  skills: string[];

  // UI state
  searchQuery: string;
  sortBy: string;
  currentPage: number;
}

export const emptyTrainingFilters: TrainingFilters = {
  competencyDomainId: "",
  gradeBandId: "",
  curriculumId: "",
  subjectId: "",
  learningFormatId: "",
  trainingLevelId: "",
  skills: [],
  searchQuery: "",
  sortBy: "recommended",
  currentPage: 0,
};

const config: FilterFieldConfig<TrainingFilters> = {
  arrayKeys: ["skills"],
  stringKeys: [
    "competencyDomainId", "gradeBandId", "curriculumId",
    "subjectId", "learningFormatId", "trainingLevelId",
    "searchQuery", "sortBy",
  ],
  boolKeys: [],
  numberKeys: ["currentPage"],
  paramMap: {
    competencyDomainId: "comp",
    gradeBandId: "grade",
    curriculumId: "cur",
    subjectId: "subject",
    learningFormatId: "format",
    trainingLevelId: "level",
    skills: "skill",
    searchQuery: "q",
    sortBy: "sort",
    currentPage: "page",
  },
  defaults: emptyTrainingFilters,
};

export function trainingFiltersToParams(filters: TrainingFilters): URLSearchParams {
  return filtersToSearchParams(filters, config);
}

export function paramsToTrainingFilters(params: URLSearchParams): TrainingFilters {
  return searchParamsToFilters(params, config);
}

export function useTrainingFilterUrlSync(
  filters: TrainingFilters,
  setFilters: (filters: TrainingFilters) => void,
  options?: { enabled?: boolean },
) {
  useUrlFilterSync(filters, setFilters, config, options);
}
