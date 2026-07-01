/**
 * CareerPathCard — Progressive Domain Activation
 *
 * States:
 * - NOT STARTED: no career state data → purposeful CTA
 * - ACTIVE: career state exists → full display
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Milestone, ArrowRight, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useTeacherCareerState, type TeacherCareerStateView } from "@/career/paths/hooks/useTeacherCareerState";

interface CareerPathCardProps {
  teacherId: string | undefined;
}

function StageIndicator({ state }: { state: TeacherCareerStateView }) {
  const stageProgress = state.currentStageOrder && state.totalStages
    ? Math.round((state.currentStageOrder / state.totalStages) * 100)
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Milestone className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {state.currentPathName ?? "Career Path"}
          </span>
        </div>
        {state.currentStageName && (
          <Badge variant="secondary" className="text-xs">
            Stage {state.currentStageOrder}/{state.totalStages}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <div className="flex-1 rounded-lg border border-border p-2.5 bg-primary/5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Current</p>
          <p className="font-medium text-foreground mt-0.5">
            {state.currentStageName ?? "Not yet placed"}
          </p>
        </div>
        {state.nextStageName && (
          <>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 rounded-lg border border-border p-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Next</p>
              <p className="font-medium text-foreground mt-0.5">{state.nextStageName}</p>
            </div>
          </>
        )}
      </div>

      {state.nextStageName && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Next stage readiness</span>
            <span className="font-semibold text-foreground">{state.readinessPercent}%</span>
          </div>
          <Progress value={state.readinessPercent} className="h-2" />
        </div>
      )}

      <div className="flex items-center gap-3 text-xs">
        {state.satisfiedRequirementCount > 0 && (
          <span className="flex items-center gap-1 text-primary">
            <CheckCircle className="h-3 w-3" />
            {state.satisfiedRequirementCount} met
          </span>
        )}
        {state.unmetRequirementCount > 0 && (
          <span className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {state.unmetRequirementCount} unmet
          </span>
        )}
        {state.totalRequirementCount === 0 && (
          <span className="text-muted-foreground">No requirements defined yet</span>
        )}
      </div>

      {state.totalStages > 1 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Path progress</p>
          <Progress value={stageProgress} className="h-1.5" />
        </div>
      )}
    </div>
  );
}

export default function CareerPathCard({ teacherId }: CareerPathCardProps) {
  const { data: state, isLoading } = useTeacherCareerState(teacherId);

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Milestone className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Career Path</h2>
            <p className="text-xs text-muted-foreground">Your professional progression</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : state ? (
          <StageIndicator state={state} />
        ) : (
          /* NOT STARTED state */
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 space-y-2.5">
            <p className="text-sm font-medium text-foreground">
              Start building your career path
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Complete your profile and add credentials to unlock career stage tracking and progression insights.
            </p>
            <Link
              to="/app/teacher/profile"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <Milestone className="h-3 w-3" />
              Complete your profile
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
