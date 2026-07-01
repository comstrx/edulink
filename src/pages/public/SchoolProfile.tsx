import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSavedJobIds, useToggleSaveJob } from "@/hooks/useSavedJobs";
import { useSchoolFollows, useInvalidateSchoolFollows } from "@/hooks/useSchoolFollows";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Building, MapPin, GraduationCap, Heart, Users,
  ShieldCheck, Calendar, Globe, Briefcase, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import JobCard, { type Job } from "@/components/jobs/JobCard";
import JobsSubnav from "@/components/JobsSubnav";
import { useTaxonomyNames } from "@/hooks/useTaxonomyNames";

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
const SchoolProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user, roles } = useAuth();
  const { t } = useLanguage();
  const [followLoading, setFollowLoading] = useState(false);

  // Fetch school profile from DB
  const { data: school, isLoading: schoolLoading } = useQuery({
    queryKey: ["public-school-profile", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("school_organizations")
        .select("id, name, country_term_id, school_type_term_id, curriculum_term_ids, onboarding_completed")
        .eq("id", id)
        .eq("onboarding_completed", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch published jobs for this school
  const { data: rawJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["public-school-jobs", id],
    queryFn: async () => {
      if (!id) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, school_id, subject_term_ids, curriculum_term_ids, grade_band_term_ids, country_term_id, city_term_id, salary_min, salary_max, salary_currency, salary_period, salary_range, visa_sponsorship, benefits, experience_min, deadline, requirements_text, employment_type_term_ids, status")
        .eq("school_id", id)
        .eq("status", "published")
        .or(`deadline.is.null,deadline.gte.${today}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  // Collect all term IDs for taxonomy resolution
  const allTermIds = useMemo(() => {
    const ids = new Set<string>();
    if (school?.country_term_id) ids.add(school.country_term_id);
    if (school?.school_type_term_id) ids.add(school.school_type_term_id);
    (school?.curriculum_term_ids ?? []).forEach((tid: string) => ids.add(tid));
    for (const job of rawJobs) {
      if (job.country_term_id) ids.add(job.country_term_id);
      if (job.city_term_id) ids.add(job.city_term_id);
      (job.subject_term_ids ?? []).forEach((tid: string) => ids.add(tid));
      (job.curriculum_term_ids ?? []).forEach((tid: string) => ids.add(tid));
      (job.grade_band_term_ids ?? []).forEach((tid: string) => ids.add(tid));
      (job.employment_type_term_ids ?? []).forEach((tid: string) => ids.add(tid));
    }
    return [...ids];
  }, [school, rawJobs]);

  const { data: termNames = {} } = useTaxonomyNames(allTermIds);
  const getName = (termId: string | null | undefined) => (termId ? (termNames as Record<string, string>)[termId] ?? "" : "");

  // Map raw jobs to Job interface
  const jobs: Job[] = useMemo(() => {
    return rawJobs.map((j) => {
      const subjectNames = (j.subject_term_ids ?? []).map((tid: string) => getName(tid)).filter(Boolean);
      const curriculumNames = (j.curriculum_term_ids ?? []).map((tid: string) => getName(tid)).filter(Boolean);
      const gradeBandNames = (j.grade_band_term_ids ?? []).map((tid: string) => getName(tid)).filter(Boolean);
      const countryName = getName(j.country_term_id);
      const cityName = getName(j.city_term_id);
      const region = [cityName, countryName].filter(Boolean).join(", ");
      const employmentNames = (j.employment_type_term_ids ?? []).map((tid: string) => getName(tid)).filter(Boolean);

      return {
        id: j.id,
        title: j.title,
        school: school?.name ?? "",
        schoolId: j.school_id,
        subject: subjectNames.join(", ") || "—",
        curriculum: curriculumNames.join(", ") || "—",
        gradeBand: gradeBandNames.join(", ") || "",
        region: region || "—",
        deliveryMode: "",
        contractType: employmentNames.join(", ") || "",
        salary: j.salary_range ?? "",
        salaryMin: j.salary_min,
        salaryMax: j.salary_max,
        salaryCurrency: j.salary_currency,
        salaryPeriod: j.salary_period,
        visa: j.visa_sponsorship ?? false,
        tags: [],
        benefits: j.benefits ?? [],
        experienceRequired: j.experience_min ? `${j.experience_min}+ Years` : undefined,
        deadline: j.deadline ?? undefined,
        requirements: j.requirements_text ?? [],
      } satisfies Job;
    });
  }, [rawJobs, termNames, school]);

  // Derived display values
  const schoolName = school?.name ?? "";
  const countryName = getName(school?.country_term_id);
  const schoolTypeName = getName(school?.school_type_term_id);
  const curriculumNames = (school?.curriculum_term_ids ?? []).map((tid: string) => getName(tid)).filter(Boolean);

  // SEO head tags
  useEffect(() => {
    if (!schoolName) return;
    document.title = `${schoolName} – School Profile | EduLink`;

    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = `${schoolName} in ${countryName}. View open teaching positions and apply.`;

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://edulink.com/schools/${id}`;

    return () => { document.title = "EduLink"; };
  }, [schoolName, countryName, id]);

  const isTeacher = roles.includes("teacher");
  const isSchoolOrAdmin = roles.includes("school_admin") || roles.includes("school_recruiter") || roles.includes("school_academic_lead") || roles.includes("admin");

  // Shared school follow state (query-driven, cross-page sync)
  const { followedSchoolIdSet } = useSchoolFollows();
  const invalidateFollows = useInvalidateSchoolFollows();
  const isFollowing = id ? followedSchoolIdSet.has(id) : false;

  const handleFollow = async () => {
    if (!user || !id) return;
    setFollowLoading(true);
    if (isFollowing) {
      const { error } = await supabase.from("school_follows").delete().eq("teacher_user_id", user.id).eq("school_id", id);
      if (error) {
        toast.error("Failed to unfollow school");
        setFollowLoading(false);
        return;
      }
      toast.success(t("schoolProfile.unfollowed"));
    } else {
      const { error } = await supabase.from("school_follows").insert({ teacher_user_id: user.id, school_id: id });
      if (error) {
        toast.error("Failed to follow school");
        setFollowLoading(false);
        return;
      }
      toast.success(t("schoolProfile.followedSuccess"));
    }
    setFollowLoading(false);
    invalidateFollows();
  };

  // Use shared query-driven saved-job state so it stays consistent across surfaces
  const { savedJobIds } = useSavedJobIds();
  const toggleSaveMutation = useToggleSaveJob();
  const handleToggleSave = (jobId: string) => {
    toggleSaveMutation.mutate({ jobId, isSaved: savedJobIds.has(jobId) });
  };

  const FollowButton = ({ size = "default" as "default" | "sm" | "lg", className = "" }) => {
    if (isSchoolOrAdmin) return null;
    if (!user) {
      return (
        <Button asChild variant="outline" size={size} className={cn("gap-1.5", className)}>
          <Link to="/login"><Heart className="h-4 w-4" /> {t("schoolProfile.loginToFollow")}</Link>
        </Button>
      );
    }
    if (isTeacher) {
      return (
        <Button
          variant={isFollowing ? "secondary" : "outline"}
          size={size}
          className={cn("gap-1.5", className)}
          disabled={followLoading}
          onClick={handleFollow}
        >
          <Heart className={cn("h-4 w-4", isFollowing && "fill-current")} />
          {isFollowing ? t("schoolProfile.following") : t("schoolProfile.followSchool")}
        </Button>
      );
    }
    return null;
  };

  // Loading state
  if (schoolLoading) {
    return (
      <>
        <JobsSubnav />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      </>
    );
  }

  // Not found
  if (!school) {
    return (
      <>
        <JobsSubnav />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 text-center">
          <Building className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h1 className="text-lg font-semibold text-foreground mb-1">School Not Found</h1>
          <p className="text-sm text-muted-foreground mb-4">This school profile does not exist or is no longer available.</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/schools"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Browse Schools</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <JobsSubnav />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Back link */}
        <Link to="/schools" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("schoolProfile.back")}
        </Link>

        {/* ============ SCHOOL HEADER ============ */}
        <div className="rounded-xl border bg-card p-5 sm:p-6 space-y-4 mb-6">
          <div className="flex gap-4">
            <div className="hidden sm:flex h-16 w-16 rounded-xl bg-muted items-center justify-center shrink-0">
              <Building className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{schoolName}</h1>
                <div className="hidden sm:block shrink-0">
                  <FollowButton size="sm" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {countryName && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {countryName}</span>}
              </div>
            </div>
          </div>

          {/* Tags + badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {curriculumNames.map((name) => (
              <Badge key={name} variant="secondary" className="text-xs gap-1"><GraduationCap className="h-3 w-3" /> {name}</Badge>
            ))}
            {schoolTypeName && (
              <Badge variant="secondary" className="text-xs gap-1"><Globe className="h-3 w-3" /> {schoolTypeName}</Badge>
            )}
          </div>

          {/* Mobile follow + actions */}
          <div className="flex items-center gap-2 sm:hidden">
            <FollowButton />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => document.getElementById("open-jobs")?.scrollIntoView({ behavior: "smooth" })}>
              <Briefcase className="h-3.5 w-3.5" /> {t("schoolProfile.viewOpenJobs")} ({jobs.length})
            </Button>
          </div>
        </div>

        {/* ============ MAIN CONTENT ============ */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Open Jobs */}
            <div id="open-jobs" className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                {t("schoolProfile.openJobs")} ({jobs.length})
              </h2>
              {jobsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
              ) : jobs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">{t("schoolProfile.noJobs")}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isSaved={savedJobIds.has(job.id)}
                      onToggleSave={handleToggleSave}
                      isLoggedIn={!!user}
                      isTeacher={isTeacher}
                      isSchoolOrAdmin={isSchoolOrAdmin}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar — School Info */}
          <div className="w-full lg:w-[280px] shrink-0">
            <div className="sticky top-20 space-y-4">
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">{t("schoolProfile.info")}</h3>
                  <div className="space-y-3">
                    {curriculumNames.length > 0 && (
                      <>
                        <InfoRow label={t("schoolProfile.infoCurriculum")} value={curriculumNames.join(", ")} />
                        <Separator />
                      </>
                    )}
                    {schoolTypeName && (
                      <>
                        <InfoRow label={t("schoolProfile.infoType")} value={schoolTypeName} />
                        <Separator />
                      </>
                    )}
                    {countryName && (
                      <InfoRow label={t("schoolProfile.infoLocation")} value={countryName} />
                    )}
                  </div>
                </CardContent>
              </Card>

              <FollowButton size="lg" className="w-full" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground text-right">{value}</span>
  </div>
);

export default SchoolProfile;
