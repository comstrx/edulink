import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Briefcase, DollarSign, Shield, X, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job } from "./JobCard";

const getMatchColor = (score: number) => {
  if (score >= 85) return "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800";
  if (score >= 65) return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800";
  return "bg-muted text-muted-foreground border-border";
};

interface JobPreviewPanelProps {
  job: Job | null;
  isSaved?: boolean;
  onClose: () => void;
  onToggleSave?: (jobId: string) => void;
  isLoggedIn?: boolean;
  isTeacher?: boolean;
}

const JobPreviewPanel = ({ job, isSaved = false, onClose, onToggleSave, isLoggedIn, isTeacher }: JobPreviewPanelProps) => {
  const { t } = useLanguage();

  if (!job) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-bold text-foreground leading-snug">{job.title}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors shrink-0">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <Link to={`/schools/${job.id}`} className="text-sm text-primary hover:underline block font-medium">
          {job.school}
        </Link>

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3 w-3 shrink-0" />
          {job.region}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {job.matchScore != null && (
            <Badge variant="outline" className={cn("text-[10px] px-2 py-0 font-medium", getMatchColor(job.matchScore))}>
              {t("jobs.match")} {job.matchScore}%
            </Badge>
          )}
          <button
            onClick={() => onToggleSave?.(job.id)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            <Bookmark className={cn("h-3 w-3", isSaved ? "fill-primary text-primary" : "")} />
            {isSaved ? t("jobs.saved") : t("jobs.save")}
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("jobs.preview.contract")}</p>
            <p className="text-xs flex items-center gap-1.5"><Briefcase className="h-3 w-3 text-muted-foreground" /> {job.contractType}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("jobs.preview.salary")}</p>
            <p className="text-xs flex items-center gap-1.5"><DollarSign className="h-3 w-3 text-muted-foreground" /> {job.salary}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("jobs.preview.delivery")}</p>
            <p className="text-xs">{job.deliveryMode}</p>
          </div>
          {job.visa && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("jobs.preview.visa")}</p>
              <p className="text-xs text-primary flex items-center gap-1.5"><Shield className="h-3 w-3" /> {t("jobs.card.visa")}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Smart tags */}
        {job.smartTags && job.smartTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.smartTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Summary */}
        {job.summary && (
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-foreground">{t("jobs.preview.summary")}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{job.summary}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t space-y-1.5">
        <Button asChild className="w-full h-9 text-sm">
          <Link to={`/jobs/${job.id}`}>{t("jobs.preview.viewFull")}</Link>
        </Button>
        {isLoggedIn && isTeacher ? (
          <Button variant="outline" className="w-full h-9 text-sm">{t("jobs.preview.apply")}</Button>
        ) : !isLoggedIn ? (
          <Button asChild variant="outline" className="w-full h-9 text-sm">
            <Link to="/login">{t("jobs.loginToApply")}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default JobPreviewPanel;
