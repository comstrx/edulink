import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TrainingCourseCard from "@/components/training/TrainingCourseCard";
import TrainingCatalogSkeleton from "@/components/training/TrainingCatalogSkeleton";
import TrainingResultsHeader from "@/components/training/TrainingResultsHeader";
import FilterChipBar from "@/components/filters/FilterChipBar";
import SearchPagination from "@/components/discovery/SearchPagination";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import TaxonomyMultiSelect from "@/components/taxonomy/TaxonomyMultiSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { BookOpen } from "lucide-react";
import TrainingContextSwitch from "@/components/training/TrainingContextSwitch";
import TrainingModeStrip from "@/components/training/TrainingModeStrip";
import { useTrainingContext } from "@/hooks/useTrainingContext";
import PublicTrainingSubNav from "@/components/training/PublicTrainingSubNav";
import { useTrainingSearch, TRAINING_SORT_OPTIONS } from "@/hooks/useTrainingSearch";
import { useFilterChipBuilder } from "@/hooks/useFilterChipBuilder";

const Courses = () => {
  const { user, roles } = useAuth();
  const { t } = useLanguage();
  const { context, setContext } = useTrainingContext();

  const engine = useTrainingSearch({ type: "course", pageSize: 4 });

  const isTeacher = roles.includes("teacher");
  const isSchoolOrAdmin = roles.includes("school_admin") || roles.includes("school_recruiter") || roles.includes("school_academic_lead") || roles.includes("admin");

  // Collect all taxonomy IDs for chip resolution
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
    ...arrayChips(engine.filters.skills, "skills", engine.filters, engine.updateFilters),
    singleChip(engine.filters.gradeBandId, { gradeBandId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.curriculumId, { curriculumId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.subjectId, { subjectId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.learningFormatId, { learningFormatId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.trainingLevelId, { trainingLevelId: "" }, engine.filters, engine.updateFilters),
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  return (
    <div>
      <PublicTrainingSubNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("courses.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("courses.subtitle")}</p>
        </div>

        <TrainingContextSwitch value={context} onChange={setContext} />
        <TrainingModeStrip context={context} activePage="courses" />

        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          {/* Sidebar filters */}
          <aside className="space-y-4">
            <TaxonomySingleSelect domainKey="competency_domains" value={engine.filters.competencyDomainId} onChange={(v) => engine.updateFilters({ competencyDomainId: v })} label={t("tax.competencyDomain")} />
            <TaxonomyMultiSelect domainKey="skills" values={engine.filters.skills} onChange={(v) => engine.updateFilters({ skills: v })} label={t("tax.skills")} />
            <TaxonomySingleSelect domainKey="grade_bands" value={engine.filters.gradeBandId} onChange={(v) => engine.updateFilters({ gradeBandId: v })} label={t("tax.gradeBand")} />
            <TaxonomySingleSelect domainKey="curriculums" value={engine.filters.curriculumId} onChange={(v) => engine.updateFilters({ curriculumId: v })} label={t("tax.curriculum")} />
            <TaxonomySingleSelect domainKey="subjects" value={engine.filters.subjectId} onChange={(v) => engine.updateFilters({ subjectId: v })} label={t("tax.subject")} />
            <TaxonomySingleSelect domainKey="learning_formats" value={engine.filters.learningFormatId} onChange={(v) => engine.updateFilters({ learningFormatId: v })} label={t("tax.learningFormat")} />
            <TaxonomySingleSelect domainKey="training_levels" value={engine.filters.trainingLevelId} onChange={(v) => engine.updateFilters({ trainingLevelId: v })} label={t("tax.trainingLevel")} />
            <Button variant="outline" size="sm" className="w-full" onClick={engine.resetFilters}>{t("courses.resetFilters")}</Button>
          </aside>

          {/* Results column */}
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
              itemLabel="courses"
            />

            <FilterChipBar chips={chips} onClearAll={engine.resetFilters} clearLabel="Clear all" />

            {engine.isLoading ? (
              <TrainingCatalogSkeleton count={4} variant="course" />
            ) : engine.results.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center space-y-3">
                  <BookOpen className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">{t("courses.noCourses")}</p>
                  <Button variant="outline" size="sm" onClick={engine.resetFilters}>Reset Filters</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {engine.results.map((c) => (
                  <TrainingCourseCard
                    key={c.id}
                    item={{
                      id: c.id,
                      title: c.title,
                      slug: c.slug,
                      duration: c.duration ?? "",
                      competencyTags: [
                        c.training_level_name,
                        c.learning_format_name,
                      ].filter(Boolean) as string[],
                      certification: c.credential_eligible ? "Credential Eligible" : null,
                      providerName: c.provider_name,
                      providerSlug: c.provider_slug,
                      providerLogoUrl: c.provider_logo_url,
                    }}
                    meta={
                      context === "teacher" ? (
                        <p className="text-xs text-muted-foreground">{c.short_description}</p>
                      ) : (
                        <>
                          <p className="text-xs font-medium text-primary">{t("courses.teamImpact")}</p>
                          <p className="text-xs text-muted-foreground">{t("courses.assignable")}</p>
                        </>
                      )
                    }
                    actions={
                      !user ? (
                        <Button asChild size="sm" variant="secondary"><Link to="/login">{context === "teacher" ? t("courses.loginEnroll") : t("courses.loginSchool")}</Link></Button>
                      ) : context === "teacher" && isTeacher ? (
                        <Button asChild size="sm" variant="secondary"><Link to="/login">{t("courses.goToLearning")}</Link></Button>
                      ) : context === "teacher" && isSchoolOrAdmin ? (
                        <p className="text-xs text-muted-foreground italic">{t("courses.switchSchool")}</p>
                      ) : context === "school" && isSchoolOrAdmin ? (
                        <Button asChild size="sm" variant="secondary"><Link to="/login">{t("courses.assignDashboard")}</Link></Button>
                      ) : context === "school" && isTeacher ? (
                        <p className="text-xs text-muted-foreground italic">{t("courses.switchTeacher")}</p>
                      ) : null
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

        <p className="text-xs text-muted-foreground text-center">{t("courses.filterNote")}</p>
      </div>
    </div>
  );
};

export default Courses;
