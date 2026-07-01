import { useState } from "react";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SchoolHiringGate } from "@/components/guards/SchoolHiringGate";
import { useSchoolHiringGuard } from "@/hooks/useSchoolHiringGuard";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveTermNames } from "@/lib/taxonomy-api";
import JobForm from "@/components/jobs/JobForm";
import {
  Plus, Briefcase, MapPin, BookOpen, Eye, Pencil,
  Clock, CheckCircle2, XCircle, Search, Lock,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline"; icon: typeof CheckCircle2 }> = {
  published: { label: "Published", variant: "default", icon: CheckCircle2 },
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  closed: { label: "Closed", variant: "outline", icon: XCircle },
};

const HiringJobs = () => {
  const { workspace } = useCurrentSchoolWorkspace();
  const { t } = useLanguage();
  const [editingJob, setEditingJob] = useState<Record<string, any> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { guardHiringAction, isCompleted } = useSchoolHiringGuard();

  const handleCreate = () => {
    if (!guardHiringAction()) return;
    setIsCreating(true);
  };

  const handleEdit = (job: Record<string, any>) => {
    if (!guardHiringAction()) return;
    setEditingJob(job);
  };

  const schoolId = workspace?.schoolId;

  // Fetch jobs for this school
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["school_jobs", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status, created_at, deadline, region_term_id, country_term_id, city_term_id, subject_term_ids, curriculum_term_ids, employment_type_term_ids, work_arrangement_term_ids, salary_range, visa_sponsorship, is_featured")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Batch resolve taxonomy names
      const allIds = (data ?? []).flatMap(j => [
        j.country_term_id, j.city_term_id,
        ...(j.subject_term_ids || []),
        ...(j.curriculum_term_ids || []),
        ...(j.employment_type_term_ids || []),
        ...(j.work_arrangement_term_ids || []),
      ].filter(Boolean)) as string[];

      const nameMap = allIds.length > 0 ? await resolveTermNames(allIds) : {};

      return (data ?? []).map(j => ({
        ...j,
        _locationLabel: [
          j.city_term_id && nameMap[j.city_term_id],
          j.country_term_id && nameMap[j.country_term_id],
        ].filter(Boolean).join(", ") || "—",
        _subjectLabels: (j.subject_term_ids || []).map((id: string) => nameMap[id] || id.slice(0, 6)).slice(0, 3),
        _curriculumLabels: (j.curriculum_term_ids || []).map((id: string) => nameMap[id] || id.slice(0, 6)).slice(0, 2),
      }));
    },
  });

  if (isCreating || editingJob) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        <JobForm
          job={editingJob}
          schoolId={schoolId || ""}
          onClose={() => { setEditingJob(null); setIsCreating(false); }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <SchoolBreadcrumb items={[
        { label: "Hiring", to: "/app/school/hiring/overview" },
        { label: "Jobs" },
      ]} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage your job listings</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={handleCreate} className="gap-1.5" disabled={!schoolId || !isCompleted}>
            {!isCompleted && <Lock className="h-3.5 w-3.5" />}
            <Plus className="h-4 w-4" /> Create Job
          </Button>
          {!isCompleted && (
            <p className="text-[11px] text-muted-foreground">Complete your school profile to activate hiring.</p>
          )}
        </div>
      </div>

      {!schoolId && (
        <Card>
          <CardContent className="p-8 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Set up your school profile first to create job postings.</p>
          </CardContent>
        </Card>
      )}

      {schoolId && isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="p-5 h-24" /></Card>
          ))}
        </div>
      )}

      {schoolId && !isLoading && jobs && jobs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">No jobs posted yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first job posting to start receiving applications.</p>
            <Button onClick={handleCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Create Your First Job
            </Button>
          </CardContent>
        </Card>
      )}

      {jobs && jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map(job => {
            const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.draft;
            const StatusIcon = sc.icon;
            return (
              <Card key={job.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-foreground">{job.title}</h3>
                        <Badge variant={sc.variant} className="text-xs gap-1">
                          <StatusIcon className="h-3 w-3" /> {sc.label}
                        </Badge>
                        {job.is_featured && <Badge variant="outline" className="text-xs text-primary border-primary/30">Featured</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job._locationLabel}</span>
                        {job.salary_range && <span>{job.salary_range}</span>}
                        {job.deadline && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Deadline: {job.deadline}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {job._subjectLabels.map((s: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                        {job._curriculumLabels.map((c: string, i: number) => (
                          <Badge key={`c-${i}`} variant="outline" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => handleEdit(job)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const GuardedHiringJobs = () => (
  <SchoolHiringGate>
    <HiringJobs />
  </SchoolHiringGate>
);

export default GuardedHiringJobs;
