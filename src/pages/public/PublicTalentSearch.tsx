import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import TaxonomyCompactSelect from "@/components/taxonomy/TaxonomyCompactSelect";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search, SearchX, RotateCcw, Lightbulb, Briefcase, Target } from "lucide-react";
import {
  type TalentFilters,
  type SortOption,
  emptyFilters,
} from "@/components/talent-search/TalentSearchFilters";
import TalentFilterSidebar from "@/components/talent-search/TalentFilterSidebar";
import ActiveFilterChips from "@/components/talent-search/ActiveFilterChips";
import TeacherResultCard from "@/components/talent-search/TeacherResultCard";
import PlanStatusBanner from "@/components/talent-search/PlanStatusBanner";
import TeacherPreviewDrawer from "@/components/talent-search/TeacherPreviewDrawer";
import QuickFilterPresets from "@/components/talent-search/QuickFilterPresets";
import { TeacherCardSkeletonList } from "@/components/talent-search/TeacherCardSkeleton";
import SearchPagination from "@/components/discovery/SearchPagination";
import { useTalentSearch, toVerifiedResult } from "@/hooks/useTalentSearch";
import { useSavedCandidates } from "@/hooks/useSavedCandidates";
import { useSchoolJobOptions, useJobMatchInput } from "@/hooks/useJobMatchContext";
import { matchTeacherToJob, type TeacherMatchInput, type MatchResult } from "@/lib/matching";
import { Badge } from "@/components/ui/badge";

type AppRole = "teacher" | "school_admin" | "school_recruiter" | "school_academic_lead" | "admin";

/** Build TeacherMatchInput from talent search result row */
function toTeacherMatchInput(t: any): TeacherMatchInput {
  return {
    country_id: t.country_id ?? null,
    city_id: t.city_id ?? null,
    region_id: t.region_id ?? null,
    visa_status_term_id: t.visa_status_term_id ?? null,
    employment_type_term_ids: t.employment_type_term_ids ?? null,
    work_arrangement_term_ids: t.work_arrangement_term_ids ?? null,
    language_ids: t.language_ids ?? null,
    grade_band_ids: t.grade_band_ids ?? null,
    subject_ids: t.subject_ids ?? null,
    curriculum_ids: t.curriculum_ids ?? null,
    certification_ids: t.certification_ids ?? null,
    years_of_experience: t.years_of_experience ?? null,
  };
}

const PublicTalentSearch = () => {
  const { user, roles } = useAuth();
  const { t } = useLanguage();

  const isTeacher = (roles as AppRole[]).includes("teacher");
  const isSchool = (roles as AppRole[]).some((r) =>
    ["school_admin", "school_recruiter", "school_academic_lead"].includes(r)
  );

  const [previewTeacher, setPreviewTeacher] = useState<any>(null);
  const [matchJobId, setMatchJobId] = useState<string | undefined>(undefined);

  // URL sync is self-contained inside the hook — no external wiring needed
  const engine = useTalentSearch();
  const { isSaved, toggleSave } = useSavedCandidates();

  // Job context for matching (school users only)
  const { data: schoolJobs = [] } = useSchoolJobOptions();
  const { data: jobMatchInput } = useJobMatchInput(matchJobId);

  // Compute match scores client-side for current results
  const matchResults = useMemo<Map<string, MatchResult>>(() => {
    const map = new Map<string, MatchResult>();
    if (!jobMatchInput || !engine.results.length) return map;
    for (const teacher of engine.results) {
      const input = toTeacherMatchInput(teacher);
      map.set(teacher.id, matchTeacherToJob(input, jobMatchInput));
    }
    return map;
  }, [engine.results, jobMatchInput]);

  // Sort results by match score when job context is active
  const sortedResults = useMemo(() => {
    if (!jobMatchInput || matchResults.size === 0) return engine.results;
    return [...engine.results].sort((a, b) => {
      const scoreA = matchResults.get(a.id)?.score ?? 0;
      const scoreB = matchResults.get(b.id)?.score ?? 0;
      return scoreB - scoreA;
    });
  }, [engine.results, matchResults, jobMatchInput]);

  if (isTeacher && !isSchool) {
    return <Navigate to="/jobs" replace />;
  }

  const handleFiltersChange = (f: TalentFilters) => {
    engine.updateFilters(f);
  };

  const selectedJobTitle = schoolJobs.find((j) => j.id === matchJobId)?.title;

  return (
    <>
      <title>Talent Search — Find Qualified Teachers | EduLink</title>
      <meta name="description" content="Search qualified teachers by subject, curriculum, certifications, and location. Browse educator profiles on EduLink." />

      {/* Page header */}
      <div className="border-b border-border/50 bg-gradient-to-b from-muted/25 to-background">
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-6">
          <div className="mb-6">
            <h1 className="text-lg font-bold text-foreground tracking-tight">Talent Search</h1>
            <p className="text-xs text-muted-foreground mt-1">Find qualified teachers by subject, curriculum, and credentials</p>
          </div>

          <div className="space-y-3.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                className="pl-10 h-10 text-sm bg-background border-border/60 shadow-sm focus-visible:ring-primary/20 rounded-md"
                placeholder="Search teachers by name, subject, skill, certification, or keyword"
                value={engine.searchQuery}
                onChange={(e) => { engine.setSearchQuery(e.target.value); }}
              />
            </div>

            {/* Job matching context — school users only */}
            {isSchool && schoolJobs.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Target className="h-3.5 w-3.5" />
                  Match against:
                </div>
                <Select
                  value={matchJobId ?? "__none__"}
                  onValueChange={(v) => setMatchJobId(v === "__none__" ? undefined : v)}
                >
                  <SelectTrigger className="w-[280px] h-8 text-xs border-border/60 bg-background shadow-sm">
                    <SelectValue placeholder="Select a job for matching" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">No job context</span>
                    </SelectItem>
                    {schoolJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{job.title}</span>
                          <Badge variant="outline" className="text-[9px] h-[14px] px-1 ml-1">
                            {job.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {matchJobId && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Target className="h-2.5 w-2.5" />
                    Matching active
                  </Badge>
                )}
              </div>
            )}

            <QuickFilterPresets
              filters={engine.filters}
              sort={engine.sortBy}
              onFiltersChange={handleFiltersChange}
              onSortChange={engine.setSortBy}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <TaxonomyCompactSelect domainKey="subjects" values={engine.filters.subjects} onChange={(v) => handleFiltersChange({ ...engine.filters, subjects: v })} label="Subject" placeholder="Any subject" />
              <TaxonomyCompactSelect domainKey="grade_bands" values={engine.filters.gradeBands} onChange={(v) => handleFiltersChange({ ...engine.filters, gradeBands: v })} label="Level" placeholder="Any level" />
              <TaxonomyCompactSelect domainKey="curriculums" values={engine.filters.curriculums} onChange={(v) => handleFiltersChange({ ...engine.filters, curriculums: v })} label="Curriculum" placeholder="Any curriculum" />
              <TaxonomySingleSelect domainKey="countries" value={engine.filters.countryId} onChange={(v) => handleFiltersChange({ ...engine.filters, countryId: v === "__clear__" ? "" : v, cityId: "" })} label="Country" placeholder="Any country" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 pt-4 pb-6">
        <PlanStatusBanner />
        <ActiveFilterChips filters={engine.filters} onChange={handleFiltersChange} />

        <div className="flex flex-col lg:flex-row gap-7 mt-4">
          <TalentFilterSidebar filters={engine.filters} onChange={handleFiltersChange} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-border/30">
              <p className="text-sm text-muted-foreground tabular-nums">
                {engine.totalCount > 0
                  ? `Showing ${engine.currentPage * engine.pageSize + 1}–${Math.min((engine.currentPage + 1) * engine.pageSize, engine.totalCount)} of ${engine.totalCount} teachers`
                  : `0 ${t("talent.teachersFound")}`}
                {matchJobId && selectedJobTitle && (
                  <span className="ml-1.5 text-primary font-medium">
                    · Matched to "{selectedJobTitle}"
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Sort by:</span>
                <Select value={engine.sortBy} onValueChange={(v) => engine.setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[150px] h-8 text-xs border-border/40 bg-background shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="recommended">Recommended</SelectItem>
                    <SelectItem value="relevant">Most Relevant</SelectItem>
                    <SelectItem value="intelligence">Intelligence Rank</SelectItem>
                    <SelectItem value="experienced">Most Experience</SelectItem>
                    <SelectItem value="available">Available Now</SelectItem>
                    <SelectItem value="updated">Recently Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {engine.isLoading ? (
              <TeacherCardSkeletonList />
            ) : engine.results.length === 0 ? (
              <div className="border border-border/50 rounded-lg bg-card">
                <div className="py-16 px-6 text-center space-y-5">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center">
                      <SearchX className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-foreground">No teachers match your filters</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Try adjusting your search criteria to find more qualified candidates.
                    </p>
                  </div>

                  <div className="max-w-sm mx-auto text-left space-y-2 pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5" />
                      Suggestions
                    </p>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        Try removing nationality filters to see more results
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        Expand your curriculum selection (e.g. add IB or American)
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        Include ESL/EFL teachers for English positions
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        Consider teachers who are &quot;Open to Opportunities&quot;
                      </li>
                    </ul>
                  </div>

                  <Button variant="outline" size="sm" className="gap-1.5 mt-2" onClick={() => engine.resetFilters()}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset All Filters
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  {sortedResults.map((teacher, idx) => (
                    <div
                      key={teacher.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "backwards" }}
                    >
                      <TeacherResultCard
                        teacher={teacher}
                        isGated={!user && idx >= 5}
                        onPreview={(t) => setPreviewTeacher(t)}
                        sortMode={engine.sortBy}
                        matchResult={matchResults.get(teacher.id) ?? null}
                        isSaved={isSaved(teacher.id)}
                        onToggleSave={toggleSave}
                        verifiedResult={toVerifiedResult(engine.verificationMap, teacher.id)}
                        intelligenceEntry={engine.intelligenceMap[teacher.id]}
                        reputationEntry={engine.reputationMap[teacher.id]}
                      />
                    </div>
                  ))}
                </div>

                <SearchPagination
                  currentPage={engine.currentPage}
                  totalPages={engine.totalPages}
                  isLoading={engine.isLoading}
                  onPageChange={engine.setPage}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <TeacherPreviewDrawer
        teacher={previewTeacher}
        open={!!previewTeacher}
        onOpenChange={(open) => { if (!open) setPreviewTeacher(null); }}
      />
    </>
  );
};

export default PublicTalentSearch;
