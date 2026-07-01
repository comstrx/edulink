import { BookOpen, CheckCircle2, Inbox, Route as RouteIcon, Loader2, AlertCircle } from "lucide-react";
import TeacherContextBar from "@/components/teacher/TeacherContextBar";
import { useTeacherProfileId } from "@/hooks/useTeacherProfileId";
import { useNavigate } from "react-router-dom";
import TrainingSubNav from "@/components/training/TrainingSubNav";
import TrainingHeader from "@/components/training/TrainingHeader";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import LearningProgressCard from "@/components/training/LearningProgressCard";
import AssignedLearningCard from "@/components/training/AssignedLearningCard";
import CompletedLearningCard from "@/components/training/CompletedLearningCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCourseProgressList, useCourseProgressAction } from "@/hooks/useCourseProgress";
import { useTeacherExecutions } from "@/hooks/useTrainingExecutions";
import { usePathwayExecutions } from "@/hooks/usePathwayRuntime";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import type { LearningProgressItem } from "@/components/training/LearningProgressCard";
import type { AssignedLearningItem } from "@/components/training/AssignedLearningCard";
import type { CompletedLearningItem } from "@/components/training/CompletedLearningCard";

const MyLearning = () => {
  const navigate = useNavigate();
  const { data: teacherProfileId } = useTeacherProfileId();
  const { data: courseProgress, isLoading: cpLoading, error: cpError } = useCourseProgressList();
  const courseAction = useCourseProgressAction();
  const { data: executions, isLoading: exLoading, error: exError } = useTeacherExecutions();
  const { data: pathways, isLoading: pwLoading, error: pwError } = usePathwayExecutions();

  const isLoading = cpLoading || exLoading || pwLoading;
  const error = cpError || exError || pwError;

  // Derive sections from real runtime data
  const inProgress: LearningProgressItem[] = (courseProgress ?? [])
    .filter((cp) => cp.progress_status === "in_progress")
    .map((cp) => {
      const pct = cp.progress_percent ?? 0;
      return {
        title: cp.course_title,
        type: "Course",
        progress: pct,
        module: pct > 0 ? `${pct}% complete` : "Started",
        updated: cp.last_activity_at
          ? new Date(cp.last_activity_at).toLocaleDateString()
          : "—",
        executionId: cp.execution_id,
      };
    });

  const assigned: AssignedLearningItem[] = (executions ?? [])
    .filter((e) => e.execution_status === "assigned")
    .map((e) => ({
      title: e.item_title,
      type: e.training_item_type === "course" ? "Course" : "Pathway",
      assignedBy: "School",
      deadline: e.due_date
        ? new Date(e.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "No deadline",
    }));

  const completed: CompletedLearningItem[] = (courseProgress ?? [])
    .filter((cp) => cp.progress_status === "completed")
    .map((cp) => ({
      title: cp.course_title,
      type: "Course",
      completedDate: cp.completed_at
        ? new Date(cp.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—",
      credential: null,
    }));

  // Active pathways from pathway runtime
  const activePathways = (pathways ?? []).filter((p) => p.status === "active");
  const completedPathways = (pathways ?? []).filter((p) => p.status === "completed");

  if (isLoading) {
    return (
      <div>
        <TrainingSubNav />
        <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto flex items-center justify-center gap-2 text-muted-foreground py-20">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your learning…</span>
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
            <span>Failed to load learning data. Please try again later.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TrainingSubNav />
      <div className="px-4 sm:px-6 py-6 space-y-6 max-w-5xl mx-auto">
        <TrainingHeader
          title="My Learning"
          icon={BookOpen}
          description="Track everything you're learning, assigned, or have completed."
          rootTo="/app/teacher/training"
        />

        <TeacherContextBar
          teacherId={teacherProfileId ?? undefined}
          contextMessage="This training helps improve your readiness."
        />

        <Tabs defaultValue="in-progress" className="w-full">
          <TabsList className="w-full max-w-lg flex overflow-x-auto scrollbar-hide">
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="assigned">Assigned</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="pathways">Pathways</TabsTrigger>
          </TabsList>

          <TabsContent value="in-progress" className="mt-6 space-y-4">
            {inProgress.length > 0
              ? inProgress.map((item) => (
                  <LearningProgressCard
                    key={item.title}
                    item={item}
                    isBusy={courseAction.isPending}
                    onContinue={(execId) => {
                      courseAction.mutate(
                        { executionId: execId, action: "continue" },
                        {
                          onSuccess: () => toast.success("Activity recorded"),
                          onError: () => toast.error("Failed to continue course"),
                        },
                      );
                    }}
                  />
                ))
              : <TrainingEmptyState icon={BookOpen} message="No courses in progress" hint="Enroll in a course from the training catalog to start learning." />
            }
          </TabsContent>

          <TabsContent value="assigned" className="mt-6 space-y-4">
            {assigned.length > 0
              ? assigned.map((item) => <AssignedLearningCard key={item.title} item={item} />)
              : <TrainingEmptyState icon={Inbox} message="Nothing assigned yet" hint="Your school may assign required training here." />
            }
          </TabsContent>

          <TabsContent value="completed" className="mt-6 space-y-4">
            {completed.length > 0
              ? completed.map((item) => <CompletedLearningCard key={item.title} item={item} />)
              : <TrainingEmptyState icon={CheckCircle2} message="No completed courses yet" hint="Finish a course to see it here." />
            }
            {completedPathways.length > 0 && (
              <div className="space-y-4 pt-4">
                <p className="text-sm font-medium text-muted-foreground">Completed Pathways</p>
                {completedPathways.map((p) => (
                  <Card key={p.id} className="border border-border bg-muted/20">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{p.pathway_title}</p>
                        <p className="text-xs text-muted-foreground">
                          Completed {p.completed_at ? new Date(p.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pathways" className="mt-6 space-y-4">
            {activePathways.length > 0 ? (
              activePathways.map((p) => (
                <Card key={p.id} className="border border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{p.pathway_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.completed_milestones_count} of {p.total_milestones_count} milestones · {p.completed_courses_count} of {p.total_courses_count} courses
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">Pathway</Badge>
                    </div>
                    <Progress value={p.computed_progress_percent} className="h-2" />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{p.computed_progress_percent}% complete</p>
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs font-medium" onClick={() => navigate("/app/teacher/pathways")}>Continue →</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <TrainingEmptyState icon={RouteIcon} message="No active pathways" hint="Start a pathway to build structured expertise toward a credential." />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyLearning;
