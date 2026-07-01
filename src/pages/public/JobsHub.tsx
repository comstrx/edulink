import { useCallback, useState, useMemo } from "react";
import type { VisaSponsorshipFilter } from "@/components/jobs/JobFiltersContent";
import type { SalaryCurrency } from "@/components/jobs/SalaryRangeFilter";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Briefcase, SlidersHorizontal, Search } from "lucide-react";
import SmartSearchBar from "@/components/jobs/SmartSearchBar";
import JobsSubnav from "@/components/JobsSubnav";
import QuickFiltersBar from "@/components/jobs/QuickFiltersBar";
import JobFiltersContent from "@/components/jobs/JobFiltersContent";
import { JobCardSkeletonList } from "@/components/jobs/JobCardSkeleton";
import JobsTrustStrip from "@/components/jobs/JobsTrustStrip";
import JobCard, { type Job } from "@/components/jobs/JobCard";
import JobAlertCTA from "@/components/jobs/JobAlertCTA";
// RecommendedJobs removed — matchScore is not computed, so the section was always empty
import JobActiveFilterChips from "@/components/jobs/JobActiveFilterChips";
import SearchPagination from "@/components/discovery/SearchPagination";
import { useJobSearch } from "@/hooks/useJobSearch";
import { useSavedJobIds, useToggleSaveJob } from "@/hooks/useSavedJobs";
import { useTeacherProfileId } from "@/hooks/useTeacherProfileId";
import { useBatchMatchSnapshots } from "@/hooks/useBatchMatchSnapshots";
import { resolveMatchLabel } from "@/lib/match-labels";

const JobsHub = () => {
  const { user, roles } = useAuth();
  const { t } = useLanguage();

  const {
    filters,
    searchQuery,
    sortBy,
    currentPage,
    pageSize,
    updateFilters,
    clearFilters,
    setSearchQuery,
    setSortBy,
    setPage,
    results: allJobs,
    totalCount,
    totalPages,
    isLoading,
  } = useJobSearch();

  // ── Visible range (1-indexed for display) ──
  const rangeStart = totalCount === 0 ? 0 : currentPage * pageSize + 1;
  const rangeEnd = Math.min((currentPage + 1) * pageSize, totalCount);

  // ── UI state ──
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { savedJobIds } = useSavedJobIds();
  const toggleSaveMutation = useToggleSaveJob();

  const isTeacher = roles.includes("teacher");
  const isSchoolOrAdmin =
    roles.includes("school_admin") ||
    roles.includes("school_recruiter") ||
    roles.includes("school_academic_lead") ||
    roles.includes("admin");

  // ── Auth-aware batch match for teachers ──
  const { data: teacherProfileId } = useTeacherProfileId();
  const jobIds = useMemo(() => allJobs.map((j) => j.id), [allJobs]);
  const { data: matchMap } = useBatchMatchSnapshots(
    isTeacher ? (teacherProfileId ?? undefined) : undefined,
    isTeacher ? jobIds : []
  );

  const resolveFitLabel = useCallback((jobId: string): "Strong" | "Moderate" | "Developing" | null => {
    if (!matchMap) return null;
    const snap = matchMap[jobId];
    if (!snap) return null;
    return resolveMatchLabel(snap.score);
  }, [matchMap]);

  // ── Cascade handlers ──
  const handleRegionChange = (v: string) => {
    updateFilters({ regionId: v, countryId: "", cityId: "" });
  };
  const handleCountryChange = (v: string) => {
    updateFilters({ countryId: v, cityId: "" });
  };
  const handleCityChange = (v: string) => {
    updateFilters({ cityId: v });
  };
  const handleRoleCategoryChange = (v: string) => {
    updateFilters({ roleCategoryId: v, roleTypeId: "" });
  };


  const handleToggleSave = useCallback((jobId: string) => {
    toggleSaveMutation.mutate({ jobId, isSaved: savedJobIds.has(jobId) });
  }, [savedJobIds, toggleSaveMutation]);

  const navigate = useNavigate();
  const handleSelectJob = useCallback((job: Job) => {
    navigate(`/jobs/${job.id}`);
  }, [navigate]);


  // ── Computed ──
  const hasFilters = filters.countryId || filters.regionId || filters.cityId || filters.roleCategoryId || filters.roleTypeId || filters.schoolTypeId || filters.seniorityLevelId || filters.subjects.length > 0 || filters.curriculums.length > 0 || filters.gradeBands.length > 0 || filters.employmentTypes.length > 0 || filters.workArrangements.length > 0 || filters.languageLevelId || filters.certifications.length > 0 || filters.visaSponsorshipFilter !== "any" || filters.relocationSupport;

  const filterCount = [filters.countryId, filters.regionId, filters.cityId, filters.roleCategoryId, filters.roleTypeId, filters.schoolTypeId, filters.seniorityLevelId, filters.languageLevelId].filter(Boolean).length
    + filters.subjects.length + filters.curriculums.length + filters.gradeBands.length
    + filters.employmentTypes.length + filters.workArrangements.length + filters.certifications.length
    + [filters.visaSponsorshipFilter !== "any", filters.relocationSupport].filter(Boolean).length;

  // ── Quick filter helpers: bridge plural arrays to single-select quick bar ──
  const handleQuickSubjectChange = (v: string) => {
    updateFilters({ subjects: v ? [v] : [] });
  };
  const handleQuickEmploymentTypeChange = (v: string) => {
    updateFilters({ employmentTypes: v ? [v] : [] });
  };

  const filterHandlers = {
    onCountryChange: handleCountryChange,
    onRegionChange: handleRegionChange,
    onCityChange: handleCityChange,
    onRoleCategoryChange: handleRoleCategoryChange,
    onRoleTypeChange: (v: string) => updateFilters({ roleTypeId: v }),
    onSchoolTypeChange: (v: string) => updateFilters({ schoolTypeId: v }),
    onSeniorityLevelChange: (v: string) => updateFilters({ seniorityLevelId: v }),
    onSubjectsChange: (v: string[]) => updateFilters({ subjects: v }),
    onCurriculumsChange: (v: string[]) => updateFilters({ curriculums: v }),
    onGradeBandsChange: (v: string[]) => updateFilters({ gradeBands: v }),
    onEmploymentTypesChange: (v: string[]) => updateFilters({ employmentTypes: v }),
    onWorkArrangementsChange: (v: string[]) => updateFilters({ workArrangements: v }),
    onCertificationsChange: (v: string[]) => updateFilters({ certifications: v }),
    onVisaSponsorshipFilterChange: (v: VisaSponsorshipFilter) => updateFilters({ visaSponsorshipFilter: v }),
    onRelocationSupportChange: (v: boolean) => updateFilters({ relocationSupport: v }),
    onLanguageLevelChange: (v: string) => updateFilters({ languageLevelId: v }),
    onSalaryMinChange: (v: number) => updateFilters({ salaryMin: v }),
    onSalaryMaxChange: (v: number) => updateFilters({ salaryMax: v }),
    onSalaryCurrencyChange: (v: SalaryCurrency) => updateFilters({ salaryCurrency: v }),
  };



  return (
    <>
      <JobsSubnav />

      {/* Hero header with search + quick filters */}
      <div className="bg-gradient-to-b from-muted/60 to-background border-b">
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70 mb-1">{t("jobs.eyebrow")}</p>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("jobs.title")}</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">{t("jobs.desc1")}</p>
          </div>

          <div className="mt-4">
            <SmartSearchBar 
              value={searchQuery} 
              onChange={(value) => setSearchQuery(value)}
              onSuggestionSelect={(suggestion) => {
                if (!suggestion.termId) return;
                switch (suggestion.category) {
                  case "subject":
                    updateFilters({ subjects: [suggestion.termId] });
                    break;
                  case "curriculum":
                    updateFilters({ curriculums: [suggestion.termId] });
                    break;
                  case "location":
                    // Could be a country or city — set countryId as default
                    updateFilters({ countryId: suggestion.termId });
                    break;
                  case "role":
                    updateFilters({ roleCategoryId: suggestion.termId });
                    break;
                }
              }}
            />
          </div>

          <div className="mt-3">
            <QuickFiltersBar
              roleCategoryId={filters.roleCategoryId}
              onRoleCategoryChange={handleRoleCategoryChange}
              roleTypeId={filters.roleTypeId}
              onRoleTypeChange={(v) => updateFilters({ roleTypeId: v })}
              subjectId={filters.subjects[0] ?? ""}
              onSubjectChange={handleQuickSubjectChange}
              employmentTypeId={filters.employmentTypes[0] ?? ""}
              onEmploymentTypeChange={handleQuickEmploymentTypeChange}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex w-[280px] shrink-0 flex-col sticky top-20 self-start max-h-[calc(100vh-6rem)]">
            <div className="rounded-xl border border-border/40 bg-card px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between pb-2.5 mb-1 border-b border-border/30">
                <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {t("jobs.filters")} {filterCount > 0 && <span className="ml-1.5 inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{filterCount}</span>}
                </h2>
                {hasFilters && (
                  <Button variant="link" size="sm" onClick={clearFilters} className="text-[11px] h-auto p-0 text-destructive">{t("jobs.clearAll")}</Button>
                )}
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-10rem)] pr-1 -mr-1">
                <JobFiltersContent filters={filters} {...filterHandlers} />
              </div>
            </div>
          </aside>

          {/* Job list */}
          <div className="flex-1 min-w-0 max-w-[1100px]">
            {/* ── Results header block ── */}
            <div className="space-y-3 pb-4 mb-4 border-b border-border/40">
              {/* Row 1: count + sort */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {totalCount > 0
                      ? `Showing ${rangeStart}–${rangeEnd} of ${totalCount} jobs`
                      : `0 ${t("jobs.resultsCount") || "jobs found"}`}
                  </span>
                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-[11px] h-6 px-2 text-muted-foreground hover:text-destructive">
                      {t("jobs.clearAll") || "Clear all"}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">{t("jobs.sort.label") || "Sort by:"}</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs border-border/50 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevant">{t("jobs.sort.relevant")}</SelectItem>
                      <SelectItem value="recent">{t("jobs.sort.recent")}</SelectItem>
                      <SelectItem value="highest_paying">{t("jobs.sort.highestPaying") || "Highest Paying"}</SelectItem>
                      <SelectItem value="lowest_paying">{t("jobs.sort.lowestPaying") || "Lowest Paying"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: active filter chips */}
              <JobActiveFilterChips filters={filters} onChange={updateFilters} />
            </div>

            {/* ── Content below header ── */}
            <div className="space-y-3">
              {/* Job Alert CTA */}
              <JobAlertCTA />


              {/* Latest Jobs heading */}
              <div className="flex items-center gap-2 pt-1">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("jobs.latestJobs")}</h2>
              </div>

            {/* Job Cards */}
            {isLoading ? (
              <JobCardSkeletonList count={6} />
            ) : allJobs.length === 0 ? (
              <Card className="border-dashed border-border/50">
                <CardContent className="py-16 text-center space-y-5">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center">
                      <Search className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-foreground">
                      {t("jobs.empty.title")}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                      {t("jobs.empty.desc")}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    {(hasFilters || searchQuery) && (
                      <Button variant="outline" size="sm" onClick={() => { clearFilters(); setSearchQuery(""); }} className="gap-1.5">
                        {t("jobs.resetFilters")}
                      </Button>
                    )}
                    <Button asChild size="sm" className="gap-1.5">
                      <Link to="/jobs">{t("jobs.empty.explore") || "Explore Latest Jobs"}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {allJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isSaved={savedJobIds.has(job.id)}
                    onSelect={handleSelectJob}
                    onToggleSave={handleToggleSave}
                    isSchoolOrAdmin={isSchoolOrAdmin}
                    isTeacher={isTeacher}
                    isLoggedIn={!!user}
                    fitLabel={isTeacher ? resolveFitLabel(job.id) : null}
                  />
                ))}
                <SearchPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  isLoading={isLoading}
                  onPageChange={setPage}
                />
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile floating filter button + drawer */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg gap-2 px-6 h-12 text-sm">
              <SlidersHorizontal className="h-4 w-4" />
              {t("jobs.filters")}{filterCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-primary-foreground text-primary text-[11px] font-bold">
                  {filterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[88vh] flex flex-col rounded-t-2xl p-0">
            {/* Sticky header */}
            <div className="px-5 pt-4 pb-3 border-b border-border/40 shrink-0">
              <div className="w-10 h-1 rounded-full bg-border/60 mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <SheetTitle className="text-sm font-bold text-foreground">
                  {t("jobs.filters")}
                  {filterCount > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {filterCount} {t("jobs.filtersSelected")}
                    </span>
                  )}
                </SheetTitle>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7 px-2 text-destructive hover:text-destructive">
                    {t("jobs.clearAll")}
                  </Button>
                )}
              </div>
            </div>

            {/* Scrollable filter content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <JobFiltersContent filters={filters} {...filterHandlers} />
            </div>

            {/* Sticky footer actions */}
            <div className="shrink-0 border-t border-border/40 px-5 pt-3 pb-[env(safe-area-inset-bottom,12px)] bg-background flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 text-sm"
                onClick={() => { clearFilters(); setMobileFiltersOpen(false); }}
              >
                {t("jobs.reset")}
              </Button>
              <Button
                className="flex-1 h-11 text-sm font-semibold"
                onClick={() => setMobileFiltersOpen(false)}
              >
                {t("jobs.applyFilters")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <JobsTrustStrip />
    </>
  );
};

export default JobsHub;
