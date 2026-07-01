import { Route as RouteIcon, CheckCircle2, Loader2, AlertCircle, Target, Sparkles } from "lucide-react";
import TeacherContextBar from "@/components/teacher/TeacherContextBar";
import { useTeacherProfileId } from "@/hooks/useTeacherProfileId";
import TrainingSubNav from "@/components/training/TrainingSubNav";
import TrainingHeader from "@/components/training/TrainingHeader";
import TrainingSection from "@/components/training/TrainingSection";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import { usePathwayExecutions } from "@/hooks/usePathwayRuntime";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const TeacherPathways = () => {
  const { data: teacherProfileId } = useTeacherProfileId();
  const { data: pathways, isLoading, error } = usePathwayExecutions();

  const active = (pathways ?? []).filter((p) => p.status === "active" || p.status === "enrolled");
  const completed = (pathways ?? []).filter((p) => p.status === "completed");

  if (isLoading) {
    return (
      <div>
        <TrainingSubNav />
        <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto flex items-center justify-center gap-2 text-muted-foreground py-20">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading pathways…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <TrainingSubNav />
        <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-destructive py-10">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load pathways. Please try again later.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TrainingSubNav />
      <div className="px-4 sm:px-6 py-6 space-y-8 max-w-6xl mx-auto">
        <TrainingHeader
          title="Pathways"
          icon={RouteIcon}
          description="Structured learning journeys that lead to credentials and career growth."
          rootTo="/app/teacher/training"
        />

        <TeacherContextBar
          teacherId={teacherProfileId ?? undefined}
          contextMessage="Pathways help build structured expertise toward your goals."
        />

        {/* Active Pathways */}
        <TrainingSection title="Active Pathways" icon={RouteIcon}>
          {active.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {active.map((p) => (
                <Card key={p.id} className="border border-border">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <p className="font-semibold text-foreground">{p.pathway_title}</p>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {p.status === "enrolled" ? "Enrolled" : "Active"}
                      </Badge>
                    </div>

                    {/* WHY — contextual reason */}
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary shrink-0" />
                      {p.cri_target
                        ? `Builds structured expertise toward a CRI target of ${p.cri_target}`
                        : "Builds structured expertise through guided milestones"}
                    </p>

                    <Progress value={p.computed_progress_percent} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {p.completed_milestones_count} of {p.total_milestones_count} milestones · {p.completed_courses_count} of {p.total_courses_count} courses
                      </span>
                      <span>{p.computed_progress_percent}%</span>
                    </div>
                    {p.milestones.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Next: {p.milestones.find((m) => m.status === "available")?.milestone_title ?? "All milestones completed"}
                      </div>
                    )}

                    {/* IMPACT line */}
                    <p className="text-[11px] text-primary/80 flex items-center gap-1.5">
                      <Target className="h-3 w-3 shrink-0" />
                      Completing this pathway improves your readiness and unlocks credentials
                    </p>

                    <Button variant="link" size="sm" className="h-auto p-0 text-xs font-medium" asChild>
                      <Link to={`/training/${p.pathway_slug}`}>Continue Pathway →</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <TrainingEmptyState icon={RouteIcon} message="No active pathways" hint="Start a pathway to build structured expertise toward a credential." />
          )}
        </TrainingSection>

        {/* Completed Pathways */}
        {completed.length > 0 && (
          <TrainingSection title="Completed Pathways" icon={CheckCircle2}>
            <div className="grid gap-4 sm:grid-cols-2">
              {completed.map((p) => (
                <Card key={p.id} className="border border-border bg-muted/20">
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{p.pathway_title}</p>
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.total_milestones_count} milestones · {p.total_courses_count} courses
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Completed {p.completed_at ? new Date(p.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </p>
                    <p className="text-[11px] text-primary/70 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      This pathway contributed to your professional readiness
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TrainingSection>
        )}

        {/* CTA */}
        <Card className="border border-border bg-muted/30">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Looking for something specific?</p>
              <p className="text-sm text-muted-foreground">Browse the full training catalog to find pathways that match your goals.</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/teacher/library">Browse Library</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherPathways;
