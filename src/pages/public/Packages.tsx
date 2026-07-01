import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TrainingPackageCard from "@/components/training/TrainingPackageCard";
import TrainingCatalogSkeleton from "@/components/training/TrainingCatalogSkeleton";
import TrainingResultsHeader from "@/components/training/TrainingResultsHeader";
import FilterChipBar from "@/components/filters/FilterChipBar";
import SearchPagination from "@/components/discovery/SearchPagination";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import TaxonomyMultiSelect from "@/components/taxonomy/TaxonomyMultiSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PackageOpen } from "lucide-react";
import TrainingContextSwitch from "@/components/training/TrainingContextSwitch";
import TrainingModeStrip from "@/components/training/TrainingModeStrip";
import { useTrainingContext } from "@/hooks/useTrainingContext";
import PublicTrainingSubNav from "@/components/training/PublicTrainingSubNav";
import { useTrainingSearch, TRAINING_SORT_OPTIONS } from "@/hooks/useTrainingSearch";
import { useFilterChipBuilder } from "@/hooks/useFilterChipBuilder";

const Packages = () => {
  const { user, roles } = useAuth();
  const { t } = useLanguage();
  const { context, setContext } = useTrainingContext();

  const engine = useTrainingSearch({ type: "package", pageSize: 4 });

  const isTeacher = roles.includes("teacher");
  const isSchoolOrAdmin = roles.includes("school_admin") || roles.includes("school_recruiter") || roles.includes("school_academic_lead") || roles.includes("admin");

  const allFilterIds = [
    engine.filters.competencyDomainId,
    engine.filters.gradeBandId,
    engine.filters.curriculumId,
    engine.filters.subjectId,
    engine.filters.learningFormatId,
    engine.filters.trainingLevelId,
    ...engine.filters.skills,
  ].filter(Boolean);

  const { singleChip, arrayChips } = useFilterChipBuilder(allFilterIds);

  const chips = [
    singleChip(engine.filters.competencyDomainId, { competencyDomainId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.curriculumId, { curriculumId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.subjectId, { subjectId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.gradeBandId, { gradeBandId: "" }, engine.filters, engine.updateFilters),
    ...arrayChips(engine.filters.skills, "skills", engine.filters, engine.updateFilters),
    singleChip(engine.filters.learningFormatId, { learningFormatId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.trainingLevelId, { trainingLevelId: "" }, engine.filters, engine.updateFilters),
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  return (
    <div>
      <PublicTrainingSubNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("packages.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("packages.subtitle")}</p>
        </div>

        <TrainingContextSwitch value={context} onChange={setContext} />
        <TrainingModeStrip context={context} activePage="packages" />

        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <aside className="space-y-4">
            <TaxonomySingleSelect domainKey="competency_domains" value={engine.filters.competencyDomainId} onChange={(v) => engine.updateFilters({ competencyDomainId: v })} label={t("tax.competencyDomain")} />
            <TaxonomySingleSelect domainKey="curriculums" value={engine.filters.curriculumId} onChange={(v) => engine.updateFilters({ curriculumId: v })} label={t("tax.curriculum")} />
            <TaxonomySingleSelect domainKey="subjects" value={engine.filters.subjectId} onChange={(v) => engine.updateFilters({ subjectId: v })} label={t("tax.subject")} />
            <TaxonomySingleSelect domainKey="grade_bands" value={engine.filters.gradeBandId} onChange={(v) => engine.updateFilters({ gradeBandId: v })} label={t("tax.gradeBand")} />
            <TaxonomyMultiSelect domainKey="skills" values={engine.filters.skills} onChange={(v) => engine.updateFilters({ skills: v })} label={t("tax.skills")} />
            <TaxonomySingleSelect domainKey="learning_formats" value={engine.filters.learningFormatId} onChange={(v) => engine.updateFilters({ learningFormatId: v })} label={t("tax.learningFormat")} />
            <TaxonomySingleSelect domainKey="training_levels" value={engine.filters.trainingLevelId} onChange={(v) => engine.updateFilters({ trainingLevelId: v })} label={t("tax.trainingLevel")} />
            <Button variant="outline" size="sm" className="w-full" onClick={engine.resetFilters}>{t("courses.resetFilters")}</Button>
          </aside>

          <section className="space-y-4">
            <TrainingResultsHeader
              totalCount={engine.totalCount}
              currentPage={engine.currentPage}
              pageSize={engine.pageSize}
              searchQuery={engine.searchQuery}
              sortBy={engine.sortBy}
              sortOptions={TRAINING_SORT_OPTIONS}
              onSearchChange={engine.setSearchQuery}
              onSortChange={engine.setSortBy}
              itemLabel="packages"
            />

            <FilterChipBar chips={chips} onClearAll={engine.resetFilters} clearLabel="Clear all" />

            {engine.isLoading ? (
              <TrainingCatalogSkeleton count={4} variant="package" />
            ) : engine.results.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center space-y-3">
                  <PackageOpen className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">{t("packages.noPackages")}</p>
                  <Button variant="outline" size="sm" onClick={engine.resetFilters}>Reset Filters</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {engine.results.map((p) => (
                  <TrainingPackageCard
                    key={p.id}
                    item={{
                      id: p.id,
                      title: p.title,
                      coursesCount: 0,
                      price: "",
                      segment: p.training_level_name ?? "",
                      bestFor: p.audience ?? "",
                    }}
                    labels={{ includes: t("packages.includes"), courses: t("packages.courses"), bestFor: t("packages.bestFor") }}
                    meta={
                      context === "teacher" ? (
                        <p className="text-xs text-muted-foreground">{p.short_description}</p>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-foreground">{t("packages.teamPlan")}</p>
                          <p className="text-xs text-muted-foreground">{t("packages.adminTracking")}</p>
                        </>
                      )
                    }
                    actions={
                      !user ? (
                        <Button asChild size="sm" variant="secondary"><Link to="/login">{context === "teacher" ? t("packages.loginEnroll") : t("packages.loginSchool")}</Link></Button>
                      ) : context === "teacher" && isTeacher ? (
                        <Button asChild size="sm" variant="secondary"><Link to="/login">{t("packages.goToLearning")}</Link></Button>
                      ) : context === "teacher" && isSchoolOrAdmin ? (
                        <p className="text-xs text-muted-foreground italic">{t("packages.switchSchool")}</p>
                      ) : context === "school" && isSchoolOrAdmin ? (
                        <div className="space-y-1">
                          <Button asChild size="sm" variant="secondary"><Link to="/pricing">{t("packages.requestPlan")}</Link></Button>
                          <Button asChild size="sm" variant="ghost" className="text-xs"><Link to="/login">{t("packages.goTrainingDashboard")}</Link></Button>
                        </div>
                      ) : context === "school" && isTeacher ? (
                        <p className="text-xs text-muted-foreground italic">{t("packages.switchTeacher")}</p>
                      ) : (
                        <Button asChild size="sm" variant="secondary"><Link to="/pricing">{t("packages.requestPlan")}</Link></Button>
                      )
                    }
                  />
                ))}
              </div>
            )}

            <SearchPagination
              currentPage={engine.currentPage}
              totalPages={engine.totalPages}
              isLoading={engine.isLoading}
              onPageChange={engine.setPage}
            />
          </section>
        </div>

        <p className="text-xs text-muted-foreground text-center">{t("packages.pricingNote")}</p>
      </div>
    </div>
  );
};

export default Packages;
