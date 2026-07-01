import { useLanguage } from "@/contexts/LanguageContext";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";

interface QuickFiltersBarProps {
  roleCategoryId: string;
  onRoleCategoryChange: (v: string) => void;
  roleTypeId: string;
  onRoleTypeChange: (v: string) => void;
  /** First selected subject for quick-filter display (single-select UX on top bar) */
  subjectId: string;
  onSubjectChange: (v: string) => void;
  /** First selected employment type for quick-filter display */
  employmentTypeId: string;
  onEmploymentTypeChange: (v: string) => void;
}

const clearable = (handler: (v: string) => void) => (v: string) =>
  handler(v === "__clear__" ? "" : v);

const QuickFiltersBar = ({
  roleCategoryId,
  onRoleCategoryChange,
  roleTypeId,
  onRoleTypeChange,
  subjectId,
  onSubjectChange,
  employmentTypeId,
  onEmploymentTypeChange,
}: QuickFiltersBarProps) => {
  const { t } = useLanguage();

  return (
    <div className="rounded-xl bg-muted/50 border border-border/40 px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[140px] flex-1 max-w-[200px]">
          <TaxonomySingleSelect
            domainKey="role_categories"
            value={roleCategoryId}
            onChange={clearable(onRoleCategoryChange)}
            placeholder={t("jobs.quick.category") || "Job Category"}
            triggerClassName="h-9 text-sm rounded-lg"
          />
        </div>
        <div className="min-w-[140px] flex-1 max-w-[200px]">
          <TaxonomySingleSelect
            domainKey="role_families"
            value={roleTypeId}
            onChange={clearable(onRoleTypeChange)}
            placeholder={roleCategoryId ? (t("jobs.quick.role") || "Job Role") : (t("jobs.quick.selectCategoryFirst") || "Select category first")}
            parentId={roleCategoryId || undefined}
            requiresParent
            triggerClassName="h-9 text-sm rounded-lg"
          />
        </div>
        <div className="min-w-[140px] flex-1 max-w-[200px]">
          <TaxonomySingleSelect
            domainKey="subjects"
            value={subjectId}
            onChange={clearable(onSubjectChange)}
            placeholder={t("jobs.quick.subject") || "Subject"}
            triggerClassName="h-9 text-sm rounded-lg"
          />
        </div>
        <div className="min-w-[140px] flex-1 max-w-[200px]">
          <TaxonomySingleSelect
            domainKey="employment_types"
            value={employmentTypeId}
            onChange={clearable(onEmploymentTypeChange)}
            placeholder={t("jobs.filter.contractType") || "Contract Type"}
            triggerClassName="h-9 text-sm rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default QuickFiltersBar;
