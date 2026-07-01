/**
 * DecisionSignalsPanel — Positive decision context signals
 *
 * Shows "why hire" signals for a candidate. Presentation only.
 *
 * Sprint 7D — School Decision Intelligence Layer
 */

import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, ShieldCheck, Award, TrendingUp, Target, Route, UserCheck, Sparkles,
} from "lucide-react";
import type { DecisionSupportSignals, DecisionSignalType } from "@/intelligence/decision/types/decision-intelligence.types";

const SIGNAL_ICONS: Record<DecisionSignalType, typeof CheckCircle2> = {
  strong_curriculum_alignment: Target,
  verified_classroom_practice: ShieldCheck,
  strong_credentials: Award,
  recent_growth_activity: TrendingUp,
  high_match_score: Sparkles,
  pathway_completion: Route,
  mentor_validated: UserCheck,
  gap_free: CheckCircle2,
};

interface Props {
  signals: DecisionSupportSignals;
}

export default function DecisionSignalsPanel({ signals }: Props) {
  if (signals.signals.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
        Hiring Strengths
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {signals.signals.map((signal, i) => {
          const Icon = SIGNAL_ICONS[signal.type] ?? CheckCircle2;
          return (
            <Badge
              key={i}
              variant="outline"
              className="text-[10px] h-[22px] px-2 gap-1 border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800"
              title={signal.detail}
            >
              <Icon className="h-2.5 w-2.5" />
              {signal.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
