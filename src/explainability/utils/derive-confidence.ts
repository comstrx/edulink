/**
 * Confidence Derivation — Explainability Layer
 *
 * Derives confidence from evidence quality, not just quantity.
 * Rule-based, no numeric scoring models.
 *
 * Confidence considers:
 * - Number of verified signals
 * - Ratio of verified vs derived signals
 * - Number of missing signals
 * - Diversity of supporting domains
 */

import type {
  ConfidenceLevel,
  ExplanationReason,
  MissingSignal,
} from "../types/explanation-contract.types";

export function deriveConfidence(
  reasons: ExplanationReason[],
  missingSignals: MissingSignal[] = []
): ConfidenceLevel {
  const verified = reasons.filter((r) => r.evidenceStatus === "verified").length;
  const derived = reasons.filter((r) => r.evidenceStatus === "derived").length;
  const total = verified + derived; // exclude missing/private from active count
  const missingCount = missingSignals.length;

  // Domain diversity: count unique source domains across non-missing reasons
  const domains = new Set(reasons.filter((r) => r.evidenceStatus !== "missing").map((r) => r.sourceDomain));
  const domainCount = domains.size;

  // ── High confidence ──
  // ≥3 verified signals, from multiple domains, minimal missing signals
  if (verified >= 3 && domainCount >= 2 && missingCount <= 1) {
    return "high";
  }

  // ── Medium confidence ──
  // Mix of verified and derived, or good verified count but more missing
  if (
    (verified >= 1 && total >= 3) ||
    (verified >= 2 && domainCount >= 2) ||
    (total >= 4 && missingCount <= 2)
  ) {
    return "medium";
  }

  // ── Low confidence ──
  // Few signals, mostly derived, or key signals missing
  return "low";
}
