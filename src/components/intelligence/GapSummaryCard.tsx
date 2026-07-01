/**
 * GapSummaryCard — Teacher-facing gap snapshot widget
 *
 * Displays professional gaps from stable snapshot. Does NOT compute gaps.
 * Uses shared intelligence state components for loading/empty/error/stale.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, BookOpen, Award, Globe, Briefcase, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GapConsumptionResult } from "@/intelligence/consumption";
import IntelligenceLoadingSkeleton from "./IntelligenceLoadingSkeleton";
import IntelligenceErrorState from "./IntelligenceErrorState";
import IntelligenceStaleBanner from "./IntelligenceStaleBanner";
import IntelligenceStatusBanner from "./IntelligenceStatusBanner";
import GapExplanationPanel from "./GapExplanationPanel";

interface GapSummaryCardProps {
  result: GapConsumptionResult;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof BookOpen; label: string; actionLink: string; actionLabel: string }> = {
  certification: { icon: Award, label: "Certifications", actionLink: "/training/credentials", actionLabel: "Browse credentials" },
  subject: { icon: BookOpen, label: "Subjects", actionLink: "/training", actionLabel: "Find training" },
  curriculum: { icon: BookOpen, label: "Curriculum", actionLink: "/app/teacher/profile", actionLabel: "Update profile" },
  language: { icon: Globe, label: "Languages", actionLink: "/training", actionLabel: "Language courses" },
  experience: { icon: Briefcase, label: "Experience", actionLink: "/app/teacher/profile", actionLabel: "Update experience" },
  skill: { icon: BookOpen, label: "Skills", actionLink: "/training", actionLabel: "Build skills" },
};

const GapSummaryCard = ({ result }: GapSummaryCardProps) => {
  const [showExplanation, setShowExplanation] = useState(false);
  if (result.status === "loading") {
    return <IntelligenceLoadingSkeleton rows={3} />;
  }

  if (result.status === "error") {
    return <IntelligenceErrorState message="Unable to load gap analysis" />;
  }

  if (result.status === "empty" || !result.data || result.data.totalGaps === 0) {
    return (
      <Card className="border-emerald-200/50 dark:border-emerald-800/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Professional Gaps</h2>
              <p className="text-xs text-muted-foreground">
                {result.status === "empty" ? "Complete your profile to see gap analysis" : "No professional gaps identified"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { gaps, totalGaps, groupedSummary } = result.data;
  const priorityGaps = gaps.slice(0, 4);

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Professional Gaps</h2>
              <p className="text-[11px] text-muted-foreground">{totalGaps} area{totalGaps !== 1 ? "s" : ""} for improvement</p>
            </div>
          </div>
        </div>

        {/* Category summary chips */}
        {groupedSummary.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {groupedSummary.map((g) => {
              const config = CATEGORY_CONFIG[g.category];
              const Icon = config?.icon ?? BookOpen;
              return (
                <Badge key={g.category} variant="outline" className="text-[10px] h-[20px] px-1.5 gap-0.5 font-medium border-border">
                  <Icon className="h-2.5 w-2.5" />
                  {config?.label ?? g.category}: {g.count}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Priority gap items */}
        <div className="space-y-2">
          {priorityGaps.map((gap) => {
            const config = CATEGORY_CONFIG[gap.category];
            const Icon = config?.icon ?? BookOpen;
            const link = config?.actionLink ?? "/training";
            const actionLabel = config?.actionLabel ?? "Take action";
            return (
              <Link
                key={gap.gapId}
                to={link}
                className="flex items-center gap-2 p-2 rounded-md border border-border/50 bg-muted/30 hover:bg-accent/50 hover:border-primary/30 transition-colors group"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground truncate block group-hover:text-primary transition-colors">{gap.label}</span>
                  <span className="text-[10px] text-muted-foreground hidden group-hover:inline-flex items-center gap-0.5">
                    {actionLabel} <ArrowRight className="h-2.5 w-2.5 inline" />
                  </span>
                </div>
                <Badge variant="outline" className="text-[9px] h-[16px] px-1 border-border text-muted-foreground">
                  {gap.category}
                </Badge>
              </Link>
            );
          })}
          {totalGaps > 4 && (
            <Link
              to="/app/teacher/profile"
              className="text-[11px] text-muted-foreground hover:text-primary text-center block transition-colors"
            >
              +{totalGaps - 4} more gap{totalGaps - 4 !== 1 ? "s" : ""} — View all →
            </Link>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-[11px] text-muted-foreground gap-1"
          onClick={() => setShowExplanation((v) => !v)}
        >
          {showExplanation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showExplanation ? "Hide explanation" : "Why these gaps?"}
        </Button>

        {showExplanation && result.data && <GapExplanationPanel data={result.data} />}

        <IntelligenceStatusBanner
          metadata={result.metadata}
          labels={{
            stale: "Gap analysis may be outdated",
            invalidated: "Gap analysis needs to be refreshed",
            recomputing: "Re-analyzing gaps…",
          }}
        />
      </CardContent>
    </Card>
  );
};

export default GapSummaryCard;
