import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap, BookOpen, Route, Target, FlaskConical,
  Award, Users, Library, Play, Star, Clock,
  TrendingUp, Sparkles, BookMarked, ClipboardList, Zap,
  CheckCircle2, RotateCw, RefreshCw, ArrowRight, Lightbulb,
} from "lucide-react";
import EvidencePanel from "@/components/training/EvidencePanel";
import TeacherContextBar from "@/components/teacher/TeacherContextBar";
import { useTeacherProfileId } from "@/hooks/useTeacherProfileId";
import MentorFeedbackPanel from "@/components/training/MentorFeedbackPanel";
import TrainingSubNav from "@/components/training/TrainingSubNav";
import TrainingHeader from "@/components/training/TrainingHeader";
import TrainingSection from "@/components/training/TrainingSection";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTeacherExecutions, useActivateExecution } from "@/hooks/useTrainingExecutions";
import { useCourseProgressList, useCourseProgressAction } from "@/hooks/useCourseProgress";
import { usePathwayExecutions, useRefreshPathwayProgress } from "@/hooks/usePathwayRuntime";
import type { ExecutionWithDetails } from "@/hooks/useTrainingExecutions";
import type { CourseProgressRecord } from "@/hooks/useCourseProgress";
import type { PathwayExecutionWithDetails } from "@/hooks/usePathwayRuntime";
import { format } from "date-fns";
import { toast } from "sonner";

/* ── (mock data removed — sections now use real DB or empty states) ── */

const executionStatusVariant = (s: string) => {
  if (s === "active") return "default" as const;
  if (s === "completed") return "secondary" as const;
  if (s === "assigned") return "outline" as const;
  return "outline" as const;
};

const progressStatusLabel = (s: string) => {
  if (s === "not_started") return "Not Started";
  if (s === "in_progress") return "In Progress";
  if (s === "completed") return "Completed";
  return s;
};

const milestoneStatusVariant = (s: string) => {
  if (s === "completed") return "secondary" as const;
  if (s === "available") return "default" as const;
  return "outline" as const;
};

/* ── Course Progress Card ── */
const CourseProgressCard = ({
  cp,
  onAction,
  isActioning,
}: {
  cp: CourseProgressRecord;
  onAction: (executionId: string, action: "start" | "continue" | "complete") => void;
  isActioning: boolean;
}) => (
  <Card className="border border-border">
    <CardContent className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-foreground">{cp.course_title}</p>
        <Badge variant={cp.progress_status === "completed" ? "secondary" : cp.progress_status === "in_progress" ? "default" : "outline"} className="text-xs shrink-0">
          {progressStatusLabel(cp.progress_status)}
        </Badge>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-xs">Course</Badge>
        {cp.due_date && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Due {format(new Date(cp.due_date), "MMM d, yyyy")}
          </span>
        )}
        {cp.started_at && (
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Started {format(new Date(cp.started_at), "MMM d")}
          </span>
        )}
        {cp.last_activity_at && cp.progress_status === "in_progress" && (
          <span className="flex items-center gap-1">
            <RotateCw className="h-3 w-3" />
            Last {format(new Date(cp.last_activity_at), "MMM d")}
          </span>
        )}
        {cp.completed_at && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed {format(new Date(cp.completed_at), "MMM d")}
          </span>
        )}
      </div>
      {cp.progress_percent != null && cp.progress_status !== "not_started" && (
        <Progress value={cp.progress_percent} className="h-2" />
      )}
      {cp.assignment_notes && (
        <p className="text-xs text-muted-foreground italic">"{cp.assignment_notes}"</p>
      )}
      <div className="flex gap-2 mt-2">
        {cp.progress_status === "not_started" && (
          <Button variant="outline" size="sm" disabled={isActioning} onClick={() => onAction(cp.execution_id, "start")}>
            <Play className="h-3 w-3 mr-1" />
            {isActioning ? "Starting…" : "Start Course"}
          </Button>
        )}
        {cp.progress_status === "in_progress" && (
          <>
            <Button variant="outline" size="sm" disabled={isActioning} onClick={() => onAction(cp.execution_id, "continue")}>
              <RotateCw className="h-3 w-3 mr-1" />
              Continue
            </Button>
            <Button variant="outline" size="sm" disabled={isActioning} onClick={() => onAction(cp.execution_id, "complete")}>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Mark Complete
            </Button>
          </>
        )}
      </div>
      {/* Evidence panel for active/completed courses */}
      {cp.progress_status !== "not_started" && (
        <>
          <EvidencePanel executionId={cp.execution_id} compact />
          <MentorFeedbackPanel executionId={cp.execution_id} />
        </>
      )}
    </CardContent>
  </Card>
);

/* ── Pathway Progress Card ── */
const PathwayProgressCard = ({
  pw,
  onRefresh,
  isRefreshing,
}: {
  pw: PathwayExecutionWithDetails;
  onRefresh: (id: string) => void;
  isRefreshing: boolean;
}) => (
  <Card className="border border-border">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{pw.pathway_title}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs gap-1">
              <Route className="h-3 w-3" /> Pathway
            </Badge>
            <Badge variant={executionStatusVariant(pw.status)} className="text-xs capitalize">
              {pw.status}
            </Badge>
          </div>
        </div>
        {pw.status === "active" && (
          <Button variant="ghost" size="sm" onClick={() => onRefresh(pw.id)} disabled={isRefreshing}>
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{pw.computed_progress_percent}% complete</span>
          <span>{pw.completed_courses_count}/{pw.total_courses_count} courses</span>
        </div>
        <Progress value={pw.computed_progress_percent} className="h-2" />
      </div>

      {/* Milestones */}
      {pw.milestones.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Milestones</p>
          <div className="flex flex-wrap gap-1.5">
            {pw.milestones.map((m) => (
              <Badge key={m.id} variant={milestoneStatusVariant(m.status)} className="text-xs gap-1">
                {m.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                {m.milestone_title}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Required courses summary */}
      {pw.courses.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Required Courses</p>
          <div className="space-y-1">
            {pw.courses.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs">
                <span className={c.completed ? "text-muted-foreground line-through" : "text-foreground"}>
                  {c.title}
                </span>
                {c.completed ? (
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                ) : c.progress_status === "in_progress" ? (
                  <span className="text-muted-foreground">{c.progress_percent}%</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {pw.started_at && (
        <p className="text-xs text-muted-foreground">
          Started {format(new Date(pw.started_at), "MMM d, yyyy")}
          {pw.completed_at && ` · Completed ${format(new Date(pw.completed_at), "MMM d, yyyy")}`}
        </p>
      )}
    </CardContent>
  </Card>
);

/* ── Non-course Execution Card (non-pathway fallback) ── */
const ExecutionCard = ({
  exec,
  onActivate,
  isActivating,
}: {
  exec: ExecutionWithDetails;
  onActivate?: (id: string) => void;
  isActivating?: boolean;
}) => (
  <Card className="border border-border">
    <CardContent className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-foreground">{exec.item_title}</p>
        <Badge variant={executionStatusVariant(exec.execution_status)} className="text-xs shrink-0 capitalize">
          {exec.execution_status}
        </Badge>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-xs">{exec.training_item_type}</Badge>
        {exec.due_date && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Due {format(new Date(exec.due_date), "MMM d, yyyy")}
          </span>
        )}
        {exec.activated_at && (
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Started {format(new Date(exec.activated_at), "MMM d")}
          </span>
        )}
      </div>
      {exec.assignment_notes && (
        <p className="text-xs text-muted-foreground italic">"{exec.assignment_notes}"</p>
      )}
      {exec.execution_status === "assigned" && onActivate && (
        <Button variant="outline" size="sm" className="mt-2" disabled={isActivating} onClick={() => onActivate(exec.id)}>
          <Play className="h-3 w-3 mr-1" />
          {isActivating ? "Starting…" : "Start Learning"}
        </Button>
      )}
    </CardContent>
  </Card>
);



const TeacherTraining = () => {
  const { data: teacherProfileId } = useTeacherProfileId();
  const { data: executions = [], isLoading: executionsLoading } = useTeacherExecutions();
  const activateMutation = useActivateExecution();
  const { data: courseProgress = [], isLoading: cpLoading } = useCourseProgressList();
  const courseAction = useCourseProgressAction();
  const { data: pathwayExecs = [], isLoading: pwLoading } = usePathwayExecutions();
  const refreshPathway = useRefreshPathwayProgress();

  // Course execution IDs that have progress records
  const courseExecIds = new Set(courseProgress.map((cp) => cp.execution_id));
  // Pathway execution IDs
  const pathwayExecEnrollmentIds = new Set(pathwayExecs.map((pw) => pw.enrollment_id));

  // Non-course/non-pathway executions
  const nonCourseExecs = executions.filter(
    (e) => !courseExecIds.has(e.id) && e.training_item_type !== "course" && e.training_item_type !== "pathway"
  );

  // Pathway executions without runtime records (assigned but not started)
  const pathwayAssignedExecs = executions.filter(
    (e) => e.training_item_type === "pathway" && !pathwayExecEnrollmentIds.has(e.id)
  );

  // Course progress sections
  const cpNotStarted = courseProgress.filter((cp) => cp.progress_status === "not_started");
  const cpInProgress = courseProgress.filter((cp) => cp.progress_status === "in_progress");
  const cpCompleted = courseProgress.filter((cp) => cp.progress_status === "completed");

  // Pathway sections
  const pwActive = pathwayExecs.filter((pw) => pw.status === "active");
  const pwCompleted = pathwayExecs.filter((pw) => pw.status === "completed");

  // Non-course sections
  const ncAssigned = nonCourseExecs.filter((e) => e.execution_status === "assigned");
  const ncActive = nonCourseExecs.filter((e) => e.execution_status === "active");
  const ncCompleted = nonCourseExecs.filter((e) => e.execution_status === "completed");

  const isLoading = executionsLoading || cpLoading || pwLoading;

  const handleCourseAction = (executionId: string, action: "start" | "continue" | "complete") => {
    courseAction.mutate(
      { executionId, action },
      {
        onSuccess: () => {
          const labels = { start: "Course started!", continue: "Progress saved", complete: "Course completed! 🎉" };
          toast.success(labels[action]);
        },
        onError: (err: any) => toast.error(err.message || "Action failed"),
      },
    );
  };

  const handleRefreshPathway = (executionId: string) => {
    refreshPathway.mutate(executionId, {
      onSuccess: (data) => {
        if (data?.completed) {
          toast.success("Pathway completed! 🎓", {
            description: "Your profile improved — you now match more jobs",
            duration: 5000,
          });
        } else if (data?.completed_milestones_count > 0 && data?.total_milestones_count > 0) {
          const pct = Math.round((data.completed_milestones_count / data.total_milestones_count) * 100);
          toast.success("Milestone progress updated", {
            description: `${data.completed_milestones_count}/${data.total_milestones_count} milestones complete (${pct}%) — keep going to unlock credentials`,
            duration: 4000,
          });
        } else {
          toast.success("Progress updated");
        }
      },
      onError: (err: any) => toast.error(err.message || "Failed to refresh"),
    });
  };

  return (
    <div>
      <TrainingSubNav />
      <div className="px-4 sm:px-6 py-6 space-y-8 max-w-6xl mx-auto">
        <TrainingHeader
          title="Training Dashboard"
          icon={GraduationCap}
          description="Your professional learning at a glance."
          rootTo="/app/teacher/training"
        />

        <TeacherContextBar
          teacherId={teacherProfileId}
          contextMessage="Your readiness summary and focus area."
        />

        {/* Active Pathways */}
        {pwActive.length > 0 && (
          <TrainingSection title="Active Pathways" icon={Route}>
            <div className="grid gap-4 sm:grid-cols-2">
              {pwActive.map((pw) => (
                <PathwayProgressCard
                  key={pw.id}
                  pw={pw}
                  onRefresh={handleRefreshPathway}
                  isRefreshing={refreshPathway.isPending}
                />
              ))}
            </div>
          </TrainingSection>
        )}

        {/* Active Courses */}
        <TrainingSection title="Active Courses" icon={Play}>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : cpInProgress.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {cpInProgress.map((cp) => (
                <CourseProgressCard key={cp.id} cp={cp} onAction={handleCourseAction} isActioning={courseAction.isPending} />
              ))}
            </div>
          ) : (
            <TrainingEmptyState icon={Play} message="No active courses" hint="Start an assigned course to begin." />
          )}
        </TrainingSection>

        {/* Assigned Courses (not started) */}
        {cpNotStarted.length > 0 && (
          <TrainingSection title="Assigned Courses" icon={ClipboardList}>
            <div className="grid gap-4 sm:grid-cols-2">
              {cpNotStarted.map((cp) => (
                <CourseProgressCard key={cp.id} cp={cp} onAction={handleCourseAction} isActioning={courseAction.isPending} />
              ))}
            </div>
          </TrainingSection>
        )}

        {/* Assigned Pathways & Other */}
        {(ncActive.length > 0 || ncAssigned.length > 0 || pathwayAssignedExecs.length > 0) && (
          <TrainingSection title="Other Assigned" icon={ClipboardList}>
            <div className="grid gap-4 sm:grid-cols-2">
              {ncActive.map((exec) => (
                <ExecutionCard key={exec.id} exec={exec} />
              ))}
              {pathwayAssignedExecs.map((exec) => (
                <ExecutionCard
                  key={exec.id}
                  exec={exec}
                  onActivate={(id) => activateMutation.mutate(id)}
                  isActivating={activateMutation.isPending}
                />
              ))}
              {ncAssigned.map((exec) => (
                <ExecutionCard
                  key={exec.id}
                  exec={exec}
                  onActivate={(id) => activateMutation.mutate(id)}
                  isActivating={activateMutation.isPending}
                />
              ))}
            </div>
          </TrainingSection>
        )}

        {/* Completed */}
        <TrainingSection title="Completed" icon={Award}>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : cpCompleted.length > 0 || ncCompleted.length > 0 || pwCompleted.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {pwCompleted.map((pw) => (
                <PathwayProgressCard key={pw.id} pw={pw} onRefresh={handleRefreshPathway} isRefreshing={false} />
              ))}
              {cpCompleted.map((cp) => (
                <CourseProgressCard key={cp.id} cp={cp} onAction={handleCourseAction} isActioning={courseAction.isPending} />
              ))}
              {ncCompleted.map((exec) => (
                <ExecutionCard key={exec.id} exec={exec} />
              ))}
            </div>
          ) : (
            <TrainingEmptyState icon={Award} message="No completed training yet" hint="Complete courses and pathways to see them here." />
          )}
        </TrainingSection>

        {/* Bridge to Recommendations — decision layer */}
        <TrainingSection title="Personalized Recommendations" icon={Sparkles} linkTo="/app/teacher/recommendations">
          <Card className="border border-border bg-muted/30">
            <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Discover what to learn next</p>
                <p className="text-sm text-muted-foreground">View personalized course and pathway suggestions based on your skills and career gaps.</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/app/teacher/recommendations">View Recommendations</Link>
              </Button>
            </CardContent>
          </Card>
        </TrainingSection>

        {/* Recent Credentials */}
        <TrainingSection title="Recent Credentials" icon={Award} linkTo="/app/teacher/credentials">
          <TrainingEmptyState icon={Award} message="No credentials earned yet" hint="Complete courses and pathways to earn certificates and badges." />
        </TrainingSection>

        {/* Mentor Support */}
        <TrainingSection title="Mentor Support" icon={Users} linkTo="/app/teacher/mentors">
          <Card className="border border-border bg-muted/30">
            <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Get guided support from an expert mentor</p>
                <p className="text-sm text-muted-foreground">Mentors help you apply learning, reflect on practice, and grow with confidence.</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/app/teacher/mentors">Explore Mentors</Link>
              </Button>
            </CardContent>
          </Card>
        </TrainingSection>

        {/* Library */}
        <TrainingSection title="Library" icon={BookMarked} linkTo="/app/teacher/library">
          <TrainingEmptyState icon={Library} message="Browse the training library" hint="Explore resources, guides, and toolkits to support your practice." />
        </TrainingSection>

        {/* Exit bridge — back to recommendations */}
        <div className="flex justify-center pt-4 border-t border-border/30">
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/teacher/recommendations">
              <Lightbulb className="h-3.5 w-3.5 mr-1" /> Back to recommendations
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeacherTraining;
