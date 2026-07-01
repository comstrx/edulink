import { useNavigate, Link } from "react-router-dom";
import { RecommendationExplainTooltipContent } from "@/components/intelligence/RecommendationExplainTooltip";
import {
  Target, Layers, ShieldCheck, Lightbulb, TrendingUp, Info, CheckCircle2,
  Loader2, ArrowRight, ChevronRight, Home, AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTeacherProfileId } from "@/hooks/useTeacherProfileId";
import { useTeacherSkills } from "@/hooks/useTeacherSkills";
import { useTeacherGapSnapshot } from "@/intelligence/consumption/hooks/useTeacherGapSnapshot";
import { useRecommendationsForSurface } from "@/intelligence/adapters/hooks/useRecommendationsForSurface";
import { getUserExperienceMode, applyOnboardingSurfacePolicy, getOnboardingSurfaceMessage } from "@/intelligence/experience/onboarding-mode";
import OnboardingSurfaceBanner from "@/components/intelligence/OnboardingSurfaceBanner";
import { executeRecommendationAction } from "@/actions/recommendation-action.handler";
import { resolveActionMapEntry } from "@/actions/recommendation-action.map";
import {
  STATUS_LABELS, STATUS_STYLES, COMPLETED_ITEM_CLASS,
  JOURNEY_CARD_STYLES, JOURNEY_SECTION_LABELS, getImpactLine, getStatusCTALabel, isActionable, getPathwayLabel, getConfidenceDisplay,
} from "@/intelligence/adapters/recommendation-presentation.constants";
import { getFramedTitle, getFramedExplanation, getFramedSubtitle } from "@/intelligence/adapters/helpers/surface-framing";
import { groupByJourneyState } from "@/intelligence/adapters/helpers/getRecommendationState";
import { cn } from "@/lib/utils";

const severityColor = (s: string) =>
  s === "critical" ? "destructive" : s === "high" ? "destructive" : s === "medium" ? "secondary" : "outline";

const proficiencyLabel = (level: string | null) => {
  if (!level) return "Tracked";
  const map: Record<string, string> = {
    beginner: "Emerging",
    intermediate: "Developing",
    advanced: "Proficient",
    expert: "Expert",
  };
  return map[level] ?? level;
};

const proficiencyVariant = (level: string | null): "default" | "secondary" | "outline" => {
  if (level === "advanced" || level === "expert") return "default";
  if (level === "intermediate") return "secondary";
  return "outline";
};

/* ── Neutral section wrapper (replaces TrainingSection) ── */
const Section = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-5 w-5 text-primary" />}
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    </div>
    {children}
  </section>
);

/* ── Empty state (replaces TrainingEmptyState) ── */
const EmptyHint = ({
  icon: Icon,
  message,
  hint,
}: {
  icon: React.ElementType;
  message: string;
  hint: string;
}) => (
  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-2">
    <Icon className="h-8 w-8 opacity-40" />
    <p className="font-medium text-foreground/70">{message}</p>
    <p className="text-xs max-w-sm">{hint}</p>
  </div>
);

const Skills = () => {
  const navigate = useNavigate();
  const { data: teacherId, isLoading: profileLoading } = useTeacherProfileId();
  const { data: skills, isLoading: skillsLoading } = useTeacherSkills(teacherId ?? null);
  const gapResult = useTeacherGapSnapshot(teacherId ?? undefined);
  const { items: allRecs, isLoading: recsLoading, error: recsError, segment } = useRecommendationsForSurface("skills", teacherId ?? undefined);

  const experienceMode = getUserExperienceMode(segment, allRecs.filter(i => i.status === "completed").length);
  const effectiveRecs = experienceMode === "onboarding" ? applyOnboardingSurfacePolicy("skills", allRecs) : allRecs;
  const onboardingMessage = experienceMode === "onboarding" ? getOnboardingSurfaceMessage("skills") : null;

  const isLoading = profileLoading || skillsLoading || gapResult.status === "loading" || recsLoading;

  const strengths = (skills ?? []).filter(
    (s) => s.proficiency_level === "advanced" || s.proficiency_level === "expert"
  );

  const otherSkills = (skills ?? []).filter(
    (s) => s.proficiency_level !== "advanced" && s.proficiency_level !== "expert"
  );

  const gaps = gapResult.status === "ready" || gapResult.status === "stale"
    ? gapResult.data?.gaps ?? []
    : [];

  const groupedSummary = gapResult.status === "ready" || gapResult.status === "stale"
    ? gapResult.data?.groupedSummary ?? []
    : [];

  // Surface distribution already filters by training/evidence/certification groupKeys
  const gapLinkedRecs = effectiveRecs.slice(0, 8);

  const journeyGroups = groupByJourneyState(gapLinkedRecs);

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto flex items-center justify-center gap-2 text-muted-foreground py-20">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading skills…</span>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-8 max-w-5xl mx-auto">
      {/* ── Breadcrumb ── */}
      <div className="space-y-1">
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          <Home className="h-3.5 w-3.5" />
          <Link to="/app/teacher/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Skills</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <span className="truncate">Skills &amp; Competencies</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your professional identity — strengths, gaps, and growth opportunities.
            </p>
          </div>
        </div>
      </div>

      {/* Gap Summary by Category */}
      {groupedSummary.length > 0 && (
        <Section title="Skill Gap Overview" icon={Layers}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupedSummary.map((g) => (
              <Card key={g.category} className="border border-border">
                <CardContent className="p-4 space-y-2">
                  <p className="font-medium text-foreground capitalize">{g.category.replace(/_/g, " ")}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{g.count} gap{g.count !== 1 ? "s" : ""} identified</span>
                    <Badge variant={severityColor(g.highestSeverity)} className="text-xs capitalize">
                      {g.highestSeverity}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Strength Areas */}
      <Section title="Strength Areas" icon={ShieldCheck}>
        {strengths.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {strengths.map((s) => (
              <Card key={s.id} className="border border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <p className="font-medium text-foreground">{s.skill_name ?? s.skill_term_id}</p>
                  <Badge variant={proficiencyVariant(s.proficiency_level)} className="text-xs">
                    {proficiencyLabel(s.proficiency_level)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyHint icon={ShieldCheck} message="No strengths identified yet" hint="Add skills to your profile and complete training to build your strengths." />
        )}
      </Section>

      {/* Skill Gaps */}
      <Section title="Identified Gaps" icon={Lightbulb}>
        {gaps.length > 0 ? (
          <div className="space-y-3">
            {gaps.map((g) => (
              <Card key={g.gapId} className="border border-border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">{g.label || "Unnamed gap"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{(g.category ?? "general").replace(/_/g, " ")}</p>
                    </div>
                    <Badge variant={severityColor(g.severity ?? "medium")} className="text-xs capitalize">
                      {g.severity ?? "medium"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyHint icon={Lightbulb} message="No gaps identified" hint="Gaps will surface as your skills profile develops and intelligence engines run." />
        )}
      </Section>

      {/* Recommended Learning — journey grouped */}
      {recsError && (
        <Section title="Recommended Learning" icon={TrendingUp}>
          <div className="flex items-center gap-2 rounded-md bg-destructive/[0.04] px-3 py-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive/70" />
            <span>Unable to load recommendations right now</span>
          </div>
        </Section>
      )}
      {!recsError && journeyGroups.length > 0 && (
        <Section title="Recommended Learning" icon={TrendingUp}>
          <OnboardingSurfaceBanner message={onboardingMessage} />
          <div className="space-y-4">
            {journeyGroups.map((group) => (
              <div key={group.state} className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {JOURNEY_SECTION_LABELS[group.state] ?? group.label}
                </p>
                {group.items.map((r) => {
                  const isComplete = group.state === "completed";
                  const mapEntry = resolveActionMapEntry(r.actionType);
                  const isUnsupported = mapEntry.actionType === "unsupported_action";
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isComplete && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />}
                            <p className="font-medium text-foreground">
                              {getFramedTitle(r, "skills")}
                            </p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs">
                                  <RecommendationExplainTooltipContent rec={{
                                    source: r.source,
                                    actionType: r.actionType,
                                    status: r.status,
                                    reasonCodes: r.reasonCodes,
                                    confidence: r.confidence,
                                    groupKey: r.groupKey,
                                    pathwayContext: r.pathwayContext,
                                  }} />
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={cn("text-xs border", STATUS_STYLES[r.status])}>
                              {STATUS_LABELS[r.status]}
                            </Badge>
                          </div>
                        </div>
                        {getFramedExplanation(r, "skills") && (
                          <p className="text-[11px] text-foreground/70 leading-snug">
                            {getFramedExplanation(r, "skills")}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/80 italic leading-snug">
                          {getFramedSubtitle(r, "skills")}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-[10px] italic", getConfidenceDisplay(r).style)}>
                            {getConfidenceDisplay(r).label}
                          </span>
                          {r.source === "growth" && (
                            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                              From hiring feedback
                            </Badge>
                          )}
                          {getPathwayLabel(r) && (
                            <Badge variant="outline" className="text-[10px] border-chart-2/30 text-chart-2">
                              {getPathwayLabel(r)}
                            </Badge>
                          )}
                          {!isUnsupported && isActionable(r.status) && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs gap-1 px-3"
                              onClick={() => {
                                executeRecommendationAction(
                                  {
                                    recommendationId: r.id,
                                    type: r.actionType,
                                    targetResourceId: r.targetId ?? "",
                                    actionLabelKey: r.title,
                                    priority: r.priority,
                                    traceId: r.traceId,
                                    pathwayContext: r.pathwayContext,
                                  },
                                  navigate,
                                  teacherId,
                                );
                              }}
                            >
                              {getStatusCTALabel(r.status, mapEntry.ctaLabel)}
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Other tracked skills */}
      {otherSkills.length > 0 && (
        <Section title="All Tracked Skills" icon={Target}>
          <div className="grid gap-3 sm:grid-cols-2">
            {otherSkills.map((s) => (
              <Card key={s.id} className="border border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <p className="font-medium text-foreground">{s.skill_name ?? s.skill_term_id}</p>
                  <Badge variant={proficiencyVariant(s.proficiency_level)} className="text-xs">
                    {proficiencyLabel(s.proficiency_level)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

export default Skills;
