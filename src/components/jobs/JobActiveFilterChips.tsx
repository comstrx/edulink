import FilterChipBar from "@/components/filters/FilterChipBar";
import type { FilterChip } from "@/hooks/useFilterChipBuilder";
import { useFilterChipBuilder } from "@/hooks/useFilterChipBuilder";
import { useLanguage } from "@/contexts/LanguageContext";
import type { JobFilters } from "@/hooks/useJobFilterUrlSync";
import { emptyJobFilters } from "@/hooks/useJobFilterUrlSync";

interface Props {
  filters: JobFilters;
  onChange: (f: Partial<JobFilters>) => void;
}

const JobActiveFilterChips = ({ filters, onChange }: Props) => {
  const { t } = useLanguage();

  const allIds = [
    ...filters.subjects,
    ...filters.curriculums,
    ...filters.gradeBands,
    ...filters.employmentTypes,
    ...filters.workArrangements,
    ...filters.certifications,
    ...(filters.regionId ? [filters.regionId] : []),
    ...(filters.countryId ? [filters.countryId] : []),
    ...(filters.cityId ? [filters.cityId] : []),
    ...(filters.roleCategoryId ? [filters.roleCategoryId] : []),
    ...(filters.roleTypeId ? [filters.roleTypeId] : []),
    ...(filters.schoolTypeId ? [filters.schoolTypeId] : []),
    ...(filters.seniorityLevelId ? [filters.seniorityLevelId] : []),
    ...(filters.languageLevelId ? [filters.languageLevelId] : []),
  ];

  const { arrayChips, singleChip } = useFilterChipBuilder(allIds);
  const chips: FilterChip[] = [];

  // Location chips (cascading)
  const loc = [
    singleChip(filters.regionId, { regionId: "", countryId: "", cityId: "" }, filters, onChange),
    singleChip(filters.countryId, { countryId: "", cityId: "" }, filters, onChange),
    singleChip(filters.cityId, { cityId: "" }, filters, onChange),
  ];

  // Role chips (cascading)
  const role = [
    singleChip(filters.roleCategoryId, { roleCategoryId: "", roleTypeId: "" }, filters, onChange),
    singleChip(filters.roleTypeId, { roleTypeId: "" }, filters, onChange),
  ];

  // Single-select taxonomy chips
  const singles = [
    singleChip(filters.schoolTypeId, { schoolTypeId: "" }, filters, onChange),
    singleChip(filters.seniorityLevelId, { seniorityLevelId: "" }, filters, onChange),
    singleChip(filters.languageLevelId, { languageLevelId: "" }, filters, onChange),
  ];

  chips.push(
    ...loc.filter(Boolean) as FilterChip[],
    ...role.filter(Boolean) as FilterChip[],
    ...singles.filter(Boolean) as FilterChip[],
    ...arrayChips(filters.subjects, "subjects", filters, onChange),
    ...arrayChips(filters.curriculums, "curriculums", filters, onChange),
    ...arrayChips(filters.gradeBands, "gradeBands", filters, onChange),
    ...arrayChips(filters.employmentTypes, "employmentTypes", filters, onChange),
    ...arrayChips(filters.workArrangements, "workArrangements", filters, onChange),
    ...arrayChips(filters.certifications, "certifications", filters, onChange),
  );

  // Boolean/Special chips
  if (filters.visaSponsorshipFilter !== "any") {
    const label = filters.visaSponsorshipFilter === "yes"
      ? t("jobs.chip.visaSponsored")
      : t("jobs.chip.noVisaRequired");
    chips.push({ label, onRemove: () => onChange({ ...filters, visaSponsorshipFilter: "any" }) });
  }
  if (filters.relocationSupport) {
    chips.push({ label: t("jobs.chip.relocationSupport"), onRemove: () => onChange({ ...filters, relocationSupport: false }) });
  }

  // Salary chips
  if (filters.salaryMin > 500 || filters.salaryMax < 7000) {
    const parts = [];
    if (filters.salaryMin > 500) parts.push(`${t("jobs.chip.salaryMin")}: ${filters.salaryMin} ${filters.salaryCurrency}`);
    if (filters.salaryMax < 7000) parts.push(`${t("jobs.chip.salaryMax")}: ${filters.salaryMax} ${filters.salaryCurrency}`);
    chips.push({ label: parts.join(", "), onRemove: () => onChange({ ...filters, salaryMin: 500, salaryMax: 7000 }) });
  }

  return (
    <FilterChipBar
      chips={chips}
      onClearAll={() => onChange(emptyJobFilters)}
      clearLabel={t("jobs.chip.clearAll")}
    />
  );
};

export default JobActiveFilterChips;
