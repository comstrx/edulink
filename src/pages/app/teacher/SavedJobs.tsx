import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, BookmarkX, Building2, Briefcase, ArrowRight } from "lucide-react";
import { useSavedJobs, useToggleSaveJob } from "@/hooks/useSavedJobs";

const SavedJobs = () => {
  const { t } = useLanguage();
  const { data: savedRows, isLoading } = useSavedJobs();
  const toggleSave = useToggleSaveJob();

  const removeJob = (jobId: string) => {
    toggleSave.mutate({ jobId, isSaved: true });
  };

  const jobs = savedRows?.map((row: any) => ({
    id: row.jobs?.id ?? row.job_id,
    title: row.jobs?.title,
    status: row.jobs?.status,
    schoolName: row.jobs?.school_organizations?.name,
  })).filter((j: any) => j.title && j.status === "published") ?? [];

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-primary" />
          {t("savedJobs.title") || "Saved Jobs"}
        </h1>
        <p className="text-sm text-muted-foreground">{t("savedJobs.subtitle") || "Jobs you've bookmarked for later."}</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <Bookmark className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No saved jobs yet.</p>
            <Button asChild size="sm">
              <Link to="/jobs">
                Browse Jobs <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: any) => (
            <Card key={job.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between p-4 gap-4">
                <Link to={`/jobs/${job.id}`} className="flex-1 min-w-0 space-y-1">
                  <p className="font-medium text-foreground truncate">{job.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {job.schoolName && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {job.schoolName}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      <Briefcase className="h-2.5 w-2.5 mr-0.5" /> Published
                    </Badge>
                  </div>
                </Link>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => removeJob(job.id)}
                  title="Remove from saved"
                >
                  <BookmarkX className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedJobs;
