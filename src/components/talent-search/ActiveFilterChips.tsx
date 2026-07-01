import FilterChipBar from "@/components/filters/FilterChipBar";
import type { FilterChip } from "@/hooks/useFilterChipBuilder";
import { useFilterChipBuilder } from "@/hooks/useFilterChipBuilder";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TalentFilters } from "./TalentSearchFilters";
import { emptyFilters } from "./TalentSearchFilters";

interface Props {
  filters: TalentFilters;
  onChange: (f: TalentFilters) => void;
}

const EXP_LABELS: Record<string, string> = {
  "0-2": "0–2 Years",
  "3-5": "3–5 Years",
  "6-10": "6–10 Years",
  "10+": "10+ Years",
};

const ActiveFilterChips = ({ filters, onChange }: Props) => {
  const { t } = useLanguage();
  const allIds = [
    ...filters.subjects,
    ...filters.curriculums,
    ...filters.gradeBands,
    ...filters.languages,
    ...filters.nationalities,
    ...filters.workArrangements,
    ...filters.employmentTypes,
    ...filters.availabilityStatuses,
    ...filters.certifications,
    ...(filters.regionId ? [filters.regionId] : []),
    ...(filters.countryId ? [filters.countryId] : []),
    ...(filters.cityId ? [filters.cityId] : []),
  ];

  const { arrayChips, singleChip } = useFilterChipBuilder(allIds);
  const chips: FilterChip[] = [];

  // Location chips (cascading)
  const loc = [
    singleChip(filters.regionId, { regionId: "", countryId: "", cityId: "" }, filters, onChange),
    singleChip(filters.countryId, { countryId: "", cityId: "" }, filters, onChange),
    singleChip(filters.cityId, { cityId: "" }, filters, onChange),
  ];
  chips.push(...loc.filter(Boolean) as FilterChip[]);

  // Array-based taxonomy chips
  chips.push(
    ...arrayChips(filters.subjects, "subjects", filters, onChange),
    ...arrayChips(filters.curriculums, "curriculums", filters, onChange),
    ...arrayChips(filters.gradeBands, "gradeBands", filters, onChange),
    ...arrayChips(filters.languages, "languages", filters, onChange),
    ...arrayChips(filters.nationalities, "nationalities", filters, onChange),
    ...arrayChips(filters.workArrangements, "workArrangements", filters, onChange),
    ...arrayChips(filters.employmentTypes, "employmentTypes", filters, onChange),
    ...arrayChips(filters.availabilityStatuses, "availabilityStatuses", filters, onChange),
    ...arrayChips(filters.certifications, "certifications", filters, onChange),
  );

  // Boolean chips
  if (filters.nativeSpeaker) {
    chips.push({ label: t("tsearch.filter.nativeSpeaker"), onRemove: () => onChange({ ...filters, nativeSpeaker: false }) });
  }
  if (filters.willingToRelocate) {
    chips.push({ label: t("tsearch.filter.willingToRelocate"), onRemove: () => onChange({ ...filters, willingToRelocate: false }) });
  }
  if (filters.hasTeachingLicense) {
    chips.push({ label: t("tsearch.filter.teachingLicense"), onRemove: () => onChange({ ...filters, hasTeachingLicense: false }) });
  }

  // Non-taxonomy bucket
  if (filters.expBucket) {
    chips.push({
      label: EXP_LABELS[filters.expBucket] ?? `${filters.expBucket} yrs`,
      onRemove: () => onChange({ ...filters, expBucket: "" }),
    });
  }

  return (
    <FilterChipBar
      chips={chips}
      onClearAll={() => onChange(emptyFilters)}
    />
  );
};

export default ActiveFilterChips;
