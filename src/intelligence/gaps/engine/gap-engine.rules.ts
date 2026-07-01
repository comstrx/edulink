/**
 * Gap Engine v1 — Rules & Thresholds
 *
 * Centralized severity, confidence, priority, evidence-source mapping,
 * and grouping helpers used by the gap engine.
 *
 * Phase 6C — Live
 */

import type {
  GapSeverity,
  GapConfidence,
  GapCategory,
  GapItem,
  GapEvidenceSource,
  GapGroupSummary,
  GapReasonCode,
} from "./gap-engine.types";
import { GAP_CATEGORY_LABELS } from "./gap-engine.types";

// ── Severity Rules ─────────────────────────────────────────────

/** Default severity by gap category */
export const DEFAULT_SEVERITY_BY_CATEGORY: Record<GapCategory, GapSeverity> = {
  profile_gap: "medium",
  certification_gap: "high",
  curriculum_gap: "high",
  grade_band_gap: "medium",
  language_gap: "medium",
  verification_gap: "low",
  training_gap: "low",
  experience_gap: "high",
  trust_gap: "low",
  employability_signal_gap: "medium",
};

/** Severity boost when evidence from match results or job requirements */
export const JOB_SOURCED_SEVERITY_BOOST: Partial<Record<GapCategory, GapSeverity>> = {
  certification_gap: "critical",
  curriculum_gap: "critical",
  language_gap: "high",
  experience_gap: "critical",
};

const SEVERITY_RANK: Record<GapSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function elevatedSeverity(base: GapSeverity, boost: GapSeverity): GapSeverity {
  return SEVERITY_RANK[boost] > SEVERITY_RANK[base] ? boost : base;
}

export function resolveSeverity(
  category: GapCategory,
  evidenceSources: GapEvidenceSource[],
  evidenceCount: number,
): GapSeverity {
  let sev = DEFAULT_SEVERITY_BY_CATEGORY[category];

  const hasJobEvidence =
    evidenceSources.includes("match_result") || evidenceSources.includes("job_requirement");
  if (hasJobEvidence) {
    const boost = JOB_SOURCED_SEVERITY_BOOST[category];
    if (boost) sev = elevatedSeverity(sev, boost);
  }

  // Repeated evidence (3+) can bump medium→high
  if (evidenceCount >= 3 && sev === "medium") sev = "high";

  return sev;
}

// ── Confidence Rules ───────────────────────────────────────────

export function resolveConfidence(evidenceSourceCount: number): GapConfidence {
  if (evidenceSourceCount >= 3) return "high";
  if (evidenceSourceCount >= 2) return "medium";
  return "low";
}

// ── Priority Rules ─────────────────────────────────────────────

const CONFIDENCE_RANK: Record<GapConfidence, number> = { high: 3, medium: 2, low: 1 };

/** Foundational categories get a priority boost */
const FOUNDATIONAL_BOOST: Partial<Record<GapCategory, number>> = {
  certification_gap: 2,
  curriculum_gap: 2,
  verification_gap: 1,
  profile_gap: 1,
};

export function sortGapsByPriority(gaps: GapItem[]): GapItem[] {
  return [...gaps].sort((a, b) => {
    const scoreA =
      SEVERITY_RANK[a.severity] * 10 +
      CONFIDENCE_RANK[a.confidence] * 3 +
      (FOUNDATIONAL_BOOST[a.gapType] ?? 0);
    const scoreB =
      SEVERITY_RANK[b.severity] * 10 +
      CONFIDENCE_RANK[b.confidence] * 3 +
      (FOUNDATIONAL_BOOST[b.gapType] ?? 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.gapType.localeCompare(b.gapType);
  });
}

// ── Grouping Helpers ───────────────────────────────────────────

export function getHighestSeverity(severities: GapSeverity[]): GapSeverity {
  if (severities.length === 0) return "low";
  return severities.reduce((highest, s) =>
    SEVERITY_RANK[s] > SEVERITY_RANK[highest] ? s : highest,
  );
}

export function buildGroupedSummary(gaps: GapItem[]): GapGroupSummary[] {
  const map = new Map<GapCategory, GapItem[]>();
  for (const g of gaps) {
    const list = map.get(g.gapType) ?? [];
    list.push(g);
    map.set(g.gapType, list);
  }

  const summaries: GapGroupSummary[] = [];
  for (const [category, items] of map) {
    summaries.push({
      category,
      label: GAP_CATEGORY_LABELS[category],
      count: items.length,
      highestSeverity: getHighestSeverity(items.map((i) => i.severity)),
    });
  }

  return summaries.sort(
    (a, b) => SEVERITY_RANK[b.highestSeverity] - SEVERITY_RANK[a.highestSeverity],
  );
}

// ── Reason Code Helpers ────────────────────────────────────────

export const REASON_CODE_MAP: Record<string, string> = {
  profile_incomplete: "Teacher profile is incomplete",
  missing_curriculum_mapping: "Missing curriculum mapping",
  missing_required_certification: "Missing required certification",
  verification_missing: "Verification not complete",
  repeated_rejection_signal: "Repeated rejection signals detected",
  insufficient_experience_signal: "Insufficient experience for target roles",
  missing_language_signal: "Missing language proficiency",
  weak_training_foundation: "Limited professional development history",
  missing_grade_band: "Missing grade band mapping",
  missing_subject_mapping: "Missing subject mapping",
};

export function buildReasonCodes(gaps: GapItem[]): GapReasonCode[] {
  const seen = new Set<string>();
  const codes: GapReasonCode[] = [];

  for (const gap of gaps) {
    for (const signal of gap.relatedSignals) {
      if (!seen.has(signal) && REASON_CODE_MAP[signal]) {
        seen.add(signal);
        codes.push({ code: signal, polarity: "gap", message: REASON_CODE_MAP[signal] });
      }
    }
  }

  return codes;
}
