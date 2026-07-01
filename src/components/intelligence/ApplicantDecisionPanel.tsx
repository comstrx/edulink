/**
 * ApplicantDecisionPanel — Full decision intelligence for an applicant
 *
 * Expandable panel that shows readiness, risks, signals, and ranking
 * for a single applicant. Uses the decision intelligence hook.
 *
 * Sprint 7D — School Decision Intelligence Layer
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCandidateDecisionIntelligence } from "@/intelligence/decision/hooks/useCandidateDecisionIntelligence";
import CandidateReadinessPanel from "./CandidateReadinessPanel";
import HiringRiskPanel from "./HiringRiskPanel";
import DecisionSignalsPanel from "./DecisionSignalsPanel";
import RankingExplanationPanel from "./RankingExplanationPanel";

interface Props {
  teacherId: string;
}

export default function ApplicantDecisionPanel({ teacherId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { data: intelligence, isLoading } = useCandidateDecisionIntelligence(teacherId);

  if (isLoading || !intelligence) return null;

  const riskCount = intelligence.risks.risks.length;
  const strengthCount = intelligence.decisionSignals.signals.length;

  return (
    <div className="mt-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-[10px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        <Brain className="h-3 w-3" />
        Decision Intelligence
        {riskCount > 0 && (
          <span className="text-destructive font-medium">{riskCount} risk{riskCount > 1 ? "s" : ""}</span>
        )}
        {strengthCount > 0 && (
          <span className="text-emerald-600 font-medium">{strengthCount} strength{strengthCount > 1 ? "s" : ""}</span>
        )}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {expanded && (
        <div className={cn(
          "mt-1.5 rounded-lg border border-border/60 bg-muted/20 p-3 space-y-4",
          "animate-in fade-in-0 slide-in-from-top-1 duration-200",
        )}>
          <DecisionSignalsPanel signals={intelligence.decisionSignals} />
          <HiringRiskPanel risks={intelligence.risks} />
          <CandidateReadinessPanel breakdown={intelligence.readiness} />
          <RankingExplanationPanel explanation={intelligence.rankingExplanation} />
        </div>
      )}
    </div>
  );
}
