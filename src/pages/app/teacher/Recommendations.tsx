import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Lightbulb, TrendingUp, Target, CheckCircle2,
  Loader2, AlertCircle, ArrowRight, ChevronDown, ChevronUp, GraduationCap,
  LayoutDashboard,
} from "lucide-react";
import TeacherContextBar from "@/components/teacher/TeacherContextBar";
import TrainingSection from "@/components/training/TrainingSection";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTeacherProfileId } from "@/hooks/useTeacherProfileId";
import { useRecommendationsForSurface } from "@/intelligence/adapters/hooks/useRecommendationsForSurface";
import { distributeRecommendationsPage } from "@/intelligence/recommendations/distribution";
import { getUserExperienceMode, applyOnboardingSurfacePolicy, getOnboardingSurfaceMessage } from "@/intelligence/experience/onboarding-mode";
import OnboardingSurfaceBanner from "@/components/intelligence/OnboardingSurfaceBanner";
import { useRecommendationStatusToast } from "@/intelligence/adapters/hooks/useRecommendationStatusToast";
import { executeRecommendationAction } from "@/actions/recommendation-action.handler";
import { resolveActionMapEntry } from "@/actions/recommendation-action.map";
import RecommendationExplanationPanel from "@/components/intelligence/RecommendationExplanationPanel";
import {
  PRIORITY_STYLES, PRIORITY_LABELS, STATUS_LABELS, STATUS_STYLES,
  getStatusCTALabel, isActionable, COMPLETED_ITEM_CLASS, getImpactLine,
  JOURNEY_CARD_STYLES, JOURNEY_SECTION_LABELS, getLossAversionLine, getProgressIndicator,
  getConfidenceDisplay,
} from "@/intelligence/adapters/recommendation-presentation.constants";
import { getFramedTitle, getFramedExplanation } from "@/intelligence/adapters/helpers/surface-framing";
import { groupByJourneyState } from "@/intelligence/adapters/helpers/getRecommendationState";
import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

const Recommendations = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: teacherId, isLoading: profileLoading } = useTeacherProfileId();
  const { items: recs, isLoading: recsLoading, error, segment, messaging } = useRecommendationsForSurface("recommendations_page", teacherId ?? undefined);
  const navigate = useNavigate();

  useRecommendationStatusToast(recs);

  const isLoading = profileLoading || recsLoading;

  const experienceMode = getUserExperienceMode(segment, recs.filter(i => i.status === "completed").length);
  const effectiveRecs = experienceMode === "onboarding" ? applyOnboardingSurfacePolicy("recommendations_page", recs) : recs;
  const onboardingMessage = experienceMode === "onboarding" && effectiveRecs.length <= 3 ? getOnboardingSurfaceMessage("recommendations_page") : null;

  // Pre-computed grouping from distribution layer
  const pageDist = distributeRecommendationsPage(effectiveRecs);
  const grouped = pageDist.grouped;

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

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto flex items-center justify-center gap-2 text-muted-foreground py-20">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading recommendations…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 text-destructive py-10">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load recommendations. Please try again later.</span>
        </div>
      </div>
    );
  }

  const journeyGroups = groupByJourneyState(effectiveRecs);

  return (
    <div className="px-4 sm:px-6 py-6 space-y-8 max-w-5xl mx-auto">
      {/* Standalone breadcrumb — not under Training */}
      <div className="space-y-1">
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          <LayoutDashboard className="h-3.5 w-3.5" />
          <Link to="/app/teacher/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
        </nav>
        <div className="min-w-0 pt-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <span className="truncate">Recommendations</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personalized growth actions based on your professional profile and career goals.
          </p>
        </div>
      </div>

        <TeacherContextBar
          teacherId={teacherId ?? undefined}
          contextMessage="Your readiness summary and focus area."
        />

        <OnboardingSurfaceBanner message={onboardingMessage} />

        {effectiveRecs.length === 0 ? (
          <>
            <TrainingEmptyState
              icon={Lightbulb}
              message="No recommendations yet"
              hint={messaging.emptyStateMessage}
            />
            <div className="flex justify-center">
              <Button asChild variant="outline" size="sm">
                <Link to="/app/teacher/training">
                  <GraduationCap className="h-3.5 w-3.5 mr-1" /> Explore training to improve your profile
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Journey-grouped recommendations */}
            {journeyGroups.map((group) => (
              <TrainingSection
                key={group.state}
                title={`${JOURNEY_SECTION_LABELS[group.state] ?? group.label} (${group.items.length})`}
                icon={group.state === "completed" ? CheckCircle2 : group.state === "in_progress" ? TrendingUp : Target}
              >
                <div className="space-y-3">
                  {group.items.map((r) => {
                    const mapEntry = resolveActionMapEntry(r.actionType);
                    const isUnsupported = mapEntry.actionType === "unsupported_action";
                    const isComplete = group.state === "completed";
                    return (
                      <Card
                        key={r.id}
                        className={cn(
                          "border",
                          JOURNEY_CARD_STYLES[group.state] ?? "border-border",
                          isComplete && COMPLETED_ITEM_CLASS,
                        )}
                      >
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2">
                                {isComplete && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />}
                                <p className="font-medium text-foreground">
                                  {getFramedTitle(r, "recommendations")}
                                </p>
                              </div>
                              {getFramedExplanation(r, "recommendations") && (
                                <p className="text-[11px] text-foreground/70 leading-snug">
                                  {getFramedExplanation(r, "recommendations")}
                                </p>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={cn("text-xs border", PRIORITY_STYLES[r.priority] ?? PRIORITY_STYLES.medium)}>
                                  {PRIORITY_LABELS[r.priority] ?? r.priority}
                                </Badge>
                                <Badge variant="outline" className={cn("text-xs border", STATUS_STYLES[r.status])}>
                                  {STATUS_LABELS[r.status]}
                                </Badge>
                                {r.source === "growth" && (
                                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                                    From hiring feedback
                                  </Badge>
                                )}
                                {r.groupKey && (
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {r.groupKey.replace(/_/g, " ")}
                                  </span>
                                )}
                                <span className={cn("text-[10px] italic", getConfidenceDisplay(r).style)}>
                                  {getConfidenceDisplay(r).label}
                                </span>
                              </div>
                              {/* Loss aversion nudge */}
                              {!isComplete && getLossAversionLine(r) && (
                                <p className="text-[11px] text-destructive/70 font-medium leading-snug">
                                  ⚠ {getLossAversionLine(r)}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground/80 italic leading-snug">
                                {getImpactLine(r)}
                              </p>
                              <div className="flex items-center gap-2 pt-0.5">
                                {!isUnsupported && isActionable(r.status) && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="h-7 text-xs gap-1 px-3"
                                    onClick={() => handleAction(r)}
                                  >
                                    {getStatusCTALabel(r.status, mapEntry.ctaLabel)}
                                    <ArrowRight className="h-3 w-3" />
                                  </Button>
                                )}
                                <button
                                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                                >
                                  {expandedId === r.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  Why?
                                </button>
                              </div>
                            </div>
                          </div>
                          {expandedId === r.id && (
                            <RecommendationExplanationPanel recommendation={{
                              recommendationId: r.id,
                              type: r.actionType,
                              priority: r.priority,
                              confidence: r.confidence ?? "medium",
                              reasonCodes: r.reasonCodes,
                              relatedGapIds: [],
                              groupKey: r.groupKey ?? "immediate_actions",
                              actionLabelKey: r.title,
                              source: r.source,
                              status: r.status,
                              pathwayContext: r.pathwayContext,
                            }} />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TrainingSection>
            ))}

            {/* Training bridge */}
            <div className="flex justify-center pt-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/app/teacher/training">
                  <GraduationCap className="h-3.5 w-3.5 mr-1" /> Explore training to improve your profile
                </Link>
              </Button>
            </div>

            {/* Grouped summary */}
            {Object.keys(grouped).length > 1 && (
              <TrainingSection title="By Action Type" icon={Target}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(grouped).map(([key, items]) => (
                    <Card key={key} className="border border-border">
                      <CardContent className="p-4 space-y-2">
                        <p className="font-medium text-foreground capitalize">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {items.length} recommendation{items.length !== 1 ? "s" : ""}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TrainingSection>
            )}
          </>
        )}
    </div>
  );
};

export default Recommendations;
