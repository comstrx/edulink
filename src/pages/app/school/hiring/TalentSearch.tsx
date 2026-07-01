import { useMemo } from "react";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaxonomyCompactSelect from "@/components/taxonomy/TaxonomyCompactSelect";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import { matchTeacherToJob, type JobMatchInput } from "@/lib/matching";
import TeacherResultCard from "@/components/talent-search/TeacherResultCard";
import TalentFilterSidebar from "@/components/talent-search/TalentFilterSidebar";
import ActiveFilterChips from "@/components/talent-search/ActiveFilterChips";
import TeacherPreviewDrawer from "@/components/talent-search/TeacherPreviewDrawer";
import QuickFilterPresets from "@/components/talent-search/QuickFilterPresets";
import { TeacherCardSkeletonList } from "@/components/talent-search/TeacherCardSkeleton";
import SearchPagination from "@/components/discovery/SearchPagination";
import { useTalentSearch, toVerifiedResult } from "@/hooks/useTalentSearch";
import { useSavedCandidates } from "@/hooks/useSavedCandidates";
import { type SortOption, emptyFilters } from "@/components/talent-search/TalentSearchFilters";
import {
  Search, Users, Briefcase, SearchX, ChevronLeft, ChevronRight, RotateCcw,
} from "lucide-react";
import { useState } from "react";


const SchoolTalentSearch = () => {
  const { t } = useLanguage();
  const { workspace } = useCurrentSchoolWorkspace();
  const [previewTeacher, setPreviewTeacher] = useState<any>(null);
  const [selectedJobId, setSelectedJobId] = useState("");

  // URL sync is self-contained inside the hook — no external wiring needed
  const engine = useTalentSearch({ excludeDemo: true });
  const { isSaved, toggleSave } = useSavedCandidates();

  // Fetch school's jobs for "Match against job" selector
  const schoolProfileId = workspace?.schoolId;

  const { data: schoolJobs } = useQuery({
    queryKey: ["school_jobs_for_match", schoolProfileId],
    enabled: !!schoolProfileId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("jobs" as any)
        .select("id, title, subject_term_ids, curriculum_term_ids, grade_band_term_ids, employment_type_term_ids, work_arrangement_term_ids, visa_status_term_ids, language_term_ids, language_level_term_id, certification_term_ids, country_term_id, city_term_id, region_term_id, experience_min, status")
        .eq("school_id", schoolProfileId!)
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const selectedJob: JobMatchInput | null = useMemo(() => {
    if (!selectedJobId || !schoolJobs) return null;
    const j = schoolJobs.find((j: any) => j.id === selectedJobId);
    if (!j) return null;
    return {
      country_term_id: j.country_term_id,
      city_term_id: j.city_term_id,
      region_term_id: j.region_term_id,
      visa_status_term_ids: j.visa_status_term_ids ?? [],
      employment_type_term_ids: j.employment_type_term_ids ?? [],
      work_arrangement_term_ids: j.work_arrangement_term_ids ?? [],
      language_term_ids: j.language_term_ids ?? [],
      language_level_term_id: j.language_level_term_id,
      grade_band_term_ids: j.grade_band_term_ids ?? [],
      subject_term_ids: j.subject_term_ids ?? [],
      curriculum_term_ids: j.curriculum_term_ids ?? [],
      certification_term_ids: j.certification_term_ids ?? [],
      experience_min: j.experience_min,
    };
  }, [selectedJobId, schoolJobs]);

  const handleFiltersChange = (f: typeof engine.filters) => {
    engine.updateFilters(f);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <SchoolBreadcrumb items={[
        { label: "Hiring", to: "/app/school/hiring/overview" },
        { label: "Talent Search" },
      ]} />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Search className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t("schoolTalent.title")}</h1>
        </div>
        <p className="text-muted-foreground text-sm">{t("schoolTalent.subtitle")}</p>
      </div>

      {/* Search bar + quick filters + primary filters */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder={t("schoolTalent.searchPlaceholder")}
            value={engine.searchQuery}
            onChange={(e) => engine.setSearchQuery(e.target.value)}
          />
        </div>

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

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-4">
          {/* Match against job — school-only feature */}
          {schoolJobs && schoolJobs.length > 0 && (
            <div className="space-y-1 pb-3 border-b">
              <Label className="flex items-center gap-1.5 text-xs">
                <Briefcase className="h-3 w-3" />
                Match against job
              </Label>
              <Select value={selectedJobId || "none"} onValueChange={(v) => setSelectedJobId(v === "none" ? "" : v)}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Select a job..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No job selected</SelectItem>
                  {schoolJobs.map((j: any) => (
                    <SelectItem key={j.id} value={j.id} className="text-xs">{j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <TalentFilterSidebar filters={engine.filters} onChange={handleFiltersChange} />
        </div>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Results header */}
          <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground tabular-nums">
                {engine.totalCount > 0
                  ? `Showing ${engine.currentPage * engine.pageSize + 1}–${Math.min((engine.currentPage + 1) * engine.pageSize, engine.totalCount)} of ${engine.totalCount} teachers`
                  : `0 ${t("talent.teachersFound")}`}
                {selectedJob && <span className="ml-1.5 text-primary text-xs">(matching enabled)</span>}
              </p>
            </div>
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

          <ActiveFilterChips filters={engine.filters} onChange={handleFiltersChange} />

          {engine.isLoading ? (
            <div className="mt-3">
              <TeacherCardSkeletonList />
            </div>
          ) : engine.results.length === 0 ? (
            <div className="border border-border/50 rounded-lg bg-card mt-3">
              <div className="py-16 px-6 text-center space-y-4">
                <SearchX className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">{t("schoolTalent.noResults")}</p>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => engine.resetFilters()}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Filters
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2.5 mt-3">
                {engine.results.map((teacher) => {
                  const matchResult = selectedJob
                    ? matchTeacherToJob(
                        {
                          country_id: teacher.country_id,
                          city_id: teacher.city_id,
                          region_id: teacher.region_id,
                          visa_status_term_id: teacher.visa_status_term_id,
                          employment_type_term_ids: teacher.employment_type_term_ids,
                          work_arrangement_term_ids: teacher.work_arrangement_term_ids,
                          language_ids: teacher.language_ids,
                          grade_band_ids: teacher.grade_band_ids,
                          subject_ids: teacher.subject_ids,
                          curriculum_ids: teacher.curriculum_ids,
                          certification_ids: teacher.certification_ids,
                          years_of_experience: teacher.years_of_experience,
                        },
                        selectedJob
                      )
                    : null;

                  return (
                    <TeacherResultCard
                      key={teacher.id}
                      teacher={teacher}
                      matchResult={matchResult}
                      onPreview={(t) => setPreviewTeacher(t)}
                      sortMode={engine.sortBy}
                      isSaved={isSaved(teacher.id)}
                      onToggleSave={toggleSave}
                      verifiedResult={toVerifiedResult(engine.verificationMap, teacher.id)}
                      intelligenceEntry={engine.intelligenceMap[teacher.id]}
                      reputationEntry={engine.reputationMap[teacher.id]}
                    />
                  );
                })}
              </div>

              {/* Pagination */}
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

      {/* Teacher Preview Drawer */}
      <TeacherPreviewDrawer
        teacher={previewTeacher}
        open={!!previewTeacher}
        onOpenChange={(open) => { if (!open) setPreviewTeacher(null); }}
      />
    </div>
  );
};

export default SchoolTalentSearch;
