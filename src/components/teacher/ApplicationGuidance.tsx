import { Link } from "react-router-dom";
import { Info, ArrowRight, Sparkles } from "lucide-react";

interface ApplicationGuidanceProps {
  status: string;
  matchScore: number | null;
  rejectionReason: string | null;
}

// ── Rejection → Improvement Suggestion Mapping ───────────────
// Pure deterministic mapping from rejection reason text to actionable suggestion.
// No backend logic — just presentation layer label mapping.

const REJECTION_IMPROVEMENT_MAP: Record<string, { suggestion: string; route: string }> = {
  "weak classroom management": {
    suggestion: "Improve classroom management skills",
    route: "/app/teacher/recommendations",
  },
  "missing certification": {
    suggestion: "Pursue relevant teaching certification",
    route: "/app/teacher/training",
  },
  "insufficient experience": {
    suggestion: "Build verified teaching experience",
    route: "/app/teacher/recommendations",
  },
  "weak curriculum": {
    suggestion: "Strengthen curriculum alignment",
    route: "/app/teacher/training",
  },
  "missing evidence": {
    suggestion: "Submit verified teaching evidence",
    route: "/app/teacher/recommendations",
  },
  "language proficiency": {
    suggestion: "Improve language qualifications",
    route: "/app/teacher/training",
  },
  "subject mismatch": {
    suggestion: "Expand your subject expertise",
    route: "/app/teacher/training",
  },
  "incomplete pathway": {
    suggestion: "Complete your professional development pathway",
    route: "/app/teacher/training",
  },
  "classroom practice": {
    suggestion: "Submit classroom practice evidence",
    route: "/app/teacher/recommendations",
  },
};

/**
 * Fuzzy-matches a rejection reason label against known patterns.
 * Uses substring matching — no exact match required.
 */
function findImprovementSuggestion(
  rejectionReason: string
): { suggestion: string; route: string } | null {
  const lower = rejectionReason.toLowerCase();
  for (const [pattern, mapping] of Object.entries(REJECTION_IMPROVEMENT_MAP)) {
    if (lower.includes(pattern)) return mapping;
  }
  // Fallback: generic improvement suggestion for any rejection
  return {
    suggestion: "Explore growth recommendations to improve your profile",
    route: "/app/teacher/recommendations",
  };
}

/**
 * Derives a single truthful guidance line per application
 * using only existing signals. No invented logic.
 */
function deriveGuidance(
  status: string,
  matchScore: number | null,
  rejectionReason: string | null
): string | null {
  const isRejected = status === "rejected";
  const isLowMatch = matchScore !== null && matchScore < 50;
  const isApplied = status === "applied";
  const isGoodMatch = matchScore !== null && matchScore >= 70;

  // Rule 3: rejected + low match → combined
  if (isRejected && rejectionReason && isLowMatch) {
    return `Rejected: ${rejectionReason}. Match was ${matchScore}% — consider roles that align more closely.`;
  }

  // Rule 1: rejected + reason only
  if (isRejected && rejectionReason) {
    return `Rejected: ${rejectionReason}.`;
  }

  // Rule 1b: rejected + low match (no reason)
  if (isRejected && isLowMatch) {
    return `Match was ${matchScore}% — consider roles that align more closely with your profile.`;
  }

  // Rule 2: any active status + low match
  if (!isRejected && isLowMatch) {
    return `Low match (${matchScore}%) — this role may not closely align with your current profile.`;
  }

  // Rule 4: applied + good match
  if (isApplied && isGoodMatch) {
    return `Strong match (${matchScore}%). Application is under review.`;
  }

  // Rule 5: no strong signal → no guidance
  return null;
}

export function ApplicationGuidance({ status, matchScore, rejectionReason }: ApplicationGuidanceProps) {
  const guidance = deriveGuidance(status, matchScore, rejectionReason);
  const isRejected = status === "rejected";
  const improvement = isRejected && rejectionReason
    ? findImprovementSuggestion(rejectionReason)
    : null;

  if (!guidance && !improvement) return null;

  return (
    <div className="space-y-1 mt-0.5">
      {guidance && (
        <p className="text-[11px] text-muted-foreground flex items-start gap-1">
          <Info className="h-3 w-3 shrink-0 mt-px" />
          <span>{guidance}</span>
        </p>
      )}
      {improvement && (
        <Link
          to={improvement.route}
          className="text-[11px] text-primary flex items-center gap-1 hover:underline group"
        >
          <Sparkles className="h-3 w-3 shrink-0" />
          <span className="font-medium">{improvement.suggestion}</span>
          <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      )}
    </div>
  );
}
