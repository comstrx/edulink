import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { applySchoolProfileLegacyPublicFilters } from "@/lib/visibility-rules";
import { useQuery } from "@tanstack/react-query";
import { useSchoolFollows, useInvalidateSchoolFollows } from "@/hooks/useSchoolFollows";
import { Building, MapPin, GraduationCap, Briefcase, SearchX, SlidersHorizontal, ShieldCheck, Globe, Award, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import JobsSubnav from "@/components/JobsSubnav";
import { toast } from "sonner";
import { useTaxonomyNames } from "@/hooks/useTaxonomyNames";

interface SchoolRow {
  id: string;
  name: string | null;
  country_term_id: string | null;
  school_type_term_id: string | null;
  curriculum_term_ids: string[];
  onboarding_completed: boolean;
}

const SchoolsDiscovery = () => {
  const { t } = useLanguage();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [countryId, setCountryId] = useState("");
  const [schoolTypeId, setSchoolTypeId] = useState("");
  const [curriculumId, setCurriculumId] = useState("");
  const [hiringOnly, setHiringOnly] = useState(false);
  const [followedOnly, setFollowedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("most_jobs");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Fetch real school profiles
  const { data: schools, isLoading: schoolsLoading } = useQuery({
    queryKey: ["public-schools"],
    queryFn: async () => {
      const { data, error } = await applySchoolProfileLegacyPublicFilters(
        supabase
          .from("school_organizations")
          .select("id, name, country_term_id, school_type_term_id, curriculum_term_ids, onboarding_completed")
      )
        .order("name");
      if (error) throw error;
      return (data ?? []) as SchoolRow[];
    },
  });

  // Fetch job counts per school
  const { data: jobCounts } = useQuery({
    queryKey: ["public-school-job-counts"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("jobs")
        .select("school_id")
        .eq("status", "published")
        .or(`deadline.is.null,deadline.gte.${today}`);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        counts.set(row.school_id, (counts.get(row.school_id) ?? 0) + 1);
      }
      return counts;
    },
  });

  // Fetch recent jobs per school (up to 3 per school)
  const schoolIds = (schools ?? []).map((s) => s.id);
  const { data: recentJobs } = useQuery({
    queryKey: ["public-school-recent-jobs", schoolIds],
    enabled: schoolIds.length > 0,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, school_id")
        .eq("status", "published")
        .or(`deadline.is.null,deadline.gte.${today}`)
        .in("school_id", schoolIds.slice(0, 100))
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      const map = new Map<string, { id: string; title: string }[]>();
      for (const job of data ?? []) {
        const list = map.get(job.school_id) ?? [];
        if (list.length < 3) list.push({ id: job.id, title: job.title });
        map.set(job.school_id, list);
      }
      return map;
    },
  });

  // Resolve taxonomy names for display
  const allTermIds = useMemo(() => {
    const ids: string[] = [];
    for (const s of schools ?? []) {
      if (s.country_term_id) ids.push(s.country_term_id);
      if (s.school_type_term_id) ids.push(s.school_type_term_id);
      ids.push(...(s.curriculum_term_ids ?? []));
    }
    return [...new Set(ids)];
  }, [schools]);

  const { data: termNames } = useTaxonomyNames(allTermIds);
  const getName = (id: string | null) => (id && termNames ? termNames[id] ?? null : null);

  // Shared school follow state (query-driven, cross-page sync)
  const { followedSchoolIdSet: followedSchools } = useSchoolFollows();
  const invalidateFollows = useInvalidateSchoolFollows();

  const toggleFollow = async (schoolId: string, schoolName: string) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!roles.includes("teacher")) {
      toast.error("Only teachers can follow schools");
      return;
    }
    setFollowLoading(schoolId);
    const isFollowing = followedSchools.has(schoolId);
    if (isFollowing) {
      const { error } = await supabase.from("school_follows").delete().eq("teacher_user_id", user.id).eq("school_id", schoolId);
      if (error) { toast.error("Failed to unfollow"); setFollowLoading(null); return; }
      invalidateFollows();
      toast(t("schools.unfollowedToast").replace("{name}", schoolName));
    } else {
      const { error } = await supabase.from("school_follows").insert({ teacher_user_id: user.id, school_id: schoolId });
      if (error) { toast.error("Failed to follow school"); setFollowLoading(null); return; }
      invalidateFollows();
      toast(t("schools.followedToast").replace("{name}", schoolName), {
        action: {
          label: t("schools.viewFollowedSchools"),
          onClick: () => navigate("/app/teacher/saved-jobs"),
        },
      });
    }
    setFollowLoading(null);
  };

  // Build a lookup from country → regions and region → cities for client-side cascade filtering
  const filteredSchools = useMemo(() => {
    let list = (schools ?? []).map((s) => ({
      ...s,
      displayName: s.name ?? "Unnamed School",
      openJobs: jobCounts?.get(s.id) ?? 0,
      countryName: getName(s.country_term_id),
      schoolTypeName: getName(s.school_type_term_id),
      curriculumNames: (s.curriculum_term_ids ?? []).map((id) => getName(id)).filter(Boolean) as string[],
    }));

    // Apply taxonomy filters — country is direct, region/city are noted as client-side
    // NOTE: school_profiles doesn't have region/city term IDs natively.
    // Region/city filters are UI-present but only country actually filters until schema adds those columns.
    if (countryId) list = list.filter((s) => s.country_term_id === countryId);
    if (schoolTypeId) list = list.filter((s) => s.school_type_term_id === schoolTypeId);
    if (curriculumId) list = list.filter((s) => (s.curriculum_term_ids ?? []).includes(curriculumId));
    if (hiringOnly) list = list.filter((s) => s.openJobs > 0);
    if (followedOnly) list = list.filter((s) => followedSchools.has(s.id));

    if (sortBy === "most_jobs") list.sort((a, b) => b.openJobs - a.openJobs);
    else if (sortBy === "az") list.sort((a, b) => a.displayName.localeCompare(b.displayName));
    else if (sortBy === "recent") list.sort((a, b) => {
      // Sort by most recently posted job — schools with recent job activity first
      // Since we don't have created_at on school_profiles, use openJobs as proxy
      // but distinguish from "most_jobs" by preferring any hiring school first
      const aHiring = a.openJobs > 0 ? 1 : 0;
      const bHiring = b.openJobs > 0 ? 1 : 0;
      if (bHiring !== aHiring) return bHiring - aHiring;
      return a.displayName.localeCompare(b.displayName);
    });

    return list;
  }, [schools, jobCounts, countryId, schoolTypeId, curriculumId, hiringOnly, followedOnly, followedSchools, sortBy, termNames]);

  const handleCountryChange = (v: string) => { setCountryId(v); };
  const clearFilters = () => { setCountryId(""); setSchoolTypeId(""); setCurriculumId(""); setHiringOnly(false); setFollowedOnly(false); };
  const filterCount = [countryId, schoolTypeId, curriculumId, hiringOnly, followedOnly].filter(Boolean).length;

  const handleFollowedOnlyChange = (v: boolean) => {
    if (v && !user) {
      navigate("/login");
      return;
    }
    setFollowedOnly(v);
  };
  const hasFilters = filterCount > 0;

  const filterAccordion = (
    <Accordion type="multiple" defaultValue={["location"]} className="space-y-1 flex-1">
      <AccordionItem value="location" className="border-b-0">
        <AccordionTrigger className="text-xs font-medium uppercase tracking-wide text-muted-foreground py-2 hover:no-underline">
          {t("schools.filters.location")}
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-3">
          <TaxonomySingleSelect domainKey="countries" value={countryId} onChange={handleCountryChange} label={t("tax.country")} placeholder={t("common.anyCountry")} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="school" className="border-b-0">
        <AccordionTrigger className="text-xs font-medium uppercase tracking-wide text-muted-foreground py-2 hover:no-underline">
          {t("schools.filters.school")}
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-3">
          <TaxonomySingleSelect domainKey="school_types" value={schoolTypeId} onChange={setSchoolTypeId} label={t("tax.schoolType")} placeholder={t("common.anySchoolType")} />
          <TaxonomySingleSelect domainKey="curriculums" value={curriculumId} onChange={setCurriculumId} label={t("tax.curriculum")} placeholder={t("common.anyCurriculum")} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="saved" className="border-b-0">
        <AccordionTrigger className="text-xs font-medium uppercase tracking-wide text-muted-foreground py-2 hover:no-underline">
          {t("schools.filters.saved")}
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="flex items-center gap-2">
            <Switch id="followed-toggle" checked={followedOnly} onCheckedChange={handleFollowedOnlyChange} />
            <Label htmlFor="followed-toggle" className="text-sm cursor-pointer">{t("schools.filters.followedOnly")}</Label>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  useEffect(() => {
    document.title = "International Schools Directory – Browse & Compare | EduLink";

    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = "Explore international and local schools worldwide. Compare curricula, read profiles, and discover open teaching positions at top schools.";

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://edulink.com/schools";

    return () => {
      document.title = "EduLink";
    };
  }, []);

  return (
    <>
      <JobsSubnav />
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">{t("schools.eyebrow")}</p>
          <h1 className="text-3xl font-bold text-foreground">{t("schools.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("schools.subtitle")}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t("schools.helperNote")}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex lg:w-72 shrink-0 flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                {t("jobs.filters")} {filterCount > 0 && <span className="text-muted-foreground font-normal">({filterCount})</span>}
              </h2>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline">{t("schools.filters.clearAll")}</button>
              )}
            </div>
            {filterAccordion}
            <div className="sticky bottom-0 pt-3 pb-1 mt-3 border-t border-border bg-background flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={clearFilters}>{t("schools.filters.reset")}</Button>
            </div>
          </aside>

          <main className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("schools.showingCount").replace("{count}", String(filteredSchools.length))}
                </span>
                <span className="text-border">|</span>
                <Switch id="hiring-toggle" checked={hiringOnly} onCheckedChange={setHiringOnly} />
                <Label htmlFor="hiring-toggle" className="text-xs cursor-pointer">{t("schools.hiringNow")}</Label>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder={t("schools.sort.label")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="most_jobs">{t("schools.sort.mostJobs")}</SelectItem>
                  <SelectItem value="az">{t("schools.sort.az")}</SelectItem>
                  <SelectItem value="recent">{t("schools.sort.recent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {schoolsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-3.5 w-1/2" />
                      </div>
                      <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredSchools.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center space-y-3">
                  <SearchX className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <p className="font-medium text-foreground">{t("schools.empty.title")}</p>
                  <p className="text-sm text-muted-foreground">{t("schools.empty.description")}</p>
                  <div className="flex justify-center gap-3 pt-2">
                    <Button variant="outline" size="sm" onClick={clearFilters}>{t("schools.empty.clearFilters")}</Button>
                    <Button size="sm" onClick={() => { clearFilters(); setHiringOnly(false); }}>{t("schools.empty.showAll")}</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredSchools.map((school) => {
                const location = [school.countryName].filter(Boolean).join(" / ");
                const jobs = recentJobs?.get(school.id) ?? [];
                return (
                  <Card key={school.id} className="group">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" /> {school.displayName}{" "}
                            {school.openJobs > 0 && (
                              <span className="inline-flex items-center text-[10px] leading-none px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {t("schools.hiring")}
                              </span>
                            )}
                          </CardTitle>
                          {location && (
                            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {location}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={followLoading === school.id}
                            onClick={() => toggleFollow(school.id, school.displayName)}
                            className={`gap-1.5 text-xs ${followedSchools.has(school.id) ? "text-primary" : "text-muted-foreground"}`}
                          >
                            <Star className={`h-3.5 w-3.5 ${followedSchools.has(school.id) ? "fill-primary" : ""}`} />
                            {followedSchools.has(school.id) ? t("schools.following") : t("schools.follow")}
                          </Button>
                          <Button asChild size="sm">
                            <Link to={`/schools/${school.id}`} className="gap-1.5">
                              {t("schools.viewSchool")} <span aria-hidden="true">→</span>
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-2">
                        {school.curriculumNames.length > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <GraduationCap className="h-3 w-3" /> {school.curriculumNames.join(", ")}
                          </Badge>
                        )}
                        {school.schoolTypeName && <Badge variant="secondary">{school.schoolTypeName}</Badge>}
                        {school.openJobs > 0 ? (
                          <Link to={`/jobs?school=${school.id}`}>
                            <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-primary/10 transition-colors">
                              <Briefcase className="h-3 w-3" /> {school.openJobs} {t("schools.openJobs")}
                            </Badge>
                          </Link>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground/60">
                            <Briefcase className="h-3 w-3" /> {t("schools.notHiringNow")}
                          </Badge>
                        )}
                      </div>
                      {jobs.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/30">
                          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/50 mb-1">{t("schools.recentJobs")}</p>
                          <ul className="space-y-0.5">
                            {jobs.map((job) => (
                              <li key={job.id}>
                                <Link to={`/jobs/${job.id}`} className="text-xs text-foreground hover:text-primary hover:underline transition-colors">
                                  • {job.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                          {school.openJobs > 3 && (
                            <Link to={`/jobs?school=${school.id}`} className="text-[11px] text-primary hover:underline mt-1 inline-block">
                              {t("schools.viewAllJobs")}
                            </Link>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
            <p className="text-xs text-muted-foreground pt-4">{t("schools.browseNote")}</p>
          </main>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>{t("jobs.filters")} {filterCount > 0 && `(${filterCount})`}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {filterAccordion}
          </div>
          <div className="border-t border-border pt-3 flex gap-2">
            <Button className="flex-1" onClick={() => setDrawerOpen(false)}>{t("schools.filters.showResults")}</Button>
            <Button variant="outline" onClick={() => { clearFilters(); setDrawerOpen(false); }}>{t("schools.filters.reset")}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile floating filter button */}
      {isMobile && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden">
          <Button onClick={() => setDrawerOpen(true)} className="rounded-full shadow-lg gap-2 px-5">
            <SlidersHorizontal className="h-4 w-4" />
            {t("jobs.filters")} {filterCount > 0 && `(${filterCount})`}
          </Button>
        </div>
      )}
    </>
  );
};

export default SchoolsDiscovery;
