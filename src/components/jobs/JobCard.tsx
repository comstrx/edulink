import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, DollarSign, Shield, Bookmark, ShieldCheck, Award, ArrowRight, Globe, Zap, Clock, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Job {
  id: string;
  title: string;
  school: string;
  schoolId?: string;
  subject: string;
  curriculum: string;
  gradeBand: string;
  region: string;
  deliveryMode: string;
  contractType: string;
  salary: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  visa: boolean;
  tags: string[];
  smartTags?: string[];
  matchScore?: number;
  summary?: string;
  verified?: boolean;
  accredited?: boolean;
  internationalCurriculum?: boolean;
  benefits?: string[];
  experienceRequired?: string;
  deadline?: string;
  requirements?: string[];
  matchReasons?: string[];
}

interface JobCardProps {
  job: Job;
  isSaved?: boolean;
  onSelect?: (job: Job) => void;
  onToggleSave?: (jobId: string) => void;
  isSchoolOrAdmin?: boolean;
  isTeacher?: boolean;
  isLoggedIn?: boolean;
  /** Auth-aware fit label from batch match — only shown for teachers */
  fitLabel?: "Strong" | "Moderate" | "Developing" | null;
}

const getMatchColor = (score: number) => {
  if (score >= 85) return "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800";
  if (score >= 65) return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800";
  return "bg-muted text-muted-foreground border-border";
};

type Highlight = { label: string; icon: typeof Globe; className: string };

const JobCard = ({
  job,
  isSaved = false,
  onSelect,
  onToggleSave,
  isSchoolOrAdmin = false,
  isTeacher = false,
  isLoggedIn = false,
  fitLabel,
}: JobCardProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(job);
    } else {
      navigate(`/jobs/${job.id}`);
    }
  };

  // Build highlights from job data
  const highlights: Highlight[] = [];
  if (job.deliveryMode === "Online") highlights.push({ label: t("jobs.highlight.remote"), icon: Wifi, className: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400" });
  if (job.matchScore && job.matchScore >= 85) highlights.push({ label: t("jobs.highlight.highDemand"), icon: Zap, className: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400" });
  if (job.contractType === "Contract" || job.contractType === "Part-time") highlights.push({ label: t("jobs.highlight.quickHire"), icon: Clock, className: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" });

  return (
    <Card
      className="overflow-hidden cursor-pointer transition-all duration-150 border-border/60 hover:border-primary/30 hover:shadow-sm relative group"
      onClick={handleCardClick}
    >
      <div className="px-4 py-3.5 space-y-2">
        {/* Save icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isLoggedIn) { navigate("/login"); return; }
            onToggleSave?.(job.id);
          }}
          className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-muted transition-colors z-10 opacity-0 group-hover:opacity-100"
          aria-label={isSaved ? t("jobs.unsave") : t("jobs.save")}
        >
          <Bookmark className={cn("h-4 w-4", isSaved ? "fill-primary text-primary opacity-100" : "text-muted-foreground")} />
        </button>

        {/* 1. Title + Fit Label */}
        <div className="flex items-start justify-between gap-2 pr-8">
          <h3 className="text-sm font-bold text-foreground leading-snug tracking-tight">{job.title}</h3>
          {fitLabel && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0.5 h-auto font-semibold shrink-0 whitespace-nowrap",
                fitLabel === "Strong" && "text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950",
                fitLabel === "Moderate" && "text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950",
                fitLabel === "Developing" && "text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950",
              )}
            >
              {fitLabel} Fit
            </Badge>
          )}
        </div>

        {/* 2. School name */}
        {job.school && (
          <Link
            to={`/schools/${job.schoolId || job.id}`}
            className="text-xs text-primary/80 hover:text-primary hover:underline block -mt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {job.school}
          </Link>
        )}

        {/* 3. Location + contract type + trust badges */}
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3 w-3 shrink-0" />
          <span>{job.region}</span>
          <span className="text-border">·</span>
          <span>{job.contractType}</span>
          {(job.verified || job.accredited) && (
            <span className="inline-flex items-center gap-1 ml-0.5">
              {job.verified && <ShieldCheck className="h-3 w-3 text-primary/60" />}
              {job.accredited && <Award className="h-3 w-3 text-primary/60" />}
            </span>
          )}
        </p>

        {/* 4. Tags row: Subject + Grade Band + Visa */}
        <div className="flex flex-wrap items-center gap-1.5">
          {job.subject && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-auto font-medium">{job.subject}</Badge>
          )}
          {job.gradeBand && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-auto font-medium">{job.gradeBand}</Badge>
          )}
          {job.visa && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-auto gap-1 text-primary border-primary/30 font-medium">
              <Shield className="h-2.5 w-2.5" /> {t("jobs.card.visa")}
            </Badge>
          )}
        </div>

        {/* Highlights row (remote, high demand, quick hire) */}
        {highlights.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {highlights.map((h) => (
              <span
                key={h.label}
                className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", h.className)}
              >
                <h.icon className="h-2.5 w-2.5" />
                {h.label}
              </span>
            ))}
          </div>
        )}

        {/* 5. Salary + Match score */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {job.salary ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {job.salary}
            </span>
          ) : <span />}
          {job.matchScore != null && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 h-auto font-semibold cursor-default", getMatchColor(job.matchScore))}>
                  {job.matchScore}% {t("jobs.match")}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs">
                {t("jobs.card.matchTooltip")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* 6. CTA row */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/30">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary px-0"
          >
            <Link to={`/jobs/${job.id}`} onClick={(e) => e.stopPropagation()}>
              {t("jobs.card.viewJob")} <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
          {!isSchoolOrAdmin && (
            isLoggedIn && isTeacher ? (
              <Button size="sm" className="h-7 text-xs px-3 ml-auto" onClick={(e) => { e.stopPropagation(); }}>
                {t("jobs.card.applyNow")}
              </Button>
            ) : !isLoggedIn ? (
              <Button asChild size="sm" className="h-7 text-xs px-3 ml-auto" onClick={(e) => e.stopPropagation()}>
                <Link to="/login">{t("jobs.card.applyNow")}</Link>
              </Button>
            ) : null
          )}
        </div>
      </div>
    </Card>
  );
};

export default JobCard;
