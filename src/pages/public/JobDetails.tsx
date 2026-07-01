import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, MapPin, BookOpen, GraduationCap, Building,
  Bookmark, Shield, DollarSign, Briefcase, Calendar, Clock,
  CheckCircle2, ShieldCheck, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import JobsSubnav from "@/components/JobsSubnav";
import { usePublicJobDetail } from "@/hooks/usePublicJobs";
import { useJobSearch } from "@/hooks/useJobSearch";
import { useMemo } from "react";
import { useSavedJobIds, useToggleSaveJob } from "@/hooks/useSavedJobs";
import JobCard from "@/components/jobs/JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import JobFitIntelligence from "@/components/jobs/JobFitIntelligence";

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
const JobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user, roles } = useAuth();
  const { t } = useLanguage();

  const { data: job, isLoading, error } = usePublicJobDetail(id);
  const { savedJobIds } = useSavedJobIds();
  const toggleSaveMutation = useToggleSaveJob();

  const isTeacher = roles.includes("teacher");
  const isSchoolOrAdmin = roles.includes("school_admin") || roles.includes("school_recruiter") || roles.includes("school_academic_lead") || roles.includes("admin");

  const isSaved = id ? savedJobIds.has(id) : false;
  const handleToggleSaveMain = () => {
    if (!id) return;
    toggleSaveMutation.mutate({ jobId: id, isSaved });
  };
  const handleToggleSaveCard = (jobId: string) => {
    toggleSaveMutation.mutate({ jobId, isSaved: savedJobIds.has(jobId) });
  };

  const { results: allJobs } = useJobSearch();
  const similarJobs = useMemo(() => allJobs.filter((j) => j.id !== id).slice(0, 4), [allJobs, id]);

  // Auth-aware CTA builder
  const ApplyCTA = ({ size = "default" as "default" | "lg", className = "" }) => {
    // Teachers can always apply, even if they also have school/admin roles
    if (isTeacher) {
      return (
        <Button asChild size={size} className={className}>
          <Link to={`/app/teacher/applications?jobId=${id}`}>{t("jobs.card.applyNow")}</Link>
        </Button>
      );
    }
    if (isSchoolOrAdmin) {
      return (
        <Button asChild size={size} variant="outline" className={className}>
          <Link to="/app/school/hiring/jobs">{t("jobDetails.goToHiring") || "Go to Hiring Dashboard"}</Link>
        </Button>
      );
    }
    if (!user) {
      return (
        <Button asChild size={size} className={className}>
          <Link to={`/login?redirect=/jobs/${id}`}>{t("jobs.loginToApply") || "Login to Apply"}</Link>
        </Button>
      );
    }
    return (
      <Button asChild size={size} className={className}>
        <Link to="/login">{t("jobs.loginToApply") || "Login to Continue"}</Link>
      </Button>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <JobsSubnav />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </>
    );
  }

  // Not found or not published
  if (!job) {
    return (
      <>
        <JobsSubnav />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Job Not Available</h1>
          <p className="text-sm text-muted-foreground">This job posting may have expired or been removed.</p>
          <Button asChild variant="outline">
            <Link to="/jobs">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Browse All Jobs
            </Link>
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
        <Link to="/jobs" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("jobDetails.back")}
        </Link>

        {/* ============ JOB HEADER ============ */}
        <div className="rounded-xl border bg-card p-5 sm:p-6 space-y-4 mb-6">
          <div className="flex gap-4">
            <div className="hidden sm:flex h-14 w-14 rounded-lg bg-muted items-center justify-center shrink-0">
              <Building className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <Link to={`/schools/${job.schoolId}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                  <Building className="h-3.5 w-3.5" /> View School
                </Link>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
                {job.contractType && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {job.contractType}</span>}
              </div>
            </div>
          </div>

          {/* Tags + badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {job.subject && <Badge variant="secondary" className="text-xs gap-1"><BookOpen className="h-3 w-3" /> {job.subject}</Badge>}
            {job.curriculum && <Badge variant="secondary" className="text-xs gap-1"><GraduationCap className="h-3 w-3" /> {job.curriculum}</Badge>}
            {job.salary && <Badge variant="outline" className="text-xs gap-1"><DollarSign className="h-3 w-3" /> {job.salary}</Badge>}
            {job.visa && (
              <Badge variant="outline" className="text-xs gap-1 text-primary border-primary/30">
                <Shield className="h-3 w-3" /> {t("jobs.card.visa")}
              </Badge>
            )}
            {job.verified && (
              <Badge variant="outline" className="text-xs gap-1">
                <ShieldCheck className="h-3 w-3 text-primary/70" /> {t("jobs.card.verified")}
              </Badge>
            )}
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2 pt-1">
            <ApplyCTA />
            {isTeacher && (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={handleToggleSaveMain}
              >
                <Bookmark className={cn("h-4 w-4", isSaved && "fill-primary text-primary")} />
                {isSaved ? t("jobDetails.saved") : t("jobDetails.saveJob")}
              </Button>
            )}
          </div>
        </div>

        {/* ============ MAIN CONTENT + SIDEBAR ============ */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Overview grid */}
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">{t("jobDetails.overview")}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {job.subject && <OverviewItem icon={BookOpen} label={t("jobDetails.ovSubject")} value={job.subject} />}
                  {job.gradeBand && <OverviewItem icon={GraduationCap} label={t("jobDetails.ovGrade")} value={job.gradeBand} />}
                  {job.contractType && <OverviewItem icon={Briefcase} label={t("jobDetails.ovType")} value={job.contractType} />}
                  {job.startDate && <OverviewItem icon={Calendar} label={t("jobDetails.ovStart")} value={job.startDate} />}
                  <OverviewItem icon={MapPin} label={t("jobDetails.ovLocation")} value={job.location} />
                  {job.experienceMin != null && job.experienceMin > 0 && (
                    <OverviewItem icon={Clock} label={t("jobDetails.ovExperience")} value={`${job.experienceMin}+ Years`} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Job description */}
            <Card>
              <CardContent className="p-5 space-y-5">
                {job.description && (
                  <div className="space-y-2">
                    <h2 className="text-base font-semibold text-foreground">{t("jobDetails.aboutRole")}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{job.description}</p>
                  </div>
                )}

                {job.responsibilities.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h2 className="text-base font-semibold text-foreground">{t("jobDetails.responsibilities")}</h2>
                      <ul className="space-y-1.5">
                        {job.responsibilities.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {job.requirements.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h2 className="text-base font-semibold text-foreground">{t("jobDetails.requirements")}</h2>
                      <ul className="space-y-1.5">
                        {job.requirements.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {job.benefits.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h2 className="text-base font-semibold text-foreground">{t("jobDetails.benefits")}</h2>
                      <ul className="space-y-1.5">
                        {job.benefits.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500/70 mt-0.5 shrink-0" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ============ BOTTOM APPLY CTA ============ */}
            <Card className="border-primary/20 bg-primary/[0.02]">
              <CardContent className="p-5 space-y-4">
                <h2 className="text-base font-semibold text-foreground">{t("jobDetails.readyToApply")}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">{t("jobDetails.ovSubject")}</p>
                    <p className="text-sm font-medium text-foreground">{job.title}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">{t("jobDetails.ovLocation")}</p>
                    <p className="text-sm font-medium text-foreground">{job.location}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">{t("jobDetails.ovSalary")}</p>
                    <p className="text-sm font-medium text-foreground">{job.salary || "—"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">{t("jobs.card.visa")}</p>
                    <p className={cn("text-sm font-medium", job.visa ? "text-primary" : "text-muted-foreground")}>
                      {job.visa ? t("jobDetails.visaYes") : t("jobDetails.visaNo")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <ApplyCTA size="lg" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar — sticky apply panel */}
          <div className="w-full lg:w-[280px] shrink-0">
            <div className="sticky top-20 space-y-4">
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">{t("jobDetails.applyTitle")}</h3>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("jobDetails.ovSalary")}</span>
                      <span className="font-medium text-foreground">{job.salary || "—"}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("jobs.card.visa")}</span>
                      <span className={cn("font-medium", job.visa ? "text-primary" : "text-muted-foreground")}>
                        {job.visa ? t("jobDetails.visaYes") : t("jobDetails.visaNo")}
                      </span>
                    </div>
                    {job.deadline && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t("jobDetails.deadline")}</span>
                          <span className="font-medium text-foreground">{job.deadline}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <ApplyCTA className="w-full" />
                  {isTeacher && (
                    <Button
                      variant="outline"
                      className="w-full gap-1.5"
                      onClick={handleToggleSaveMain}
                    >
                      <Bookmark className={cn("h-4 w-4", isSaved && "fill-primary text-primary")} />
                      {isSaved ? t("jobDetails.saved") : t("jobDetails.saveJob")}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Auth-aware intelligence — only shows for teachers */}
              {id && <JobFitIntelligence jobId={id} />}
            </div>
          </div>
        </div>

        {/* ============ SIMILAR JOBS ============ */}
        {similarJobs.length > 0 && (
          <div className="mt-10 space-y-4">
            <h2 className="text-base font-semibold text-foreground">{t("jobDetails.similarJobs")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {similarJobs.map((sj) => (
                <JobCard
                  key={sj.id}
                  job={sj}
                  isSaved={savedJobIds.has(sj.id)}
                  onToggleSave={handleToggleSaveCard}
                  isLoggedIn={!!user}
                  isTeacher={isTeacher}
                  isSchoolOrAdmin={isSchoolOrAdmin}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */
const OverviewItem = ({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) => (
  <div className="space-y-0.5">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
    <p className="text-sm font-medium text-foreground">{value}</p>
  </div>
);

export default JobDetails;
