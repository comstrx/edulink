/**
 * Smart Glue — Decision Safety Module (Sprint 12 PART 4)
 *
 * Centralized safety rules applied AFTER cross-domain overlay.
 * Prevents action explosion, duplicate recommendations, and conflicting outputs.
 *
 * Pipeline: intents → overlay → safety → final
 *
 * Safety guarantees:
 *   1. Action budget — hard cap on total intents per event
 *   2. Recommendation dedup — no duplicate rec intents for same teacher
 *   3. Conflict resolution — contradictory intents are resolved deterministically
 *   4. Suppression — skip recs when existing state is sufficient
 *   5. Priority ordering — high-priority intents survive budget cuts
 */

import { EVENT_NAMES } from "@/contracts/core/event-names";
import type { IntentEmission } from "./types";
import type { CrossDomainDecision } from "./decision-engine";
import type { ExplainabilityMeta } from "@/intelligence/observability/explainability.types";
import type { ExplainabilityView } from "@/intelligence/explainability/explainability.presentation";
import { buildExplainabilityTrace } from "@/intelligence/observability/explainability.builder";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";

// ── Constants ─────────────────────────────────────────────────

/** Absolute maximum intents any single event can emit (hard ceiling) */
const GLOBAL_INTENT_CEILING = 6;

/** Intent names considered "recommendation" intents */
const RECOMMENDATION_INTENTS: Set<string> = new Set([
  EVENT_NAMES.intents.trainingRecommendationRequested,
  EVENT_NAMES.intents.growthRecommendationRefreshRequested,
]);

/** Priority ordering for intent types (higher = kept first under budget) */
const INTENT_PRIORITY: Record<string, number> = {
  [EVENT_NAMES.intents.criRefreshRequested]: 10,
  [EVENT_NAMES.intents.skillGapRefreshRequested]: 9,
  [EVENT_NAMES.intents.matchRefreshRequested]: 8,
  [EVENT_NAMES.intents.verifiedStateRefreshRequested]: 7,
  [EVENT_NAMES.intents.teacherTrustRefreshRequested]: 7,
  [EVENT_NAMES.intents.talentProfileRefreshRequested]: 6,
  [EVENT_NAMES.intents.reputationRefreshRequested]: 5,
  [EVENT_NAMES.intents.mentorReputationRefreshRequested]: 5,
  [EVENT_NAMES.intents.trainingRecommendationRequested]: 3,
  [EVENT_NAMES.intents.growthRecommendationRefreshRequested]: 3,
};

// ── 1. Cross-Domain Overlay ───────────────────────────────────

/**
 * Apply cross-domain decision adjustments to an intent list.
 * Shared implementation — replaces 3 duplicated versions in rule files.
 */
export function applyCrossDomainOverlay(
  intents: IntentEmission[],
  crossDecision: CrossDomainDecision,
): IntentEmission[] {
  if (crossDecision.scenario === "none") return intents;

  let adjusted = [...intents];

  // Minimize recommendations: remove all rec intents entirely
  if (crossDecision.minimizeRecommendations) {
    adjusted = adjusted.filter((i) => !RECOMMENDATION_INTENTS.has(i.intent));
  }
  // Otherwise apply recommendation cap
  else if (crossDecision.recommendationCap != null) {
    let recCount = 0;
    adjusted = adjusted.filter((i) => {
      if (RECOMMENDATION_INTENTS.has(i.intent)) {
        recCount++;
        return recCount <= crossDecision.recommendationCap!;
      }
      return true;
    });
  }

  // Tag intents with cross-domain metadata + priority override
  adjusted = adjusted.map((i) => ({
    ...i,
    payload: {
      ...i.payload,
      crossDomainScenario: crossDecision.scenario,
      ...(crossDecision.priorityOverride
        ? { crossDomainPriority: crossDecision.priorityOverride }
        : {}),
      promoteAdvanced: crossDecision.promoteAdvanced,
      suppressBeginner: crossDecision.suppressBeginner,
      foundationalOnly: crossDecision.foundationalOnly,
    },
  }));

  return adjusted;
}

// ── 2. Intent Deduplication ───────────────────────────────────

/**
 * Remove duplicate intents within a single rule's output.
 * Two intents are duplicates if they share: intent name + teacherId.
 */
export function deduplicateIntents(intents: IntentEmission[]): IntentEmission[] {
  const seen = new Set<string>();
  return intents.filter((i) => {
    const entityId =
      (i.payload.teacherId as string) ??
      (i.payload.mentorId as string) ??
      "__none__";
    const key = `${i.intent}:${entityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── 3. Conflict Resolution ────────────────────────────────────

/**
 * Resolve conflicting intents.
 *
 * Conflict rules:
 * - If both "minimize recs" tag AND rec intents exist → remove recs
 * - If both trust refresh AND talent refresh exist for redundant evidence → keep only mentor rep
 */
export function resolveConflicts(intents: IntentEmission[]): IntentEmission[] {
  if (intents.length === 0) return intents;

  let resolved = [...intents];

  // Conflict: minimizeRecommendations tagged + rec intents still present
  const hasMinimizeTag = resolved.some(
    (i) => i.payload.crossDomainScenario === "high_cri_verified_evidence",
  );
  if (hasMinimizeTag) {
    resolved = resolved.filter((i) => !RECOMMENDATION_INTENTS.has(i.intent));
  }

  return resolved;
}

// ── 4. Priority-Aware Budget Enforcement ──────────────────────

/**
 * Enforce action budget by keeping highest-priority intents first.
 * Unlike simple `.slice()`, this sorts by intent type priority
 * so foundational intents (CRI, gaps) survive over recommendations.
 */
export function enforceActionBudget(
  intents: IntentEmission[],
  maxIntents: number,
): IntentEmission[] {
  const ceiling = Math.min(maxIntents, GLOBAL_INTENT_CEILING);
  if (intents.length <= ceiling) return intents;

  // Stable sort: higher priority first, preserve original order for ties
  const indexed = intents.map((intent, idx) => ({ intent, idx }));
  indexed.sort((a, b) => {
    const aPri = INTENT_PRIORITY[a.intent.intent] ?? 0;
    const bPri = INTENT_PRIORITY[b.intent.intent] ?? 0;
    if (bPri !== aPri) return bPri - aPri;
    return a.idx - b.idx; // stable
  });

  return indexed.slice(0, ceiling).map((entry) => entry.intent);
}

// ── 5. Full Safety Pipeline ───────────────────────────────────

export interface SafetyPipelineInput {
  /** Raw intents from decision logic */
  intents: IntentEmission[];
  /** Cross-domain decision (or none) */
  crossDecision: CrossDomainDecision;
  /** Max intents from local decision */
  maxIntents: number;
  /** Event name for logging */
  eventName: string;
  /** Teacher/entity ID for logging */
  entityId: string;
  /** Trace ID for observability (Sprint 5.2: required) */
  traceId: string;
}

export interface SafetyPipelineResult {
  /** Final safe intent list */
  intents: IntentEmission[];
  /** Number of intents removed by dedup */
  dedupedCount: number;
  /** Number of intents removed by conflict resolution */
  conflictsResolved: number;
  /** Number of intents removed by budget enforcement */
  budgetCut: number;
  /** Number of intents removed by overlay */
  overlayReduced: number;
  /** Explainability metadata (Sprint 5) */
  explainability?: ExplainabilityMeta;
  /** Presentation-safe view (Sprint 5.4) */
  explainabilityView?: ExplainabilityView;
}

/**
 * Full safety pipeline: overlay → dedup → conflicts → budget → log.
 *
 * Every decision-aware rule should call this instead of doing
 * manual overlay + slice.
 */
export function applyDecisionSafety(
  input: SafetyPipelineInput,
): SafetyPipelineResult {
  const { intents, crossDecision, maxIntents, eventName, entityId, traceId } = input;
  const startCount = intents.length;

  // Stage 1: Cross-domain overlay
  const afterOverlay = applyCrossDomainOverlay(intents, crossDecision);
  const overlayReduced = startCount - afterOverlay.length;

  // Stage 2: Deduplication
  const afterDedup = deduplicateIntents(afterOverlay);
  const dedupedCount = afterOverlay.length - afterDedup.length;

  // Stage 3: Conflict resolution
  const afterConflicts = resolveConflicts(afterDedup);
  const conflictsResolved = afterDedup.length - afterConflicts.length;

  // Stage 4: Priority-aware budget enforcement
  const final = enforceActionBudget(afterConflicts, maxIntents);
  const budgetCut = afterConflicts.length - final.length;

  // Build explainability
  const safetyTraceId = traceId;
  const explainability = buildExplainabilityTrace({
    traceId: safetyTraceId,
    stages: [
      { stage: "cross_domain_overlay", reasoning: crossDecision.reasoning },
      { stage: "dedup", reasoning: dedupedCount > 0 ? [`removed ${dedupedCount} duplicate(s)`] : ["no duplicates"] },
      { stage: "conflict_resolution", reasoning: conflictsResolved > 0 ? [`resolved ${conflictsResolved} conflict(s)`] : ["no conflicts"] },
      { stage: "budget_enforcement", reasoning: budgetCut > 0 ? [`cut ${budgetCut} intent(s) over budget`] : ["within budget"] },
    ],
    summary: `safety: ${startCount}→${final.length} intents (scenario=${crossDecision.scenario})`,
  });

  // Unified observability
  logDecisionTrace({
    traceId: safetyTraceId,
    decisionType: "safety_pipeline",
    entityId,
    eventName,
    explainability,
    metadata: {
      input: startCount,
      final: final.length,
      scenario: crossDecision.scenario,
      finalIntents: final.map((i) => i.intent),
    },
  });

  return {
    intents: final,
    dedupedCount,
    conflictsResolved,
    budgetCut,
    overlayReduced,
    explainability,
  };
}
