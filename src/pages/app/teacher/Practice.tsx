import {
  FlaskConical, MessageSquare, CheckCircle2, FileText,
  Loader2, AlertCircle,
} from "lucide-react";
import TrainingSubNav from "@/components/training/TrainingSubNav";
import TrainingHeader from "@/components/training/TrainingHeader";
import TrainingSection from "@/components/training/TrainingSection";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTeacherEvidence } from "@/hooks/useTrainingEvidence";
import { usePathwayExecutions } from "@/hooks/usePathwayRuntime";
import { usePathwayReflections } from "@/hooks/usePathwayReflections";

const statusLabel: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  needs_revision: "Needs revision",
};

const statusVariant = (s: string): "default" | "secondary" | "outline" | "destructive" =>
  s === "approved" ? "default" : s === "rejected" || s === "needs_revision" ? "destructive" : "secondary";

const Practice = () => {
  const { data: allEvidence, isLoading: evLoading, error: evError } = useTeacherEvidence();
  const { data: pathways, isLoading: pwLoading } = usePathwayExecutions();

  // Get the first active pathway for reflections
  const activePathway = (pathways ?? []).find((p) => p.status === "active");
  const { data: reflections, isLoading: refLoading } = usePathwayReflections(activePathway?.id);

  const isLoading = evLoading || pwLoading || refLoading;
  const error = evError;

  const evidence = allEvidence ?? [];
  const recentEvidence = evidence.slice(0, 10);

  if (isLoading) {
    return (
      <div>
        <TrainingSubNav />
        <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto flex items-center justify-center gap-2 text-muted-foreground py-20">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading practice activities…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <TrainingSubNav />
        <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-destructive py-10">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load practice data. Please try again later.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TrainingSubNav />
      <div className="px-4 sm:px-6 py-6 space-y-8 max-w-5xl mx-auto">
        <TrainingHeader
          title="Practice"
          icon={FlaskConical}
          description="Apply your learning through classroom evidence and reflections."
          rootTo="/app/teacher/training"
        />

        {/* Evidence Submissions */}
        <TrainingSection title="Evidence Submissions" icon={FileText} count={evidence.length}>
          {recentEvidence.length > 0 ? (
            <div className="space-y-3">
              {recentEvidence.map((e) => (
                <Card key={e.id} className="border border-border">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <p className="font-medium text-foreground">{e.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{e.evidence_type.replace(/_/g, " ")}</Badge>
                        <span>
                          {new Date(e.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <Badge variant={statusVariant(e.review_status)} className="text-xs shrink-0">
                      {statusLabel[e.review_status] ?? e.review_status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <TrainingEmptyState
              icon={FileText}
              message="No evidence submitted yet"
              hint="Submit lesson plans, videos, or artifacts from your Evidence page to track your practice."
            />
          )}
        </TrainingSection>

        {/* Reflections */}
        <TrainingSection title="Pathway Reflections" icon={MessageSquare} count={(reflections ?? []).length}>
          {(reflections ?? []).length > 0 ? (
            <div className="space-y-3">
              {(reflections ?? []).map((r) => (
                <Card key={r.id} className="border border-border">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground italic">"{r.prompt_text}"</p>
                    <p className="text-sm text-muted-foreground">{r.teacher_response}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      <span>
                        Submitted {new Date(r.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <TrainingEmptyState
              icon={MessageSquare}
              message="No reflections submitted"
              hint="Reflections will appear here as you progress through pathway milestones."
            />
          )}
        </TrainingSection>
      </div>
    </div>
  );
};

export default Practice;
