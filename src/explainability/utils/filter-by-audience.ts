/**
 * Audience Filter — Explainability Layer
 *
 * Filters both reasons AND missing signals by audience.
 * Public surfaces must never expose internal or school-only signals.
 */

import type {
  ExplanationAudience,
  ExplanationReason,
  MissingSignal,
  ExplanationContract,
} from "../types/explanation-contract.types";

export function filterReasonsByAudience(
  reasons: ExplanationReason[],
  audience: ExplanationAudience
): ExplanationReason[] {
  return reasons.filter((r) => r.visibility.includes(audience));
}

export function filterMissingSignalsByAudience(
  signals: MissingSignal[],
  audience: ExplanationAudience
): MissingSignal[] {
  return signals.filter((s) => s.visibility.includes(audience));
}

export function applyAudienceFilter(
  explanation: ExplanationContract,
  audience: ExplanationAudience
): ExplanationContract {
  return {
    ...explanation,
    reasons: filterReasonsByAudience(explanation.reasons, audience),
    missingSignals: filterMissingSignalsByAudience(explanation.missingSignals, audience),
    audience,
  };
}
