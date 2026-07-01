/**
 * IntelligenceSignalBadges — Compact intelligence indicators for talent cards.
 *
 * Reads from the batch-fetched IntelligenceMap entry for a teacher.
 * No per-card queries. Presentation only.
 *
 * Sprint 7B — Talent Search Intelligence Ranking
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Brain, ShieldCheck, TrendingUp, Award, Route,
} from "lucide-react";
import type { CredentialStrength, GrowthMomentum } from "@/intelligence/talent/types/talent-intelligence.types";

export interface IntelligenceSignalEntry {
  criScore: number;
  credentialStrength: CredentialStrength;
  growthMomentum: GrowthMomentum;
  verifiedSignalCount: number;
  pathwayCompletionCount: number;
  readinessLevel: string;
  rankingScore: number;
}

interface Props {
  entry: IntelligenceSignalEntry | undefined;
  compact?: boolean;
}

const CREDENTIAL_LABELS: Record<CredentialStrength, string | null> = {
  none: null,
  basic: "Basic Credentials",
  moderate: "Moderate Credentials",
  strong: "Strong Credentials",
  exceptional: "Exceptional Credentials",
};

const CREDENTIAL_STYLES: Record<string, string> = {
  strong: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  exceptional: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800",
};

const MOMENTUM_LABELS: Record<GrowthMomentum, string | null> = {
  inactive: null,
  emerging: null,
  active: "Active Learner",
  accelerating: "Accelerating Growth",
};

export default function IntelligenceSignalBadges({ entry, compact = false }: Props) {
  if (!entry) return null;

  const badges: React.ReactNode[] = [];

  // CRI score badge (show if > 0)
  if (entry.criScore > 0) {
    const criColor =
      entry.criScore >= 71
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
        : entry.criScore >= 41
        ? "border-sky-200 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800"
        : "border-border/60 text-muted-foreground";

    badges.push(
      <Badge key="cri" variant="outline" className={cn("text-[10px] h-[20px] px-1.5 border font-medium gap-0.5", criColor)}>
        <Brain className="h-2.5 w-2.5" />
        CRI {Math.round(entry.criScore)}
      </Badge>,
    );
  }

  // Verified signals
  if (entry.verifiedSignalCount > 0) {
    badges.push(
      <Badge key="verified" variant="outline" className="text-[10px] h-[20px] px-1.5 border font-medium gap-0.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
        <ShieldCheck className="h-2.5 w-2.5" />
        {entry.verifiedSignalCount} Verified
      </Badge>,
    );
  }

  // Credential strength (strong/exceptional only for compactness)
  const credLabel = CREDENTIAL_LABELS[entry.credentialStrength];
  if (credLabel && (entry.credentialStrength === "strong" || entry.credentialStrength === "exceptional")) {
    badges.push(
      <Badge key="cred" variant="outline" className={cn("text-[10px] h-[20px] px-1.5 border font-medium gap-0.5", CREDENTIAL_STYLES[entry.credentialStrength] ?? "")}>
        <Award className="h-2.5 w-2.5" />
        {credLabel}
      </Badge>,
    );
  }

  // Pathway completion
  if (entry.pathwayCompletionCount > 0) {
    badges.push(
      <Badge key="pathway" variant="outline" className="text-[10px] h-[20px] px-1.5 border font-medium gap-0.5 border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800">
        <Route className="h-2.5 w-2.5" />
        {entry.pathwayCompletionCount} Pathway{entry.pathwayCompletionCount > 1 ? "s" : ""}
      </Badge>,
    );
  }

  // Growth momentum
  const momentumLabel = MOMENTUM_LABELS[entry.growthMomentum];
  if (momentumLabel) {
    badges.push(
      <Badge key="momentum" variant="outline" className="text-[10px] h-[20px] px-1.5 border font-medium gap-0.5 border-primary/20 bg-primary/5 text-primary">
        <TrendingUp className="h-2.5 w-2.5" />
        {momentumLabel}
      </Badge>,
    );
  }

  if (badges.length === 0) return null;

  return <>{compact ? badges.slice(0, 3) : badges}</>;
}
