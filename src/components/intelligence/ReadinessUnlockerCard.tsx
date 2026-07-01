/**
 * ReadinessUnlockerCard — Dashboard fallback for CRI when no job context exists
 *
 * Shown instead of ReadinessScoreCard when the teacher has no applications,
 * meaning CRI cannot produce a meaningful score. Explains why and provides
 * a clear next step without faking any metric.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Target, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ReadinessUnlockerCardProps {
  hasSkills: boolean;
  hasCredentials: boolean;
}

export default function ReadinessUnlockerCard({ hasSkills, hasCredentials }: ReadinessUnlockerCardProps) {
  const completedSteps = [hasSkills, hasCredentials].filter(Boolean).length;
  const totalSteps = 3; // skills, credentials, first application

  return (
    <Card className="border-primary/20">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Career Readiness</h2>
            <p className="text-[11px] text-muted-foreground">Unlock your readiness score</p>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">
            Your readiness score will appear after your first application
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Career readiness measures how well your profile aligns with specific roles. Build your profile now so your score is strong from day one.
          </p>

          {/* Progress indicators */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Profile progress</span>
              <span className="font-medium text-foreground">{completedSteps}/{totalSteps} steps</span>
            </div>
            <div className="flex gap-1.5">
              {[
                { done: hasSkills, label: "Skills" },
                { done: hasCredentials, label: "Credentials" },
                { done: false, label: "First application" },
              ].map((step) => (
                <div key={step.label} className="flex-1 space-y-1">
                  <div className={`h-1.5 rounded-full ${step.done ? "bg-primary" : "bg-muted"}`} />
                  <p className={`text-[10px] ${step.done ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {!hasSkills ? (
              <Link
                to="/app/teacher/profile"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                Add your skills
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                Browse jobs
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
