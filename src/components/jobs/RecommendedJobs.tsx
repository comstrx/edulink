import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Star, MapPin, DollarSign, Shield, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job } from "./JobCard";

interface RecommendedJobsProps {
  jobs: Job[];
  onSelect: (job: Job) => void;
  savedJobIds: Set<string>;
  onToggleSave: (jobId: string) => void;
}

const getMatchColor = (score: number) => {
  if (score >= 85) return "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800";
  if (score >= 65) return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800";
  return "bg-muted text-muted-foreground border-border";
};

const RecommendedJobs = ({ jobs, onSelect }: RecommendedJobsProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const topJobs = jobs.filter((j) => j.matchScore && j.matchScore >= 70).slice(0, 5);

  if (!user || topJobs.length === 0) return null;

  return (
    <div className="space-y-2.5 pb-1">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Star className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{t("jobs.recommended.title")}</span>
        <span className="text-[10px] text-muted-foreground">({topJobs.length})</span>
        <span className="ml-auto">
          {collapsed ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />}
        </span>
      </button>

      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {topJobs.map((job) => (
            <button
              key={job.id}
              onClick={() => onSelect(job)}
              className="flex flex-col gap-2 p-3 rounded-lg border border-primary/15 bg-primary/[0.02] hover:bg-accent/40 transition-colors text-left"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Building className="h-3 w-3 shrink-0" /> {job.school}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.region}</span>
                {job.salary && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {job.salary}</span>}
              </div>

              <div className="flex items-center gap-1.5 mt-auto pt-0.5">
                {job.visa && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-primary/30 text-primary">
                    <Shield className="h-2.5 w-2.5" /> {t("jobs.card.visa")}
                  </Badge>
                )}
                {job.matchScore != null && (
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 ml-auto shrink-0", getMatchColor(job.matchScore))}>
                    {job.matchScore}% {t("jobDetails.match")}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendedJobs;
