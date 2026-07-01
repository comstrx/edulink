import { Link } from "react-router-dom";
import TrainingCatalogSkeleton from "@/components/training/TrainingCatalogSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TrainingResultsHeader from "@/components/training/TrainingResultsHeader";
import FilterChipBar from "@/components/filters/FilterChipBar";
import SearchPagination from "@/components/discovery/SearchPagination";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import TaxonomyMultiSelect from "@/components/taxonomy/TaxonomyMultiSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Route, Milestone, BookOpen, Target } from "lucide-react";
import TrainingContextSwitch from "@/components/training/TrainingContextSwitch";
import TrainingModeStrip from "@/components/training/TrainingModeStrip";
import { useTrainingContext } from "@/hooks/useTrainingContext";
import PublicTrainingSubNav from "@/components/training/PublicTrainingSubNav";
import { useTrainingSearch, TRAINING_SORT_OPTIONS } from "@/hooks/useTrainingSearch";
import { useFilterChipBuilder } from "@/hooks/useFilterChipBuilder";

const Pathways = () => {
  const { user, roles } = useAuth();
  const { t } = useLanguage();
  const { context, setContext } = useTrainingContext();

  const engine = useTrainingSearch({ type: "pathway", pageSize: 4 });

  const isTeacher = roles.includes("teacher");
  const isSchoolOrAdmin = roles.includes("school_admin") || roles.includes("school_recruiter") || roles.includes("school_academic_lead") || roles.includes("admin");

  const allFilterIds = [
    engine.filters.competencyDomainId,
    engine.filters.gradeBandId,
    engine.filters.curriculumId,
    engine.filters.subjectId,
    ...engine.filters.skills,
  ].filter(Boolean);

  const { singleChip, arrayChips } = useFilterChipBuilder(allFilterIds);

  const chips = [
    singleChip(engine.filters.competencyDomainId, { competencyDomainId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.curriculumId, { curriculumId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.subjectId, { subjectId: "" }, engine.filters, engine.updateFilters),
    singleChip(engine.filters.gradeBandId, { gradeBandId: "" }, engine.filters, engine.updateFilters),
    ...arrayChips(engine.filters.skills, "skills", engine.filters, engine.updateFilters),
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  return (
    <div>
      <PublicTrainingSubNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("pathways.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("pathways.subtitle")}</p>
        </div>

        <TrainingContextSwitch value={context} onChange={setContext} />
        <TrainingModeStrip context={context} activePage="pathways" />

        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <aside className="space-y-4">
            <TaxonomySingleSelect domainKey="competency_domains" value={engine.filters.competencyDomainId} onChange={(v) => engine.updateFilters({ competencyDomainId: v })} label={t("tax.competencyDomain")} />
            <TaxonomySingleSelect domainKey="curriculums" value={engine.filters.curriculumId} onChange={(v) => engine.updateFilters({ curriculumId: v })} label={t("tax.curriculum")} />
            <TaxonomySingleSelect domainKey="subjects" value={engine.filters.subjectId} onChange={(v) => engine.updateFilters({ subjectId: v })} label={t("tax.subject")} />
            <TaxonomySingleSelect domainKey="grade_bands" value={engine.filters.gradeBandId} onChange={(v) => engine.updateFilters({ gradeBandId: v })} label={t("tax.gradeBand")} />
            <TaxonomyMultiSelect domainKey="skills" values={engine.filters.skills} onChange={(v) => engine.updateFilters({ skills: v })} label={t("tax.skills")} />
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
              itemLabel="pathways"
            />

            <FilterChipBar chips={chips} onClearAll={engine.resetFilters} clearLabel="Clear all" />

            {engine.isLoading ? (
              <TrainingCatalogSkeleton count={4} variant="pathway" />
            ) : engine.results.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center space-y-3">
                  <Route className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">{t("pathways.noPathways")}</p>
                  <Button variant="outline" size="sm" onClick={engine.resetFilters}>Reset Filters</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {engine.results.map((p) => {
                  const courseCount = p.required_course_ids?.length ?? 0;
                  return (
                    <Link key={p.id} to={`/training/${p.slug}`} className="group">
                      <Card className="h-full transition-shadow hover:shadow-md">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base group-hover:text-primary transition-colors">{p.title}</CardTitle>
                            <Badge variant="outline" className="shrink-0 text-xs">Pathway</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-2">{p.short_description}</p>

                          {/* Pathway stats row */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {p.milestone_count > 0 && (
                              <span className="flex items-center gap-1">
                                <Milestone className="h-3.5 w-3.5 text-primary" />
                                {p.milestone_count} {p.milestone_count === 1 ? "milestone" : "milestones"}
                              </span>
                            )}
                            {courseCount > 0 && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                                {courseCount} {courseCount === 1 ? "course" : "courses"}
                              </span>
                            )}
                            {p.cri_target && (
                              <span className="flex items-center gap-1">
                                <Target className="h-3.5 w-3.5 text-primary" />
                                CRI {p.cri_target}
                              </span>
                            )}
                            {p.duration && (
                              <span>{p.duration}</span>
                            )}
                          </div>

                          {/* Provider attribution */}
                          {p.provider_name && (
                            <div className="flex items-center gap-2">
                              {p.provider_logo_url && <img src={p.provider_logo_url} alt="" className="h-4 w-4 rounded object-cover" />}
                              <span className="text-xs text-muted-foreground">by {p.provider_name}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1">
                            {p.training_level_name && <Badge variant="secondary" className="text-xs">{p.training_level_name}</Badge>}
                            {p.learning_format_name && <Badge variant="secondary" className="text-xs">{p.learning_format_name}</Badge>}
                            {p.credential_eligible && <Badge className="text-xs">Credential Eligible</Badge>}
                          </div>

                          {/* CTA */}
                          <div>
                            {!user ? (
                              <Button size="sm" variant="secondary" className="pointer-events-none">{context === "teacher" ? t("pathways.loginEnroll") : t("pathways.loginSchool")}</Button>
                            ) : context === "teacher" && isTeacher ? (
                              <Button size="sm" variant="secondary" className="pointer-events-none">{t("pathways.goToLearning")}</Button>
                            ) : context === "school" && isSchoolOrAdmin ? (
                              <Button size="sm" variant="secondary" className="pointer-events-none">{t("pathways.deployToTeam")}</Button>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
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

        <p className="text-xs text-muted-foreground text-center">{t("pathways.criNote")}</p>
      </div>
    </div>
  );
};

export default Pathways;
