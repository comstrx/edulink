/**
 * Recommendation Policy Core
 *
 * Pure decision-logic functions for the recommendation pipeline.
 * Owns: merging, conflict resolution, source priority, primary selection,
 *       suppression, sequencing, exposure control, and domain-aware behavior.
 * Does NOT own: data fetching, enrichment, status resolution, domain state machines.
 *
 * All domain access is routed through adapters (read-only interpretation).
 * All functions are pure (no side effects, no hooks, no DB calls).
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";
import * as trainingAdapter from "../adapters/training.adapter";
import * as hiringAdapter from "../adapters/hiring.adapter";
import * as trustAdapter from "../adapters/trust.adapter";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";
import {
  getMaxTotal,
  getMaxPerGroup,
  getPriorityOrder,
  getRejectionSuppressionThreshold,
  getGroupKeyMap,
  getActiveVariant,
} from "./recommendation-policy.config";

// ── Helpers ───────────────────────────────────────────────────

/** Resolves the effective group key for exposure capping. */
function resolveGroupKey(rec: UIRecommendation): string {
  if (rec.groupKey && getGroupKeyMap()[rec.groupKey]) return rec.groupKey;
  if (rec.actionType.includes("job") || rec.actionType.includes("hiring"))
    return "hiring_actions";
  if (rec.actionType.includes("course") || rec.actionType.includes("pathway") || rec.actionType.includes("training"))
    return "training_actions";
  if (rec.actionType.includes("verification") || rec.actionType.includes("trust"))
    return "trust_actions";
  if (rec.actionType.includes("profile"))
    return "profile_actions";
  return "other";
}

// ── A) Merge Sources ──────────────────────────────────────────

/**
 * Combines engine (snapshot) and growth recommendations into a single list.
 * Snapshot items come first to preserve source-priority semantics.
 */
export function mergeRecommendationSources(
  engineRecs: UIRecommendation[],
  growthRecs: UIRecommendation[],
): UIRecommendation[] {
  return [...engineRecs, ...growthRecs];
}

// ── B) Conflict Resolution ────────────────────────────────────

/**
 * Removes exact duplicates by composite key: actionType + targetId.
 * First occurrence wins (snapshot-first by merge order).
 * Items without targetId are never considered duplicates of each other.
 */
export function resolveRecommendationConflicts(
  recommendations: UIRecommendation[],
): UIRecommendation[] {
  const seen = new Set<string>();
  return recommendations.filter((rec) => {
    if (!rec.targetId) return true;
    const key = `${rec.actionType}::${rec.targetId}`;
    if (seen.has(key)) {
      logDecisionTrace({
        traceId: rec.traceId ?? "unknown",
        decisionType: "recommendation_targeting",
        entityId: rec.id,
        metadata: { stage: "dedup", decision: "dropped", key },
      });
      return false;
    }
    seen.add(key);
    return true;
  });
}

// ── C) Source Priority ────────────────────────────────────────

/**
 * Sorts recommendations by priority: high → medium → low.
 * Stable sort preserves insertion order for same-priority items.
 */
export function applySourcePriority(
  recommendations: UIRecommendation[],
): UIRecommendation[] {
  const po = getPriorityOrder();
  return [...recommendations].sort(
    (a, b) =>
      (po[a.priority] ?? 2) - (po[b.priority] ?? 2),
  );
}

// ── D) Primary Selection ──────────────────────────────────────

/**
 * Returns the single highest-priority non-completed recommendation.
 */
export function selectPrimaryRecommendation(
  recommendations: UIRecommendation[],
): UIRecommendation | undefined {
  return recommendations.find((r) => !trainingAdapter.isCompleted(r));
}

// ── E) Intent Suppression ─────────────────────────────────────

/**
 * Removes weaker recommendations when a stronger one covers the same intent.
 *
 * Rule 1: Pathway dominates Course for the same gap/skill intent.
 * Rule 2: No cross-domain suppression (training vs hiring vs trust stay independent).
 */
export function suppressWeakerRecommendations(
  recommendations: UIRecommendation[],
): UIRecommendation[] {
  const pathwayCoveredCodes = new Set<string>();
  for (const rec of recommendations) {
    if (trainingAdapter.isPathwayType(rec) && rec.reasonCodes.length > 0) {
      for (const code of rec.reasonCodes) {
        pathwayCoveredCodes.add(code);
      }
    }
  }

  if (pathwayCoveredCodes.size === 0) return recommendations;

  return recommendations.filter((rec) => {
    if (rec.actionType !== "course_recommendation") return true;
    if (rec.reasonCodes.length === 0) return true;
    const dominated = rec.reasonCodes.every((code) =>
      pathwayCoveredCodes.has(code),
    );
    if (dominated) {
      logDecisionTrace({
        traceId: rec.traceId ?? "unknown",
        decisionType: "recommendation_targeting",
        entityId: rec.id,
        metadata: { stage: "suppression", decision: "suppressed", reason: "pathway_dominates_course" },
      });
    }
    return !dominated;
  });
}

// ── E2) Domain-Aware Suppression ──────────────────────────────

/**
 * Suppresses recommendations based on real user state across domains.
 * All domain access is routed through adapters.
 *
 * Rules:
 * 1) Completed items: remove recommendations for already-completed targets
 * 2) In-progress dedup: suppress duplicate course recs when already enrolled
 * 3) Rejection-aware: when repeated rejections, suppress low-priority job recs
 *    if skill-building alternatives exist
 */
export function applyDomainAwareSuppression(
  recommendations: UIRecommendation[],
): UIRecommendation[] {
  // Collect in-progress targetIds via training adapter
  const inProgressTargets = new Set<string>();
  for (const rec of recommendations) {
    if (trainingAdapter.isEnrolled(rec) && rec.targetId) {
      inProgressTargets.add(rec.targetId);
    }
  }

  // Count rejection signals via hiring adapter
  const rejectionCount = hiringAdapter.countRejectionSignals(recommendations);
  const hasRepeatedRejection = rejectionCount >= getRejectionSuppressionThreshold();

  // Count skill-building recs via training adapter
  const skillBuildingCount = recommendations.filter(
    (r) => trainingAdapter.isSkillBuilding(r) && !trainingAdapter.isCompleted(r),
  ).length;

  return recommendations.filter((rec) => {
    // Completed recs are preserved — UI handles subdued rendering

    // Rule 2: Suppress duplicate course rec if target already enrolled
    if (
      trainingAdapter.isCourseType(rec) &&
      rec.status === "new" &&
      rec.targetId &&
      inProgressTargets.has(rec.targetId)
    ) {
      logDecisionTrace({
        traceId: rec.traceId ?? "unknown",
        decisionType: "recommendation_targeting",
        entityId: rec.id,
        metadata: { stage: "suppression", decision: "suppressed", reason: "already_enrolled" },
      });
      return false;
    }

    // Rule 3: Repeated rejection → suppress low-priority job recs
    if (
      hasRepeatedRejection &&
      hiringAdapter.isJobType(rec) &&
      rec.priority === "low" &&
      skillBuildingCount > 0
    ) {
      logDecisionTrace({
        traceId: rec.traceId ?? "unknown",
        decisionType: "recommendation_targeting",
        entityId: rec.id,
        metadata: { stage: "suppression", decision: "suppressed", reason: "repeated_rejection_low_priority" },
      });
      return false;
    }

    return true;
  });
}

// ── F) Sequencing Logic (Domain-Enhanced) ─────────────────────

/**
 * Applies layered sequencing with domain-aware boosts.
 *
 * Layer 1: Priority (high → medium → low)
 * Layer 2: Gating actions float before non-gating (same priority)
 * Layer 3: Rejection-based recs boosted within same tier
 * Layer 4: Pathway-linked recs boosted within same tier
 * Layer 5: Growth-sourced before engine-inferred (same tier)
 */
export function sequenceRecommendations(
  recommendations: UIRecommendation[],
): UIRecommendation[] {
  const po = getPriorityOrder();
  const sorted = [...recommendations].sort((a, b) => {
    // L1 — Priority
    const pA = po[a.priority] ?? 2;
    const pB = po[b.priority] ?? 2;
    if (pA !== pB) return pA - pB;

    // L2 — Gating types float up via trust adapter
    const gA = trustAdapter.isGatingAction(a) ? 0 : 1;
    const gB = trustAdapter.isGatingAction(b) ? 0 : 1;
    if (gA !== gB) return gA - gB;

    // L3 — Rejection-based recs boosted via hiring adapter
    const rA = hiringAdapter.hasRejectionSignal(a) ? 0 : 1;
    const rB = hiringAdapter.hasRejectionSignal(b) ? 0 : 1;
    if (rA !== rB) return rA - rB;

    // L4 — Pathway-linked items boosted via training adapter
    const pwA = trainingAdapter.isPathwayLinked(a) ? 0 : 1;
    const pwB = trainingAdapter.isPathwayLinked(b) ? 0 : 1;
    if (pwA !== pwB) return pwA - pwB;

    // L5 — Growth-sourced before engine-inferred
    const sA = a.source === "growth" ? 0 : 1;
    const sB = b.source === "growth" ? 0 : 1;
    return sA - sB;
  });

  sorted.forEach((rec, index) => {
    logDecisionTrace({
      traceId: rec.traceId ?? "unknown",
      decisionType: "recommendation_targeting",
      entityId: rec.id,
      metadata: { stage: "sequencing", decision: "ranked", index, priority: rec.priority },
    });
  });

  return sorted;
}

// ── G) Exposure Rules ─────────────────────────────────────────

/**
 * Enforces display caps to prevent UI overload.
 *
 * 1. Max MAX_PER_GROUP per groupKey (intent group).
 * 2. Max MAX_TOTAL total.
 * 3. The primary (first non-completed) is always preserved.
 */
export function applyExposureRules(
  recommendations: UIRecommendation[],
): UIRecommendation[] {
  const primary = selectPrimaryRecommendation(recommendations);

  const groupCounts: Record<string, number> = {};
  const result: UIRecommendation[] = [];

  for (const rec of recommendations) {
    if (primary && rec.id === primary.id) {
      const gk = resolveGroupKey(rec);
      groupCounts[gk] = (groupCounts[gk] || 0) + 1;
      result.push(rec);
      logDecisionTrace({
        traceId: rec.traceId ?? "unknown",
        decisionType: "recommendation_targeting",
        entityId: rec.id,
        metadata: { stage: "exposure", decision: "exposed", reason: "primary" },
      });
      continue;
    }

    if (result.length >= getMaxTotal()) {
      logDecisionTrace({
        traceId: rec.traceId ?? "unknown",
        decisionType: "recommendation_targeting",
        entityId: rec.id,
        metadata: { stage: "exposure", decision: "dropped", reason: "exposure_cap_total" },
      });
      continue;
    }

    const gk = resolveGroupKey(rec);
    const current = groupCounts[gk] || 0;
    if (current >= getMaxPerGroup()) {
      logDecisionTrace({
        traceId: rec.traceId ?? "unknown",
        decisionType: "recommendation_targeting",
        entityId: rec.id,
        metadata: { stage: "exposure", decision: "dropped", reason: "exposure_cap_group", groupKey: gk },
      });
      continue;
    }

    groupCounts[gk] = current + 1;
    result.push(rec);
    logDecisionTrace({
      traceId: rec.traceId ?? "unknown",
      decisionType: "recommendation_targeting",
      entityId: rec.id,
      metadata: { stage: "exposure", decision: "exposed" },
    });
  }

  return result;
}

// ── Pipeline ──────────────────────────────────────────────────

// NOTE:
// Exposure is NOT handled in the policy core.
// This layer returns the full, fully-sequenced recommendation list.
// Exposure (e.g., capping, grouping limits) is applied in the orchestrator layer
// (see recommendation-orchestrator.ts) to keep policy pure and UI-agnostic.

/**
 * Full policy pipeline:
 * merge → dedup → priority → intent suppression → domain suppression → sequence
 *
 * Returns the FULL sequenced list.
 */
export function applyRecommendationPolicy(
  engineRecs: UIRecommendation[],
  growthRecs: UIRecommendation[],
): UIRecommendation[] {
  const merged = mergeRecommendationSources(engineRecs, growthRecs);
  const deduped = resolveRecommendationConflicts(merged);
  const prioritized = applySourcePriority(deduped);
  const intentSuppressed = suppressWeakerRecommendations(prioritized);
  const domainSuppressed = applyDomainAwareSuppression(intentSuppressed);
  const sequenced = sequenceRecommendations(domainSuppressed);

  if (import.meta.env.DEV) {
    console.log(
      `[Policy][variant=${getActiveVariant()}] merged=${merged.length} → dedup=${deduped.length} → intentSupp=${intentSuppressed.length} → domainSupp=${domainSuppressed.length} → sequenced=${sequenced.length}`,
    );
  }

  return sequenced;
}
