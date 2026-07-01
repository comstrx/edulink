/**
 * Explainability Presentation Mapping — Sprint 5.4
 *
 * Transforms internal ExplainabilityMeta into presentation-safe formats.
 * Pure mapping only — no logic, no fabrication, no new signals.
 */

import type { ExplainabilityMeta } from "@/intelligence/observability/explainability.types";

// ── Presentation Contracts ────────────────────────────────────

export interface PresentationSignal {
  type: string;
  label: string;
  value?: string | number;
}

export interface ExplainabilityPresentation {
  shortReason: string;
  detailedReasons: string[];
  signals: PresentationSignal[];
}

export interface ExplainabilityView {
  user: ExplainabilityPresentation;
  admin: ExplainabilityPresentation;
  debug: ExplainabilityMeta;
}

// ── Internal Signal Label Map ─────────────────────────────────

const SIGNAL_LABEL_MAP: Record<string, string> = {
  overlap: "Skill Match",
  criBoost: "Impact on Readiness",
  criBoostValue: "Readiness Improvement",
  rejectionRate: "Rejection Rate",
  matchScore: "Match Score",
  gapCount: "Areas for Growth",
  gapCategory: "Growth Area",
  completionRate: "Completion Rate",
  executionRate: "Follow-through Rate",
  clickRate: "Engagement Rate",
  verifiedCount: "Verified Credentials",
  trustLevel: "Trust Level",
  effectivenessScore: "Provider Quality",
  providerBand: "Provider Rating",
  scenario: "Context",
  priority: "Priority Level",
  closedGaps: "Gaps Addressed",
  redundant: "Already Covered",
  budgetCut: "Capacity Limit",
  conflictsResolved: "Conflicts Resolved",
  dedupedCount: "Duplicates Removed",
  overlayReduced: "Refinements Applied",
};

// ── Sanitization Helpers ──────────────────────────────────────

/**
 * Remove internal variable names and technical jargon from reasoning.
 * Maps known internal patterns to human-readable equivalents.
 */
const SANITIZATION_RULES: Array<[RegExp, string]> = [
  [/criBoostValue\s*=\s*(\d+)/gi, "readiness improvement of $1"],
  [/criBoost\s*=\s*(\d+)/gi, "readiness improvement of $1"],
  [/matchScore\s*[=:]\s*(\d+)/gi, "match score of $1"],
  [/gapCount\s*[=:]\s*(\d+)/gi, "$1 area(s) for growth"],
  [/rejectionRate\s*[=:]\s*([\d.]+)/gi, "rejection rate of $1"],
  [/overlap\s*[=:]\s*([\d.]+)/gi, "skill overlap of $1"],
  [/effectivenessScore\s*[=:]\s*(\d+)/gi, "provider quality score of $1"],
  [/shouldRefreshCri/gi, "readiness update needed"],
  [/shouldGenerateRecommendations/gi, "new recommendations suggested"],
  [/suppressBeginner/gi, "advanced focus enabled"],
  [/boostMatching/gi, "matching priority increased"],
  [/foundationalOnly/gi, "focusing on core skills"],
  [/executionRate\s*[=:]\s*([\d.]+)/gi, "follow-through rate of $1"],
  [/clickRate\s*[=:]\s*([\d.]+)/gi, "engagement rate of $1"],
];

function sanitizeReasoning(text: string): string {
  let result = text;
  for (const [pattern, replacement] of SANITIZATION_RULES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Extract signal-like key=value patterns from reasoning strings.
 */
function extractSignals(reasoning: string[]): PresentationSignal[] {
  const signals: PresentationSignal[] = [];
  const seen = new Set<string>();

  for (const line of reasoning) {
    // Match patterns like "key=value" or "key: value"
    const matches = line.matchAll(/(\w+)\s*[=:]\s*([\d.]+)/g);
    for (const match of matches) {
      const key = match[1];
      const rawValue = match[2];
      if (seen.has(key)) continue;
      seen.add(key);

      const label = SIGNAL_LABEL_MAP[key];
      if (label) {
        const numVal = parseFloat(rawValue);
        signals.push({
          type: key,
          label,
          value: isNaN(numVal) ? rawValue : numVal,
        });
      }
    }
  }

  return signals;
}

// ── Core Mapping ──────────────────────────────────────────────

/**
 * Build short reason from ExplainabilityMeta summary.
 * Sanitizes internal terminology for human consumption.
 */
function buildShortReason(meta: ExplainabilityMeta): string {
  if (!meta.summary || meta.summary === "no reasoning captured") {
    return "Decision processed based on available information";
  }
  return sanitizeReasoning(meta.summary);
}

/**
 * Build detailed reasons from all stage reasoning entries.
 * User level: sanitized, no internal terms.
 * Admin level: more detailed but still sanitized.
 */
function buildDetailedReasons(
  meta: ExplainabilityMeta,
  level: "user" | "admin",
): string[] {
  const reasons: string[] = [];

  for (const stage of meta.stages) {
    for (const r of stage.reasoning) {
      const sanitized = sanitizeReasoning(r);
      reasons.push(sanitized);
    }
  }

  if (reasons.length === 0) {
    return ["Decision based on current profile and context"];
  }

  // User level: limit to top 5 most relevant
  if (level === "user") {
    return reasons.slice(0, 5);
  }

  return reasons;
}

/**
 * Map ExplainabilityMeta to a user-level presentation.
 */
function mapUserPresentation(
  meta: ExplainabilityMeta,
): ExplainabilityPresentation {
  const allReasoning = meta.stages.flatMap((s) => s.reasoning);

  return {
    shortReason: buildShortReason(meta),
    detailedReasons: buildDetailedReasons(meta, "user"),
    signals: extractSignals(allReasoning).slice(0, 3), // User sees max 3 signals
  };
}

/**
 * Map ExplainabilityMeta to an admin-level presentation.
 * More signals, more detail, but still sanitized.
 */
function mapAdminPresentation(
  meta: ExplainabilityMeta,
): ExplainabilityPresentation {
  const allReasoning = meta.stages.flatMap((s) => s.reasoning);

  return {
    shortReason: buildShortReason(meta),
    detailedReasons: buildDetailedReasons(meta, "admin"),
    signals: extractSignals(allReasoning), // Admin sees all signals
  };
}

// ── Public API ────────────────────────────────────────────────

/**
 * Transform internal ExplainabilityMeta into presentation-safe format.
 * Pure mapping — no new logic, no fabrication.
 */
export function mapExplainabilityToPresentation(
  meta: ExplainabilityMeta,
): ExplainabilityPresentation {
  return mapUserPresentation(meta);
}

/**
 * Build multi-level ExplainabilityView from ExplainabilityMeta.
 * user: simplified, safe
 * admin: detailed, sanitized
 * debug: raw ExplainabilityMeta (unchanged)
 */
export function buildExplainabilityView(
  meta: ExplainabilityMeta,
): ExplainabilityView {
  return {
    user: mapUserPresentation(meta),
    admin: mapAdminPresentation(meta),
    debug: meta,
  };
}
