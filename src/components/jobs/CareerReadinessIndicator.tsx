/**
 * CareerReadinessIndicator — Job Details CRI widget
 *
 * Displays CRI score from intelligence snapshot when available,
 * falls back to placeholder when no snapshot exists.
 * Does NOT compute CRI — reads from consumption layer only.
 * Recommendations now consumed via unified layer with journey grouping.
 */

import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherProfileId } from "@/hooks/useTeacherProfileId";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Target, AlertTriangle, TrendingUp, CheckCircle2, Info,
  ArrowRight, Zap, BookOpen, MapPin, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RecommendationExplainTooltipContent } from "@/components/intelligence/RecommendationExplainTooltip";
import { useTeacherCriSnapshot } from "@/intelligence/consumption/hooks/useTeacherCriSnapshot";
import { useTeacherGapSnapshot } from "@/intelligence/consumption/hooks/useTeacherGapSnapshot";
import { useSurfaceRecommendations } from "@/intelligence/recommendations/distribution";
import { getUserExperienceMode, applyOnboardingSurfacePolicy, getOnboardingSurfaceMessage } from "@/intelligence/experience/onboarding-mode";
import OnboardingSurfaceBanner from "@/components/intelligence/OnboardingSurfaceBanner";
import { executeRecommendationAction } from "@/actions/recommendation-action.handler";
import { resolveActionMapEntry } from "@/actions/recommendation-action.map";
import {
  PRIORITY_LABELS, PRIORITY_STYLES, STATUS_LABELS, STATUS_STYLES,
  formatRecommendationTitle, getStatusCTALabel, isActionable, COMPLETED_ITEM_CLASS, getImpactLine, getExplanationLine,
  JOURNEY_CARD_STYLES, getPathwayLabel,
} from "@/intelligence/adapters/recommendation-presentation.constants";
import { getRecommendationState } from "@/intelligence/adapters/helpers/getRecommendationState";
import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

interface CareerReadinessIndicatorProps {
  jobId?: string;
}

const scoreColor = (score: number) => {
  if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 65) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
};

const progressColor = (score: number) => {
  if (score >= 85) return "[&>div]:bg-emerald-500";
  if (score >= 65) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-destructive";
};

const breakdownIcon = (key: string) => {
  if (key === "skills" || key === "subjects") return BookOpen;
  if (key === "experience") return Briefcase;
  return MapPin;
};

const CareerReadinessIndicator = ({ jobId }: CareerReadinessIndicatorProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: teacherProfileId } = useTeacherProfileId();
  const profile = teacherProfileId ? { id: teacherProfileId } : null;
  const teacherId = profile?.id;

  // Read intelligence snapshots — no computation
  const criResult = useTeacherCriSnapshot(teacherId, jobId);
  const gapResult = useTeacherGapSnapshot(teacherId);
  const { items: unifiedRecs, isLoading: recsLoading, error: recsError, segment } = useSurfaceRecommendations(teacherId, "cri");

  // Loading state
  if (criResult.status === "loading") {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-2.5 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasCriData = criResult.status === "ready" || criResult.status === "stale";
  const overall = hasCriData ? criResult.data!.score : null;
  const dimensions = hasCriData ? criResult.data!.dimensions : [];

  const hasGapData = gapResult.status === "ready" || gapResult.status === "stale";
  const missingItems = hasGapData
    ? gapResult.data!.gaps.slice(0, 4).map((g) => g.label)
    : [];

  const experienceMode = getUserExperienceMode(segment, unifiedRecs.filter(i => i.status === "completed").length);
  const effectiveRecs = experienceMode === "onboarding" ? applyOnboardingSurfacePolicy("cri", unifiedRecs) : unifiedRecs;
  const onboardingMessage = experienceMode === "onboarding" ? getOnboardingSurfaceMessage("cri") : null;

  // Show top 1-2 next_step recommendations, then 1 in_progress if available
  const nextSteps = effectiveRecs.filter((r) => getRecommendationState(r) === "next_step").slice(0, 2);
  const inProgress = effectiveRecs.filter((r) => getRecommendationState(r) === "in_progress").slice(0, 1);
  const recommended = [...nextSteps, ...inProgress].slice(0, 3);

  const handleAction = (rec: UIRecommendation) => {
    executeRecommendationAction(
      {
        recommendationId: rec.id,
        type: rec.actionType,
        targetResourceId: rec.targetId ?? "",
        actionLabelKey: rec.title,
        priority: rec.priority,
        traceId: rec.traceId,
        pathwayContext: rec.pathwayContext,
      },
      navigate,
      teacherId,
    );
  };

  // Empty state — no snapshot
  if (!hasCriData && !hasGapData) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("jobDetails.readiness.title")}</h2>
              <p className="text-xs text-muted-foreground">
                {user ? "Complete your profile to see your readiness for this job" : "Sign in to see your readiness score"}
              </p>
            </div>
          </div>
          {!user && (
            <Button asChild size="sm" className="w-full">
              <Link to="/login">Sign in to view readiness</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t("jobDetails.readiness.title")}</h2>
            <p className="text-xs text-muted-foreground">{t("jobDetails.readiness.overallDesc")}</p>
          </div>
        </div>

        {/* Overall score */}
        {overall != null && (
          <div className="flex items-center gap-4">
            <div className={cn("text-3xl font-bold tabular-nums", scoreColor(overall))}>
              {overall}%
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{t("jobDetails.readiness.overallMatch")}</p>
              <Progress value={overall} className={cn("h-2.5", progressColor(overall))} />
            </div>
          </div>
        )}

        {criResult.metadata.isStale && (
          <p className="text-[10px] text-muted-foreground italic">Score may be outdated</p>
        )}

        {/* Breakdown from snapshot dimensions */}
        {dimensions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              {dimensions.map((dim) => {
                const Icon = breakdownIcon(dim.dimension);
                const pct = Math.round((dim.score / dim.maxScore) * 100);
                return (
                  <div key={dim.dimension} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground flex-1">{dim.label}</span>
                    <span className={cn("text-sm font-semibold tabular-nums", scoreColor(pct))}>
                      {pct}%
                    </span>
                    <Progress value={pct} className={cn("h-1.5 w-20", progressColor(pct))} />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Missing requirements from gap snapshot */}
        {missingItems.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                {t("jobDetails.readiness.missing")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {missingItems.map((req) => (
                  <Badge key={req} variant="outline" className="text-xs gap-1.5 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40">
                    <AlertTriangle className="h-3 w-3" />
                    {req}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Recommended next steps — journey aware */}
        {recsError && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/[0.04] px-3 py-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive/70" />
            <span>Unable to load recommendations</span>
          </div>
        )}
        {!recsError && recommended.length > 0 && (
          <>
            <Separator />
            <OnboardingSurfaceBanner message={onboardingMessage} />
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                {t("jobDetails.readiness.recommended")}
              </h3>
              <div className="space-y-2">
                {recommended.map((rec) => {
                  const state = getRecommendationState(rec);
                  const mapEntry = resolveActionMapEntry(rec.actionType);
                  const isUnsupported = mapEntry.actionType === "unsupported_action";
                  const canAct = !isUnsupported && isActionable(rec.status);
                  const isComplete = state === "completed";
                  return (
                    <button
                      key={rec.id}
                      onClick={() => canAct && handleAction(rec)}
                      disabled={!canAct}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg border p-3 transition-colors group text-left",
                        JOURNEY_CARD_STYLES[state] ?? "border-border/50",
                        canAct ? "hover:bg-accent/50" : "",
                        isComplete && COMPLETED_ITEM_CLASS,
                      )}
                    >
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Zap className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium text-foreground truncate", canAct && "group-hover:text-primary transition-colors")}>
                          {formatRecommendationTitle(rec.title)}
                        </p>
                        {getExplanationLine(rec) && (
                          <p className="text-[9px] text-foreground/70 leading-snug truncate">
                            {getExplanationLine(rec)}
                          </p>
                        )}
                        <p className="text-[9px] text-muted-foreground/80 italic leading-snug truncate">
                          {getImpactLine(rec)}
                        </p>
                        {getPathwayLabel(rec) && (
                          <span className="text-[8px] text-chart-2/80">
                            {getPathwayLabel(rec)}
                          </span>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground cursor-help">
                                <Info className="h-3 w-3" />
                                {rec.confidence ? `${rec.confidence} confidence` : "Why?"}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              <RecommendationExplainTooltipContent rec={{
                                source: rec.source,
                                actionType: rec.actionType,
                                status: rec.status,
                                reasonCodes: rec.reasonCodes,
                                confidence: rec.confidence,
                                groupKey: rec.groupKey,
                                pathwayContext: rec.pathwayContext,
                              }} />
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", STATUS_STYLES[rec.status])}>
                            {STATUS_LABELS[rec.status]}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border", PRIORITY_STYLES[rec.priority] ?? PRIORITY_STYLES.medium)}>
                            {PRIORITY_LABELS[rec.priority] ?? rec.priority}
                          </Badge>
                          {rec.source === "growth" && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">
                              From hiring feedback
                            </Badge>
                          )}
                        </div>
                      </div>
                      {canAct && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* No hardcoded CTA — all actions go through unified recommendation handler above */}
      </CardContent>
    </Card>
  );
};

export default CareerReadinessIndicator;
