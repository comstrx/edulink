/**
 * ReadinessScoreCard — Teacher-facing CRI snapshot widget
 *
 * Displays CRI score/band from stable snapshot. Does NOT compute scores.
 * Uses shared intelligence state components for loading/empty/error/stale.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, AlertTriangle, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CriConsumptionResult } from "@/intelligence/consumption";
import IntelligenceLoadingSkeleton from "./IntelligenceLoadingSkeleton";
import IntelligenceEmptyState from "./IntelligenceEmptyState";
import IntelligenceErrorState from "./IntelligenceErrorState";
import IntelligenceStaleBanner from "./IntelligenceStaleBanner";
import IntelligenceStatusBanner from "./IntelligenceStatusBanner";
import CriExplanationPanel from "./CriExplanationPanel";

interface ReadinessScoreCardProps {
  result: CriConsumptionResult;
}

const BAND_CONFIG = {
  strong: { label: "Strong", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", icon: TrendingUp },
  moderate: { label: "Moderate", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800", icon: Minus },
  developing: { label: "Developing", className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800", icon: AlertTriangle },
  weak: { label: "Needs Improvement", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800", icon: AlertTriangle },
} as const;

const scoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-destructive";
};

const progressColor = (score: number) => {
  if (score >= 80) return "[&>div]:bg-emerald-500";
  if (score >= 60) return "[&>div]:bg-amber-500";
  if (score >= 40) return "[&>div]:bg-orange-500";
  return "[&>div]:bg-destructive";
};

const ReadinessScoreCard = ({ result }: ReadinessScoreCardProps) => {
  const [showExplanation, setShowExplanation] = useState(false);
  if (result.status === "loading") {
    return <IntelligenceLoadingSkeleton rows={3} />;
  }

  if (result.status === "error") {
    return <IntelligenceErrorState message="Unable to load readiness data" />;
  }

  if (result.status === "empty" || !result.data) {
    return (
      <IntelligenceEmptyState
        icon={Target}
        title="Career Readiness"
        message="Complete your profile to see your readiness score"
      />
    );
  }

  const { score, band, dimensions } = result.data;
  const bandConfig = BAND_CONFIG[band as keyof typeof BAND_CONFIG] ?? BAND_CONFIG.developing;
  const BandIcon = bandConfig.icon;

  return (
    <Card className="border-primary/20">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Career Readiness</h2>
              <p className="text-[11px] text-muted-foreground">Your overall readiness score</p>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-[10px] h-[20px] px-1.5 gap-0.5 font-medium border", bandConfig.className)}>
            <BandIcon className="h-2.5 w-2.5" />
            {bandConfig.label}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className={cn("text-3xl font-bold tabular-nums", scoreColor(score))}>
            {score}%
          </div>
          <div className="flex-1 space-y-1">
            <Progress value={score} className={cn("h-2.5", progressColor(score))} />
          </div>
        </div>

        {dimensions.length > 0 && (
          <div className="space-y-2 pt-1">
            {dimensions.map((dim) => (
              <div key={dim.dimension} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground flex-1 truncate">{dim.label}</span>
                <span className={cn("font-semibold tabular-nums w-8 text-right", scoreColor(Math.round((dim.score / dim.maxScore) * 100)))}>
                  {dim.score}/{dim.maxScore}
                </span>
                <Progress value={(dim.score / dim.maxScore) * 100} className={cn("h-1 w-16", progressColor(Math.round((dim.score / dim.maxScore) * 100)))} />
              </div>
            ))}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-[11px] text-muted-foreground gap-1"
          onClick={() => setShowExplanation((v) => !v)}
        >
          {showExplanation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showExplanation ? "Hide details" : "Why this score?"}
        </Button>

        {showExplanation && <CriExplanationPanel data={result.data} />}

        <IntelligenceStatusBanner
          metadata={result.metadata}
          labels={{
            stale: "Score may be outdated",
            invalidated: "Score needs to be refreshed",
            recomputing: "Recalculating your score…",
          }}
        />
      </CardContent>
    </Card>
  );
};

export default ReadinessScoreCard;
