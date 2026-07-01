/**
 * ApplicationIntelligenceContext — Compact intelligence micro-layer per application row.
 *
 * Shows: match label (Strong/Moderate/Developing), strength/weakness signal,
 * and CTA to Professional Intelligence. Uses only existing snapshot + talent profile data.
 *
 * Phase 7A — Intelligence Context on Applications
 */

import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { resolveMatchLabel, MATCH_LABEL_STYLES } from "@/lib/match-labels";
import type { TalentIntelligenceProfile } from "@/intelligence/talent/types/talent-intelligence.types";
import type { MatchSnapshotSummary } from "@/hooks/useBatchMatchSnapshots";

/* ------------------------------------------------------------------ */
/* Strength signal derivation                                          */
/* ------------------------------------------------------------------ */

interface StrengthSignal {
  type: "positive" | "caution" | "neutral";
  text: string;
}

function deriveStrengthSignal(
  profile: TalentIntelligenceProfile | null | undefined,
  match: MatchSnapshotSummary | undefined,
  status: string,
): StrengthSignal | null {
  if (!profile) return null;

  const isRejected = status === "rejected";

  // For rejected: general improvement nudge
  if (isRejected) {
    if (profile.unresolvedGapCount > 0 || profile.credentialVerifiedCount === 0) {
      return {
        type: "caution",
        text: "Strengthening your profile can improve future outcomes",
      };
    }
    return null;
  }

  // Positive: verified credentials + strong readiness
  if (
    profile.credentialVerifiedCount > 0 &&
    (profile.readinessLevel === "ready" || profile.readinessLevel === "highly_ready")
  ) {
    return {
      type: "positive",
      text: "Verified credentials strengthen this application",
    };
  }

  // Positive: hiring advantage signals present
  if (profile.hiringAdvantageSignals.length >= 2) {
    return {
      type: "positive",
      text: `${profile.hiringAdvantageSignals.length} hiring advantages support your profile`,
    };
  }

  // Caution: gaps + weak credentials
  if (profile.unresolvedGapCount > 0 && profile.credentialVerifiedCount === 0) {
    return {
      type: "caution",
      text: "Skill gaps and missing credentials may weaken your position",
    };
  }

  // Caution: gaps only
  if (profile.unresolvedGapCount >= 3) {
    return {
      type: "caution",
      text: "Unresolved skill gaps may affect competitiveness",
    };
  }

  // Neutral: developing profile
  if (profile.readinessLevel === "early" || profile.readinessLevel === "developing") {
    if (match && match.score < 50) {
      return {
        type: "neutral",
        text: "Your profile is still developing for competitive roles",
      };
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface ApplicationIntelligenceContextProps {
  match: MatchSnapshotSummary | undefined;
  profile: TalentIntelligenceProfile | null | undefined;
  status: string;
}

export function ApplicationMatchLabel({ match }: { match: MatchSnapshotSummary | undefined }) {
  if (!match) return <span className="text-xs text-muted-foreground">—</span>;

  const label = resolveMatchLabel(match.score);

  return (
    <Badge variant="outline" className={`text-[11px] px-2 py-0.5 h-auto font-semibold ${MATCH_LABEL_STYLES[label]}`}>
      {label}
    </Badge>
  );
}

export function ApplicationIntelligenceContext({
  match,
  profile,
  status,
}: ApplicationIntelligenceContextProps) {
  const signal = deriveStrengthSignal(profile, match, status);

  if (!signal && !profile) return null;

  const isWeak =
    profile &&
    (profile.readinessLevel === "early" ||
      profile.readinessLevel === "developing" ||
      profile.unresolvedGapCount > 0 ||
      profile.credentialVerifiedCount === 0);

  return (
    <div className="space-y-1">
      {signal && (
        <p className="text-[11px] text-muted-foreground flex items-start gap-1">
          {signal.type === "positive" && <ShieldCheck className="h-3 w-3 shrink-0 mt-px text-green-600 dark:text-green-400" />}
          {signal.type === "caution" && <AlertTriangle className="h-3 w-3 shrink-0 mt-px text-amber-600 dark:text-amber-400" />}
          {signal.type === "neutral" && <TrendingUp className="h-3 w-3 shrink-0 mt-px text-muted-foreground" />}
          <span>{signal.text}</span>
        </p>
      )}
      {profile && (
        <Link
          to="/app/teacher/talent-profile"
          className="text-[11px] text-primary flex items-center gap-1 hover:underline group"
        >
          <TrendingUp className="h-3 w-3 shrink-0" />
          <span className="font-medium">
            {isWeak ? "See how to improve" : "View your Professional Intelligence"}
          </span>
          <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      )}
    </div>
  );
}
