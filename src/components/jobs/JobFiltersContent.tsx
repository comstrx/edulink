import { useLanguage } from "@/contexts/LanguageContext";
import TaxonomyCompactSelect from "@/components/taxonomy/TaxonomyCompactSelect";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import SalaryRangeFilter, { type SalaryCurrency } from "@/components/jobs/SalaryRangeFilter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo } from "react";

export type VisaSponsorshipFilter = "any" | "yes" | "no";

export interface JobFiltersState {
  countryId: string;
  regionId: string;
  cityId: string;
  roleCategoryId: string;
  roleTypeId: string;
  schoolTypeId: string;
  seniorityLevelId: string;
  languageLevelId: string;
  // Multi-select arrays (aligned with TalentSearchFilters)
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

interface JobFiltersContentProps {
  filters: JobFiltersState;
  onCountryChange: (v: string) => void;
  onRegionChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onRoleCategoryChange: (v: string) => void;
  onRoleTypeChange: (v: string) => void;
  onSchoolTypeChange: (v: string) => void;
  onSeniorityLevelChange: (v: string) => void;
  onSubjectsChange: (v: string[]) => void;
  onCurriculumsChange: (v: string[]) => void;
  onGradeBandsChange: (v: string[]) => void;
  onEmploymentTypesChange: (v: string[]) => void;
  onWorkArrangementsChange: (v: string[]) => void;
  onCertificationsChange: (v: string[]) => void;
  onVisaSponsorshipFilterChange: (v: VisaSponsorshipFilter) => void;
  onRelocationSupportChange: (v: boolean) => void;
  onLanguageLevelChange: (v: string) => void;
  onSalaryMinChange: (v: number) => void;
  onSalaryMaxChange: (v: number) => void;
  onSalaryCurrencyChange: (v: SalaryCurrency) => void;
}

const hdr =
  "text-[13px] font-semibold text-foreground py-3 hover:no-underline";

const clearable = (handler: (v: string) => void) => (v: string) =>
  handler(v === "__clear__" ? "" : v);

const GCC_COUNTRY_NAMES = [
  "saudi arabia",
  "united arab emirates",
  "qatar",
  "kuwait",
  "oman",
  "bahrain",
];

const JobFiltersContent = ({
  filters,
  ...handlers
}: JobFiltersContentProps) => {
  const { t } = useLanguage();

  // Resolve country name for GCC auto-expand
  const { data: countryName } = useQuery({
    queryKey: ["taxonomy_term_name", filters.countryId],
    enabled: !!filters.countryId,
    queryFn: async () => {
      const { data } = await supabase
        .from("taxonomy_terms")
        .select("name")
        .eq("id", filters.countryId)
        .single();
      return data?.name ?? null;
    },
  });

  const isGccCountry = useMemo(() => {
    if (!countryName) return false;
    return GCC_COUNTRY_NAMES.includes(countryName.toLowerCase());
  }, [countryName]);

  const defaultOpen = useMemo(() => {
    const sections = ["location"];
    if (isGccCountry) sections.push("eligibility");
    return sections;
  }, [isGccCountry]);

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultOpen}
      key={isGccCountry ? "gcc" : "default"}
      className="w-full space-y-0.5"
    >
      {/* ── LOCATION ── */}
      <AccordionItem value="location" className="border-b border-border/30">
        <AccordionTrigger className={hdr}>
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 opacity-60" />
            {t("jobs.section.location") || "Location"}
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-2.5 pt-1 pb-3.5">
          <TaxonomySingleSelect
            domainKey="regions"
            value={filters.regionId}
            onChange={clearable(handlers.onRegionChange)}
            label={t("tax.region") || "Region"}
            placeholder={t("common.anyRegion") || "Any region"}
          />
          <TaxonomySingleSelect
            domainKey="countries"
            value={filters.countryId}
            onChange={clearable(handlers.onCountryChange)}
            label={t("tax.country") || "Country"}
            placeholder={t("jobs.quick.country") || "Any country"}
            parentId={filters.regionId || undefined}
          />
          <TaxonomySingleSelect
            domainKey="cities"
            value={filters.cityId}
            onChange={clearable(handlers.onCityChange)}
            label={t("tax.city") || "City"}
            placeholder={
              filters.countryId
                ? t("common.anyCity") || "Any city"
                : t("jobs.filter.selectCountryFirst") || "Select country first"
            }
            parentId={filters.countryId || undefined}
            requiresParent
          />
        </AccordionContent>
      </AccordionItem>

      {/* ── SCHOOL TYPE (standalone) ── */}
      <div className="border-b border-border/30 py-3 px-1 space-y-1">
        <TaxonomySingleSelect
          domainKey="school_types"
          value={filters.schoolTypeId}
          onChange={clearable(handlers.onSchoolTypeChange)}
          label={t("jobs.filter.schoolType") || "School Type"}
          placeholder={t("jobs.filter.anySchoolType") || "Any school type"}
        />
      </div>

      {/* ── CURRICULUM (multi-select) ── */}
      <div className="border-b border-border/30 py-3 px-1 space-y-1">
        <TaxonomyCompactSelect
          domainKey="curriculums"
          values={filters.curriculums}
          onChange={handlers.onCurriculumsChange}
          label={t("tax.curriculum") || "Curriculum"}
          placeholder={t("common.anyCurriculum") || "Any curriculum"}
        />
      </div>

      {/* ── SUBJECT (multi-select) ── */}
      <div className="border-b border-border/30 py-3 px-1 space-y-1">
        <TaxonomyCompactSelect
          domainKey="subjects"
          values={filters.subjects}
          onChange={handlers.onSubjectsChange}
          label={t("jobs.quick.subject") || "Subject"}
          placeholder={t("jobs.filter.anySubject") || "Any subject"}
        />
      </div>

      {/* ── GRADE LEVEL (multi-select) ── */}
      <div className="border-b border-border/30 py-3 px-1 space-y-1">
        <TaxonomyCompactSelect
          domainKey="grade_bands"
          values={filters.gradeBands}
          onChange={handlers.onGradeBandsChange}
          label={t("jobs.filter.gradeBand") || "Grade Level"}
          placeholder={t("jobs.filter.anyGradeBand") || "Any grade level"}
        />
      </div>

      {/* ── WORK ARRANGEMENT (multi-select) ── */}
      <div className="border-b border-border/30 py-3 px-1 space-y-1">
        <TaxonomyCompactSelect
          domainKey="work_arrangements"
          values={filters.workArrangements}
          onChange={handlers.onWorkArrangementsChange}
          label={t("jobs.filter.workArrangement") || "Work Arrangement"}
          placeholder={t("jobs.filter.anyArrangement") || "Any arrangement"}
        />
      </div>

      {/* ── EMPLOYMENT TYPE (multi-select) ── */}
      <div className="border-b border-border/30 py-3 px-1 space-y-1">
        <TaxonomyCompactSelect
          domainKey="employment_types"
          values={filters.employmentTypes}
          onChange={handlers.onEmploymentTypesChange}
          label={t("jobs.filter.contractType") || "Contract Type"}
          placeholder={t("jobs.filter.anyContractType") || "Any contract type"}
        />
      </div>

      {/* ── EXPERIENCE LEVEL (standalone) ── */}
      <div className="border-b border-border/30 py-3 px-1 space-y-1">
        <TaxonomySingleSelect
          domainKey="seniority_levels"
          value={filters.seniorityLevelId}
          onChange={clearable(handlers.onSeniorityLevelChange)}
          label={t("jobs.filter.seniorityLevel") || "Experience Level"}
          placeholder={t("jobs.filter.anySeniority") || "Any level"}
        />
      </div>

      {/* ── VISA SPONSORSHIP (standalone) ── */}
      <div className="border-b border-border/30 py-3 px-1 space-y-1">
        <Label className="text-[13px] font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 opacity-60" />
          {t("jobs.filter.visaSponsorship") || "Visa Sponsorship"}
        </Label>
        <Select
          value={filters.visaSponsorshipFilter}
          onValueChange={(v) =>
            handlers.onVisaSponsorshipFilterChange(v as VisaSponsorshipFilter)
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any" className="text-xs">
              {t("jobs.filter.visaAny") || "Any"}
            </SelectItem>
            <SelectItem value="yes" className="text-xs">
              {t("jobs.filter.visaYes") || "Yes — Sponsor provides visa"}
            </SelectItem>
            <SelectItem value="no" className="text-xs">
              {t("jobs.filter.visaNo") || "No — Visa not required"}
            </SelectItem>
          </SelectContent>
        </Select>
        {isGccCountry && (
          <p className="text-[10px] text-muted-foreground/70 flex items-start gap-1 mt-0.5">
            <Info className="h-3 w-3 shrink-0 mt-0.5" />
            {t("jobs.filter.gccNote") || "Important for GCC roles."}
          </p>
        )}
      </div>

      {/* ── CERTIFICATION (multi-select) ── */}
      <div className="border-b border-border/30 py-3 px-1 space-y-1">
        <TaxonomyCompactSelect
          domainKey="certifications"
          values={filters.certifications}
          onChange={handlers.onCertificationsChange}
          label={t("jobs.filter.certifications") || "Certifications"}
          placeholder={t("jobs.filter.anyCertification") || "Any certification"}
        />
      </div>

      {/* ── SALARY RANGE (standalone) ── */}
      <div className="border-b border-border/30 py-3 px-1 space-y-1">
        <SalaryRangeFilter
          salaryMin={filters.salaryMin}
          salaryMax={filters.salaryMax}
          currency={filters.salaryCurrency}
          onSalaryMinChange={handlers.onSalaryMinChange}
          onSalaryMaxChange={handlers.onSalaryMaxChange}
          onCurrencyChange={handlers.onSalaryCurrencyChange}
        />
      </div>
    </Accordion>
  );
};

export default JobFiltersContent;
