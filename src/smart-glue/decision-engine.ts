/**
 * Smart Glue Decision Engine — Sprint 10 + Sprint 11 + Sprint 12 + Sprint 4.2
 *
 * Lightweight prioritization layer for domain events.
 *
 * Sprint 10: hiring.application_rejected
 * Sprint 11: identity.profile_updated, training.completed, mentorship.evidence.approved
 * Sprint 12: Cross-domain decision scenarios
 * Sprint 4.2: Multi-event signal modifiers (rejection + gaps boost)
 *
 * Rules:
 *   - No DB schema changes
 *   - No engine modifications (CRI / Gap / Match)
 *   - No AI or heavy scoring
 *   - Predictable, deterministic behavior
 *   - Each event has its own decision logic (no shared abstraction)
 */

import type { RejectionIntelligenceContext } from "./intelligence/rejection-context.reader";
import type { ProfileUpdateDecisionContext } from "./intelligence/profile-update-context.reader";
import type { TrainingCompletionDecisionContext } from "./intelligence/training-completion-context.reader";
import type { EvidenceApprovalDecisionContext } from "./intelligence/evidence-approval-context.reader";
import type { CrossDomainContext } from "./intelligence/cross-domain-context.reader";
import type { RecentEventContext } from "./intelligence/aggregated-event-context.reader";
import type { GapEntry } from "@/intelligence/read-models/types/intelligence-read-models.types";
import type { ExplainabilityMeta } from "@/intelligence/observability/explainability.types";
import type { ExplainabilityView } from "@/intelligence/explainability/explainability.presentation";
import { buildExplainabilityTrace } from "@/intelligence/observability/explainability.builder";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";
import { attachExplainabilityView } from "@/intelligence/explainability/explainability.attach";

// ── Shared Priority Type ──────────────────────────────────────

export type DecisionPriority = "critical" | "high" | "normal" | "low";

// ══════════════════════════════════════════════════════════════
// 1. REJECTION DECISION (Sprint 10)
// ══════════════════════════════════════════════════════════════

export interface RejectionDecision {
  topGap: GapEntry | null;
  hasRecommendations: boolean;
  shouldGenerateRecommendations: boolean;
  shouldRefreshCri: boolean;
  maxIntents: number;
  reasoning: string[];
  explainability?: ExplainabilityMeta;
  explainabilityView?: ExplainabilityView;
}

const GAP_CATEGORY_PRIORITY: Record<string, number> = {
  certification: 6, subject: 5, curriculum: 4, skill: 3,
  language: 2, experience: 1, location: 0, other: 0,
};

const CRI_REFRESH_GAP_THRESHOLD = 3;
const MAX_INTENTS_PER_REJECTION = 4;

export function resolveRejectionDecision(
  context: RejectionIntelligenceContext | undefined,
  traceId: string,
): RejectionDecision {
  const reasoning: string[] = [];
  const gaps = context?.gaps;
  const hasGaps = gaps?.available === true && gaps.totalGaps > 0;
  const hasRecommendations = context?.recommendations.hasExistingRecommendations ?? false;

  let topGap: GapEntry | null = null;
  if (hasGaps && gaps!.topGaps.length > 0) {
    topGap = gaps!.topGaps[0];
    reasoning.push(`top_gap: ${topGap.category}/${topGap.label ?? topGap.termId}`);
  } else {
    reasoning.push("no_gaps_found");
  }

  const shouldGenerateRecommendations = !hasRecommendations;
  if (shouldGenerateRecommendations) {
    reasoning.push("recommendations: generate (none exist)");
  } else {
    reasoning.push(`recommendations: skip (${context?.recommendations.totalCount ?? 0} exist)`);
  }

  const shouldRefreshCri = hasGaps && gaps!.totalGaps >= CRI_REFRESH_GAP_THRESHOLD;
  if (shouldRefreshCri) {
    reasoning.push(`cri: refresh (${gaps!.totalGaps} gaps ≥ ${CRI_REFRESH_GAP_THRESHOLD})`);
  } else {
    reasoning.push("cri: skip (below threshold)");
  }

  const result: RejectionDecision = {
    topGap, hasRecommendations, shouldGenerateRecommendations,
    shouldRefreshCri, maxIntents: MAX_INTENTS_PER_REJECTION, reasoning,
  };

  result.explainability = buildExplainabilityTrace({
    traceId,
    stages: [{ stage: "rejection_decision", reasoning }],
  });

  return result;
}

// ══════════════════════════════════════════════════════════════
// 2. PROFILE UPDATE DECISION (Sprint 11)
// ══════════════════════════════════════════════════════════════

export interface ProfileUpdateDecision {
  /** Whether recomputation should happen at all */
  shouldRecompute: boolean;
  /** Which intelligence pipelines to trigger */
  shouldRefreshCri: boolean;
  shouldRefreshMatch: boolean;
  shouldRefreshGaps: boolean;
  /** Priority level for this update */
  priority: DecisionPriority;
  /** Max intents to emit */
  maxIntents: number;
  /** Human-readable reasoning trace */
  reasoning: string[];
  explainability?: ExplainabilityMeta;
  explainabilityView?: ExplainabilityView;
}

const MAX_INTENTS_PER_PROFILE_UPDATE = 4;

export function resolveProfileUpdateDecision(
  context: ProfileUpdateDecisionContext | undefined,
  traceId: string,
): ProfileUpdateDecision {
  const reasoning: string[] = [];
  const tid = traceId;

  if (!context || !context.hasMeaningfulChange) {
    reasoning.push("cosmetic_only: skip recomputation");
    return {
      shouldRecompute: false,
      shouldRefreshCri: false,
      shouldRefreshMatch: false,
      shouldRefreshGaps: false,
      priority: "low",
      maxIntents: 0,
      reasoning,
      explainability: buildExplainabilityTrace({
        traceId: tid,
        stages: [{ stage: "profile_update_decision", reasoning }],
      }),
    };
  }

  reasoning.push(`meaningful_fields: [${context.meaningfulFields.join(", ")}]`);

  // High-impact fields → high priority
  const highImpactFields = new Set(["subject_term_ids", "subjects", "certification_term_ids", "certifications", "skill_term_ids", "skills"]);
  const hasHighImpact = context.meaningfulFields.some((f) => highImpactFields.has(f));
  const priority: DecisionPriority = hasHighImpact ? "high" : "normal";

  reasoning.push(`priority: ${priority}`);
  reasoning.push(`cosmetic_fields_ignored: [${context.cosmeticFields.join(", ")}]`);

  return {
    shouldRecompute: true,
    shouldRefreshCri: true,
    shouldRefreshMatch: true,
    shouldRefreshGaps: hasHighImpact, // Only refresh gaps on high-impact changes
    priority,
    maxIntents: MAX_INTENTS_PER_PROFILE_UPDATE,
    reasoning,
    explainability: buildExplainabilityTrace({
      traceId: tid,
      stages: [{ stage: "profile_update_decision", reasoning }],
    }),
  };
}

// ══════════════════════════════════════════════════════════════
// 3. TRAINING COMPLETION DECISION (Sprint 11)
// ══════════════════════════════════════════════════════════════

export interface TrainingCompletionDecision {
  /** Whether this completion closes a known gap */
  closesGap: boolean;
  /** The specific gaps closed (for focus) */
  closedGaps: GapEntry[];
  /** Whether recommendations should be generated */
  shouldGenerateRecommendations: boolean;
  /** Whether CRI should be refreshed */
  shouldRefreshCri: boolean;
  /** Priority level */
  priority: DecisionPriority;
  /** Max intents to emit */
  maxIntents: number;
  /** Reasoning trace */
  reasoning: string[];
  explainability?: ExplainabilityMeta;
  explainabilityView?: ExplainabilityView;
}

const MAX_INTENTS_PER_TRAINING_COMPLETION = 4;

export function resolveTrainingCompletionDecision(
  context: TrainingCompletionDecisionContext | undefined,
  traceId: string,
): TrainingCompletionDecision {
  const reasoning: string[] = [];
  const tid = traceId;

  // No context → fire conservatively
  if (!context) {
    reasoning.push("no_context: default behavior");
    return {
      closesGap: false, closedGaps: [],
      shouldGenerateRecommendations: true,
      shouldRefreshCri: true,
      priority: "normal",
      maxIntents: MAX_INTENTS_PER_TRAINING_COMPLETION,
      reasoning,
      explainability: buildExplainabilityTrace({
        traceId: tid,
        stages: [{ stage: "training_completion_decision", reasoning }],
      }),
    };
  }

  const closesGap = context.closesGap;
  const closedGaps = context.closedGaps;

  // Priority: high if gap-closing, normal otherwise
  const priority: DecisionPriority = closesGap ? "high" : "normal";

  if (closesGap) {
    reasoning.push(`gap_closed: ${closedGaps.map((g) => g.category + "/" + (g.label ?? g.termId)).join(", ")}`);
  } else {
    reasoning.push("no_gap_closed");
  }

  // Recommendations: skip if already present
  const shouldGenerateRecommendations = !context.hasExistingRecommendations;
  if (shouldGenerateRecommendations) {
    reasoning.push("recommendations: generate (none exist)");
  } else {
    reasoning.push(`recommendations: skip (${context.recommendationCount} exist)`);
  }

  // CRI: always refresh if gap-closing; otherwise refresh anyway (completion is a signal)
  const shouldRefreshCri = true;
  reasoning.push("cri: refresh (completion is always a signal)");
  reasoning.push(`priority: ${priority}`);

  return {
    closesGap, closedGaps,
    shouldGenerateRecommendations, shouldRefreshCri,
    priority, maxIntents: MAX_INTENTS_PER_TRAINING_COMPLETION,
    reasoning,
    explainability: buildExplainabilityTrace({
      traceId: tid,
      stages: [{ stage: "training_completion_decision", reasoning }],
    }),
  };
}

// ══════════════════════════════════════════════════════════════
// 4. EVIDENCE APPROVAL DECISION (Sprint 11)
// ══════════════════════════════════════════════════════════════

export interface EvidenceApprovalDecision {
  /** Whether this evidence is redundant */
  isRedundant: boolean;
  /** Whether trust state should be refreshed */
  shouldRefreshTrust: boolean;
  /** Whether talent state should be refreshed */
  shouldRefreshTalent: boolean;
  /** Whether recommendations should be generated */
  shouldGenerateRecommendations: boolean;
  /** Whether mentor reputation should be refreshed */
  shouldRefreshMentorReputation: boolean;
  /** Priority level */
  priority: DecisionPriority;
  /** Max intents to emit */
  maxIntents: number;
  /** Reasoning trace */
  reasoning: string[];
  explainability?: ExplainabilityMeta;
  explainabilityView?: ExplainabilityView;
}

const MAX_INTENTS_PER_EVIDENCE_APPROVAL = 5;

export function resolveEvidenceApprovalDecision(
  context: EvidenceApprovalDecisionContext | undefined,
  traceId: string,
): EvidenceApprovalDecision {
  const reasoning: string[] = [];
  const tid = traceId;

  // No context → full response (safe default)
  if (!context) {
    reasoning.push("no_context: default full response");
    return {
      isRedundant: false,
      shouldRefreshTrust: true, shouldRefreshTalent: true,
      shouldGenerateRecommendations: true,
      shouldRefreshMentorReputation: true,
      priority: "normal",
      maxIntents: MAX_INTENTS_PER_EVIDENCE_APPROVAL,
      reasoning,
      explainability: buildExplainabilityTrace({
        traceId: tid,
        stages: [{ stage: "evidence_approval_decision", reasoning }],
      }),
    };
  }

  const isRedundant = context.hasRedundantEvidence;

  if (isRedundant) {
    reasoning.push(`redundant_evidence: verified=${context.verifiedCount}, total=${context.totalCredentials}`);
    // Redundant evidence → minimal response
    return {
      isRedundant: true,
      shouldRefreshTrust: false, // Already well-verified
      shouldRefreshTalent: false,
      shouldGenerateRecommendations: false,
      shouldRefreshMentorReputation: true, // Always update mentor's record
      priority: "low",
      maxIntents: 1,
      reasoning,
      explainability: buildExplainabilityTrace({
        traceId: tid,
        stages: [{ stage: "evidence_approval_decision", reasoning }],
      }),
    };
  }

  // Meaningful evidence → targeted response
  const shouldGenerateRecommendations = !context.hasExistingRecommendations;
  if (shouldGenerateRecommendations) {
    reasoning.push("recommendations: generate (none exist)");
  } else {
    reasoning.push(`recommendations: skip (${context.recommendationCount} exist)`);
  }

  // Priority: high if teacher has few verified credentials (building trust)
  const priority: DecisionPriority = context.verifiedCount < 3 ? "high" : "normal";
  reasoning.push(`priority: ${priority} (verified=${context.verifiedCount})`);

  return {
    isRedundant: false,
    shouldRefreshTrust: true,
    shouldRefreshTalent: true,
    shouldGenerateRecommendations,
    shouldRefreshMentorReputation: true,
    priority, maxIntents: MAX_INTENTS_PER_EVIDENCE_APPROVAL,
    reasoning,
    explainability: buildExplainabilityTrace({
      traceId: tid,
      stages: [{ stage: "evidence_approval_decision", reasoning }],
    }),
  };
}

// ══════════════════════════════════════════════════════════════
// 5. CROSS-DOMAIN DECISION SCENARIOS (Sprint 12)
// ══════════════════════════════════════════════════════════════

/**
 * Cross-domain decision overlay that modifies existing single-domain
 * decisions based on multi-signal reasoning.
 *
 * NOT a replacement — applied AFTER the per-event decision is made.
 */

export type CrossDomainScenario =
  | "rejection_plus_training_improvement"
  | "rejection_plus_mentorship_evidence"
  | "high_cri_verified_evidence"
  | "low_cri_repeated_failures"
  | "none";

export interface CrossDomainDecision {
  /** Which scenario was detected */
  scenario: CrossDomainScenario;
  /** Recommendation cap — limit recs to this count (null = no cap) */
  recommendationCap: number | null;
  /** Whether to promote advanced/opportunity actions over basic recs */
  promoteAdvanced: boolean;
  /** Whether to suppress beginner-level recommendations */
  suppressBeginner: boolean;
  /** Whether to boost matching priority */
  boostMatching: boolean;
  /** Whether to minimize recommendations entirely */
  minimizeRecommendations: boolean;
  /** Priority override (null = keep original) */
  priorityOverride: DecisionPriority | null;
  /** Focus on foundational gaps only */
  foundationalOnly: boolean;
  /** Reasoning trace */
  reasoning: string[];
  explainability?: ExplainabilityMeta;
  explainabilityView?: ExplainabilityView;
}

const EMPTY_CROSS_DOMAIN: CrossDomainDecision = {
  scenario: "none",
  recommendationCap: null,
  promoteAdvanced: false,
  suppressBeginner: false,
  boostMatching: false,
  minimizeRecommendations: false,
  priorityOverride: null,
  foundationalOnly: false,
  reasoning: ["no cross-domain scenario detected"],
};

/**
 * Evaluate cross-domain scenarios against a teacher's composite context.
 *
 * Returns the FIRST matching scenario (highest priority first).
 * Scenarios are mutually exclusive — only one applies per decision cycle.
 */
export function resolveCrossDomainDecision(
  ctx: CrossDomainContext | undefined,
  traceId: string,
): CrossDomainDecision {
  const tid = traceId;
  if (!ctx || !ctx.available) {
    const result = {
      ...EMPTY_CROSS_DOMAIN,
      explainability: buildExplainabilityTrace({
        traceId: tid,
        stages: [{ stage: "cross_domain_evaluation", reasoning: ["no context available"] }],
      }),
    };
    logDecisionTrace({ traceId: tid, decisionType: "cross_domain", explainability: result.explainability, metadata: { scenario: "none", reason: "no context" } });
    return result;
  }

  const evaluationPath: string[] = [];

  const lowCriRepeatedFailures = evaluateLowCriRepeatedFailures(ctx);
  if (lowCriRepeatedFailures) {
    evaluationPath.push("low_cri_repeated_failures → MATCHED");
    logCrossDomainResult(lowCriRepeatedFailures, evaluationPath, tid);
    return lowCriRepeatedFailures;
  }
  evaluationPath.push("low_cri_repeated_failures → skipped");

  const highCriVerified = evaluateHighCriVerifiedEvidence(ctx);
  if (highCriVerified) {
    evaluationPath.push("high_cri_verified_evidence → MATCHED");
    logCrossDomainResult(highCriVerified, evaluationPath, tid);
    return highCriVerified;
  }
  evaluationPath.push("high_cri_verified_evidence → skipped");

  const rejectionTraining = evaluateRejectionPlusTraining(ctx);
  if (rejectionTraining) {
    evaluationPath.push("rejection_plus_training_improvement → MATCHED");
    logCrossDomainResult(rejectionTraining, evaluationPath, tid);
    return rejectionTraining;
  }
  evaluationPath.push("rejection_plus_training_improvement → skipped");

  const rejectionMentorship = evaluateRejectionPlusMentorship(ctx);
  if (rejectionMentorship) {
    evaluationPath.push("rejection_plus_mentorship_evidence → MATCHED");
    logCrossDomainResult(rejectionMentorship, evaluationPath, tid);
    return rejectionMentorship;
  }
  evaluationPath.push("rejection_plus_mentorship_evidence → skipped");

  const noMatchResult = {
    ...EMPTY_CROSS_DOMAIN,
    explainability: buildExplainabilityTrace({
      traceId: tid,
      stages: [
        { stage: "cross_domain_evaluation", reasoning: evaluationPath },
        { stage: "scenario", reasoning: ["no cross-domain scenario detected"] },
      ],
    }),
  };
  logDecisionTrace({
    traceId: tid,
    decisionType: "cross_domain",
    explainability: noMatchResult.explainability,
    metadata: { evaluationPath, scenario: "none" },
  });

  return noMatchResult;
}

function logCrossDomainResult(decision: CrossDomainDecision, evaluationPath: string[], traceId: string): void {
  decision.explainability = buildExplainabilityTrace({
    traceId,
    stages: [
      { stage: "evaluation", reasoning: evaluationPath },
      { stage: "scenario", reasoning: decision.reasoning },
    ],
  });
  logDecisionTrace({
    traceId,
    decisionType: "cross_domain",
    explainability: decision.explainability,
    metadata: { scenario: decision.scenario },
  });
}

// ── Scenario 1: Rejection + Training Improvement ──────────────
// Condition: gaps are reducing (talent has fewer unresolved than gap snapshot)
//            AND teacher is actively growing
// Effect: boost matching, reduce basic recs, promote advanced actions

function evaluateRejectionPlusTraining(
  ctx: CrossDomainContext,
): CrossDomainDecision | null {
  const gapsReducing = ctx.gaps.available && ctx.talent.available
    && ctx.talent.unresolvedGapCount < ctx.gaps.totalGaps;
  const isGrowing = ctx.signals.activelyGrowing;

  if (!gapsReducing || !isGrowing) return null;

  const reasoning = [
    "scenario: rejection_plus_training_improvement",
    `gaps_reducing: snapshot=${ctx.gaps.totalGaps} → talent_unresolved=${ctx.talent.unresolvedGapCount}`,
    `growth_momentum: ${ctx.talent.growthMomentum}`,
    "action: boost matching, suppress basic recs, promote advanced",
  ];

  return {
    scenario: "rejection_plus_training_improvement",
    recommendationCap: 3,
    promoteAdvanced: true,
    suppressBeginner: true,
    boostMatching: true,
    minimizeRecommendations: false,
    priorityOverride: "high",
    foundationalOnly: false,
    reasoning,
  };
}

// ── Scenario 2: Rejection + Mentorship Evidence ───────────────
// Condition: teacher has trust signals (verified > 0) AND is growing
// Effect: boost talent readiness, suppress beginner recs

function evaluateRejectionPlusMentorship(
  ctx: CrossDomainContext,
): CrossDomainDecision | null {
  const hasVerifiedEvidence = ctx.trust.available && ctx.trust.verifiedCount > 0;
  const isGrowing = ctx.signals.activelyGrowing;

  if (!hasVerifiedEvidence || !isGrowing) return null;

  const reasoning = [
    "scenario: rejection_plus_mentorship_evidence",
    `verified_evidence: ${ctx.trust.verifiedCount}/${ctx.trust.totalCount}`,
    `growth_momentum: ${ctx.talent.growthMomentum}`,
    "action: boost readiness, suppress beginner recs, surface higher-level",
  ];

  return {
    scenario: "rejection_plus_mentorship_evidence",
    recommendationCap: 3,
    promoteAdvanced: true,
    suppressBeginner: true,
    boostMatching: false,
    minimizeRecommendations: false,
    priorityOverride: "normal",
    foundationalOnly: false,
    reasoning,
  };
}

// ── Scenario 3: High CRI + Verified + Evidence ────────────────
// Condition: CRI ≥ 55 (strong+), trust is full/high, has hiring advantages
// Effect: minimize recommendations, shift to opportunity surfacing

function evaluateHighCriVerifiedEvidence(
  ctx: CrossDomainContext,
): CrossDomainDecision | null {
  const highCri = ctx.cri.available && ctx.cri.score != null && ctx.cri.score >= 55;
  const strongTrust = ctx.trust.available
    && (ctx.trust.overallStatus === "full" || ctx.trust.verificationRatio >= 0.8);
  const hasAdvantages = ctx.talent.available && ctx.talent.hiringAdvantageCount >= 2;

  if (!highCri || !strongTrust || !hasAdvantages) return null;

  const reasoning = [
    "scenario: high_cri_verified_evidence",
    `cri: ${ctx.cri.score} (${ctx.cri.band})`,
    `trust: ${ctx.trust.overallStatus} (ratio=${ctx.trust.verificationRatio})`,
    `hiring_advantages: ${ctx.talent.hiringAdvantageCount}`,
    "action: minimize recs, opportunity surfacing, avoid over-guidance",
  ];

  return {
    scenario: "high_cri_verified_evidence",
    recommendationCap: 1,
    promoteAdvanced: true,
    suppressBeginner: true,
    boostMatching: true,
    minimizeRecommendations: true,
    priorityOverride: "low",
    foundationalOnly: false,
    reasoning,
  };
}

// ── Scenario 4: Low CRI + Repeated Failures ──────────────────
// Condition: CRI < 35 (low) AND multiple critical gaps
// Effect: restrict recs to top 1-2, foundational only, suppress noise

function evaluateLowCriRepeatedFailures(
  ctx: CrossDomainContext,
): CrossDomainDecision | null {
  const lowCri = ctx.cri.available && ctx.cri.score != null && ctx.cri.score < 35;
  const manyCriticalGaps = ctx.gaps.available && ctx.gaps.hasCriticalGaps && ctx.gaps.totalGaps >= 3;

  if (!lowCri || !manyCriticalGaps) return null;

  const reasoning = [
    "scenario: low_cri_repeated_failures",
    `cri: ${ctx.cri.score} (${ctx.cri.band})`,
    `gaps: ${ctx.gaps.totalGaps} total, critical=${ctx.gaps.hasCriticalGaps}`,
    `critical_categories: [${ctx.gaps.categories.filter(c => ["certification", "subject", "curriculum"].includes(c)).join(", ")}]`,
    "action: restrict to top 1-2 recs, foundational only, suppress noise",
  ];

  return {
    scenario: "low_cri_repeated_failures",
    recommendationCap: 2,
    promoteAdvanced: false,
    suppressBeginner: false,
    boostMatching: false,
    minimizeRecommendations: false,
    priorityOverride: "high",
    foundationalOnly: true,
    reasoning,
  };
}

// ══════════════════════════════════════════════════════════════
// 6. MULTI-EVENT SIGNAL MODIFIER — Rejection + Gaps (Sprint 4.2)
// ══════════════════════════════════════════════════════════════

/**
 * Multi-event modifier for rejection decisions.
 *
 * When a teacher has BOTH:
 *   - A recent rejection (from event history)
 *   - Unresolved gaps (totalGaps > 0)
 *
 * Then:
 *   - Priority is boosted to "high"
 *   - Recommendations are always generated (override existing check)
 *   - CRI refresh is forced
 *
 * This is the ONLY multi-event rule. All inputs are numeric/boolean.
 * Does NOT modify the original decision — returns an overlay.
 */

export interface MultiEventModifier {
  applied: boolean;
  boostPriority: boolean;
  forceRecommendations: boolean;
  forceCriRefresh: boolean;
  reasoning: string[];
}

// ══════════════════════════════════════════════════════════════
// 6. CONTEXTUAL PRIORITY RESOLVER (Sprint 4.2 Step 3)
// ══════════════════════════════════════════════════════════════

/**
 * Resolves dynamic priority based on multi-signal context.
 *
 * Priority escalation rules (all numeric, no labels):
 *   - "critical": criScore < 30 AND totalGaps >= 3 AND hasRecentRejection
 *   - "high":     criScore < 50 AND totalGaps >= 1, OR multiEvent boost
 *   - "normal":   default
 *   - "low":      criScore >= 80 AND totalGaps === 0
 *
 * Returns a bounded priority — never unbounded escalation.
 */
export type ContextualPriority = "critical" | "high" | "normal" | "low";

export interface ContextualPriorityResult {
  priority: ContextualPriority;
  reasoning: string[];
}

const CRI_CRITICAL_THRESHOLD = 30;
const CRI_HIGH_THRESHOLD = 50;
const CRI_LOW_THRESHOLD = 80;
const GAPS_CRITICAL_THRESHOLD = 3;
const GAPS_HIGH_THRESHOLD = 1;

export function resolveContextualPriority(
  criScore: number | null,
  totalGaps: number,
  hasRecentRejection: boolean,
  multiEventBoost: boolean,
  crossDomainBoost: boolean = false,
): ContextualPriorityResult {
  const reasoning: string[] = [];

  // Critical: very low CRI + many gaps + recent rejection
  if (
    criScore !== null &&
    criScore < CRI_CRITICAL_THRESHOLD &&
    totalGaps >= GAPS_CRITICAL_THRESHOLD &&
    hasRecentRejection
  ) {
    reasoning.push(`critical: cri=${criScore} (<${CRI_CRITICAL_THRESHOLD}), gaps=${totalGaps} (>=${GAPS_CRITICAL_THRESHOLD}), recentRejection=true`);
    return { priority: "critical", reasoning };
  }

  // High: low CRI + gaps, OR multi-event boost, OR cross-domain boost
  if (
    (criScore !== null && criScore < CRI_HIGH_THRESHOLD && totalGaps >= GAPS_HIGH_THRESHOLD) ||
    multiEventBoost ||
    crossDomainBoost
  ) {
    reasoning.push(
      crossDomainBoost
        ? `high: crossDomain boost (training/trust improvement detected)`
        : multiEventBoost
          ? `high: multiEvent boost applied`
          : `high: cri=${criScore} (<${CRI_HIGH_THRESHOLD}), gaps=${totalGaps} (>=${GAPS_HIGH_THRESHOLD})`,
    );
    return { priority: "high", reasoning };
  }

  // Low: strong CRI + no gaps
  if (criScore !== null && criScore >= CRI_LOW_THRESHOLD && totalGaps === 0) {
    reasoning.push(`low: cri=${criScore} (>=${CRI_LOW_THRESHOLD}), gaps=0`);
    return { priority: "low", reasoning };
  }

  // Normal: default
  reasoning.push("normal: default priority");
  return { priority: "normal", reasoning };
}

const MULTI_EVENT_GAP_THRESHOLD = 1;

export function resolveRejectionMultiEventModifier(
  recentEvents: RecentEventContext | undefined,
  totalGaps: number,
  criScore: number | null,
): MultiEventModifier {
  const noOp: MultiEventModifier = {
    applied: false,
    boostPriority: false,
    forceRecommendations: false,
    forceCriRefresh: false,
    reasoning: ["multi_event: not applicable"],
  };

  if (!recentEvents?.available) return noOp;
  if (!recentEvents.hasRecentRejection) return noOp;
  if (totalGaps < MULTI_EVENT_GAP_THRESHOLD) return noOp;

  const reasoning: string[] = [
    "multi_event: rejection + gaps detected",
    `gaps: ${totalGaps} (≥ ${MULTI_EVENT_GAP_THRESHOLD})`,
  ];

  // Boost priority — rejected teacher with gaps needs stronger response
  const boostPriority = true;
  reasoning.push("priority: boosted to high");

  // Force recommendations — even if some exist, rejection + gaps warrants refresh
  const forceRecommendations = true;
  reasoning.push("recommendations: forced generation");

  // Force CRI refresh if score is below threshold
  const forceCriRefresh = criScore !== null && criScore < 60;
  if (forceCriRefresh) {
    reasoning.push(`cri: forced refresh (score ${criScore} < 60)`);
  }

  return { applied: true, boostPriority, forceRecommendations, forceCriRefresh, reasoning };
}

// ══════════════════════════════════════════════════════════════
// 7. CROSS-DOMAIN MODIFIER (Sprint 4.3 Step 2)
// ══════════════════════════════════════════════════════════════

/**
 * Cross-domain modifier for rejection decisions.
 *
 * Case: Teacher was rejected AND has gaps, BUT has shown improvement
 *       via training completion OR trust improvement.
 *
 * When active:
 *   - boostRecommendationPriority → recommendations get "high" priority
 *   - focusOnGapAligned → prefer gap-aligned recommendations
 *   - boostMatchRefresh → trigger match refresh (teacher improved)
 *
 * All inputs are numeric/boolean. No labels.
 * Does NOT fire unless rejection + gaps baseline is met.
 */

export interface CrossDomainModifier {
  applied: boolean;
  boostRecommendationPriority: boolean;
  focusOnGapAligned: boolean;
  boostMatchRefresh: boolean;
  reasoning: string[];
}

const CROSS_DOMAIN_VERIFICATION_THRESHOLD = 0.5;
const CROSS_DOMAIN_COMPLETIONS_THRESHOLD = 1;

export function resolveRejectionCrossDomainModifier(
  hasRecentRejection: boolean,
  totalGaps: number,
  recentCompletionsCount: number,
  verificationRatio: number,
  hasVerifiedCredentials: boolean,
): CrossDomainModifier {
  const noOp: CrossDomainModifier = {
    applied: false,
    boostRecommendationPriority: false,
    focusOnGapAligned: false,
    boostMatchRefresh: false,
    reasoning: ["cross_domain: not applicable"],
  };

  // Baseline: must have rejection + gaps
  if (!hasRecentRejection || totalGaps < 1) return noOp;

  // Improvement signal: training completed OR trust improved
  const hasTrainingImprovement = recentCompletionsCount >= CROSS_DOMAIN_COMPLETIONS_THRESHOLD;
  const hasTrustImprovement = hasVerifiedCredentials && verificationRatio >= CROSS_DOMAIN_VERIFICATION_THRESHOLD;

  if (!hasTrainingImprovement && !hasTrustImprovement) return noOp;

  const reasoning: string[] = [
    "cross_domain: rejection + gaps + improvement detected",
  ];

  // Boost recommendation priority — teacher is actively improving
  const boostRecommendationPriority = true;
  reasoning.push("recommendations: priority boosted (active improvement)");

  // Focus on gap-aligned — teacher has gaps AND is training, align recommendations
  const focusOnGapAligned = hasTrainingImprovement && totalGaps >= 2;
  if (focusOnGapAligned) {
    reasoning.push(`gap_aligned: focused (completions=${recentCompletionsCount}, gaps=${totalGaps})`);
  }

  // Boost match refresh — trust improved, re-evaluate job fit
  const boostMatchRefresh = hasTrustImprovement;
  if (boostMatchRefresh) {
    reasoning.push(`match_refresh: boosted (verificationRatio=${verificationRatio})`);
  }

  return { applied: true, boostRecommendationPriority, focusOnGapAligned, boostMatchRefresh, reasoning };
}

// ── Sprint 4.3 Step 4: Recommendation Targeting ──────────────

/**
 * Produces cross-domain targeting metadata for recommendation intents.
 *
 * Enriches downstream handlers with:
 *   - gapTermIds → which gaps to close
 *   - gapCategories → which domains the gaps belong to
 *   - trustLevel → verified / partial / none
 *   - excludeCompletedTermIds → avoid re-recommending completed training
 *
 * Pure function. No side-effects. All inputs numeric/boolean/arrays.
 */

export interface RecommendationTargeting {
  applied: boolean;
  gapTermIds: string[];
  gapCategories: string[];
  trustLevel: "verified" | "partial" | "none";
  excludeCompletedTermIds: string[];
  reasoning: string[];
}

export function resolveRecommendationTargeting(
  topGapTermIds: string[],
  gapCategories: string[],
  verificationRatio: number,
  hasVerifiedCredentials: boolean,
  completedTrainingTermIds: string[],
  totalGaps: number,
): RecommendationTargeting {
  const reasoning: string[] = [];

  if (totalGaps === 0 && completedTrainingTermIds.length === 0) {
    return {
      applied: false,
      gapTermIds: [],
      gapCategories: [],
      trustLevel: "none",
      excludeCompletedTermIds: [],
      reasoning: ["targeting: no gaps or completions to refine"],
    };
  }

  // Trust level — numeric thresholds only
  const trustLevel: RecommendationTargeting["trustLevel"] =
    hasVerifiedCredentials && verificationRatio >= 0.8
      ? "verified"
      : verificationRatio >= 0.4
        ? "partial"
        : "none";
  reasoning.push(`trust: ${trustLevel} (ratio=${verificationRatio})`);

  // Gap targeting
  if (topGapTermIds.length > 0) {
    reasoning.push(`gaps: targeting ${topGapTermIds.length} term(s) in [${gapCategories.join(", ")}]`);
  }

  // Exclusion — avoid recommending training already completed
  if (completedTrainingTermIds.length > 0) {
    reasoning.push(`exclude: ${completedTrainingTermIds.length} completed training term(s)`);
  }

  return {
    applied: true,
    gapTermIds: topGapTermIds,
    gapCategories,
    trustLevel,
    excludeCompletedTermIds: completedTrainingTermIds,
    reasoning,
  };
}
