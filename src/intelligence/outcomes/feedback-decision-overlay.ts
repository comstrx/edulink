/**
 * Feedback Decision Overlay — Sprint 15 PART 2–4
 *
 * Adjusts Smart Glue decisions based on outcome feedback signals.
 * Applied AFTER the base decision + cross-domain + provider overlays.
 *
 * Rules:
 * - NO increase in recommendation count
 * - NO duplication
 * - NO new pipelines — overlays existing decisions only
 */

import type { TeacherOutcomeFeedback } from "./outcome.types";
import type { DecisionPriority } from "@/smart-glue/decision-engine";
import type { InteractionSignals } from "@/intelligence/feedback/interaction-signal.reader";
import type { ExplainabilityMeta } from "@/intelligence/observability/explainability.types";
import type { ExplainabilityView } from "@/intelligence/explainability/explainability.presentation";
import { buildExplainabilityTrace } from "@/intelligence/observability/explainability.builder";
import { logDecisionTrace } from "@/intelligence/observability/decision-logger";

// ── Safety Constants ──────────────────────────────────────────

/** CRI modifier must stay within this band — prevents drastic swings */
const CRI_MODIFIER_MIN = 0.7;
const CRI_MODIFIER_MAX = 1.3;

/** Recommendation cap floor — never zero (always allow at least 1) */
const REC_CAP_MIN = 1;
/** Recommendation cap ceiling — never above baseline */
const REC_CAP_MAX = 4;

/** Maximum number of cases that can fire per overlay — prevents compounding */
const MAX_ACTIVE_CASES = 2;

// ── Safety Helpers ────────────────────────────────────────────

/** Clamp CRI modifier to safe band */
function clampCriModifier(value: number): number {
  return Math.max(CRI_MODIFIER_MIN, Math.min(CRI_MODIFIER_MAX, value));
}

/** Clamp recommendation cap to safe range */
function clampRecCap(value: number): number {
  return Math.max(REC_CAP_MIN, Math.min(REC_CAP_MAX, value));
}

// ── Overlay Result ────────────────────────────────────────────

export interface FeedbackOverlay {
  /** Modify CRI refresh priority */
  criPriorityModifier: number; // multiplier: >1 = boost, <1 = dampen
  /** Cap on recommendations (null = no change) */
  recommendationCap: number | null;
  /** Whether to suppress low-impact recommendations */
  suppressLowImpact: boolean;
  /** Whether to boost gap-aligned actions */
  boostGapAligned: boolean;
  /** Whether to boost recommendations from effective providers */
  boostProviderRecommendations: boolean;
  /** Priority override (null = keep original) */
  priorityOverride: DecisionPriority | null;
  /** Reasoning trace */
  reasoning: string[];
  /** Explainability metadata (Sprint 5) */
  explainability?: ExplainabilityMeta;
  /** Presentation-safe view (Sprint 5.4) */
  explainabilityView?: ExplainabilityView;
}

const NEUTRAL_OVERLAY: FeedbackOverlay = {
  criPriorityModifier: 1.0,
  recommendationCap: null,
  suppressLowImpact: false,
  boostGapAligned: false,
  boostProviderRecommendations: false,
  priorityOverride: null,
  reasoning: ["no feedback adjustment needed"],
};

/**
 * Resolve a feedback overlay based on the teacher's outcome history.
 *
 * Case 1: High rec success rate → boost similar recs, reduce noise
 * Case 2: Low rec success rate → suppress similar actions
 * Case 3: High provider outcome → boost provider recs
 * Case 4: Not improving → focus on top 1–2 actions only
 * Case 5: Interaction signals — clicks without execution → dampen; high execution → boost (Sprint 4.6)
 */
export function resolveFeedbackOverlay(
  feedback: TeacherOutcomeFeedback | null,
  interaction?: InteractionSignals | null,
  traceId?: string,
): FeedbackOverlay {
  if (!feedback && !interaction) return NEUTRAL_OVERLAY;

  const reasoning: string[] = [];
  let criPriorityModifier = 1.0;
  let recommendationCap: number | null = null;
  let suppressLowImpact = false;
  let boostGapAligned = false;
  let boostProviderRecommendations = false;
  let priorityOverride: DecisionPriority | null = null;
  let case1Active = false;
  let case4Active = false;

  if (feedback) {
    reasoning.push(`learner_band=${feedback.learnerBand}`);
    reasoning.push(`rec_success_rate=${feedback.recommendationSuccessRate}`);
    reasoning.push(`gap_closure_effectiveness=${feedback.gapClosureEffectiveness}`);
    reasoning.push(`provider_outcome=${feedback.providerOutcomeScore}`);
    reasoning.push(`improvement_after_rejection=${feedback.improvementAfterRejectionScore}`);
  }
  if (interaction) {
    reasoning.push(`interaction_clicks=${interaction.totalClicks}`);
    reasoning.push(`interaction_exec_rate=${interaction.executionRate}`);
    reasoning.push(`interaction_recent_execs=${interaction.recentExecutions}`);
  }

  // ── Case 1: Recommendations work well ───────────────────────
  // High success rate → learner follows recs and benefits
  // → boost CRI (recs are closing gaps), cap recs to avoid noise
  if (feedback && feedback.recommendationSuccessRate >= 0.5) {
    criPriorityModifier = 1.2;
    suppressLowImpact = true;
    if (recommendationCap === null || recommendationCap > 3) {
      recommendationCap = 3;
    }
    case1Active = true;
    reasoning.push("case1: high rec success (≥50%) → boost CRI, suppress low-impact recs");
  }

  // ── Case 2: Recommendations fail repeatedly ─────────────────
  // Low success + many recs issued → learner isn't following recs
  // → suppress similar, focus on gap-aligned only
  if (feedback && feedback.recommendationSuccessRate < 0.2 && feedback.successfulRecommendations === 0
      && feedback.gapClosureEffectiveness < 30) {
    suppressLowImpact = true;
    boostGapAligned = true;
    if (recommendationCap === null || recommendationCap > 2) {
      recommendationCap = 2;
    }
    reasoning.push("case2: low rec success + low closure → suppress noise, gap-aligned only");
  }

  // ── Case 3: Provider effective ──────────────────────────────
  // High provider outcome → training from good providers is working
  // → boost provider-sourced recommendations in future
  if (feedback && feedback.providerOutcomeScore >= 60) {
    boostProviderRecommendations = true;
    reasoning.push("case3: high provider outcome (≥60) → boost provider recs");
  }

  // ── Case 4: User not improving ──────────────────────────────
  // Low improvement score + CRI down → restrict to focused guidance
  if (feedback && feedback.improvementAfterRejectionScore < 25 && feedback.criTrending === "down") {
    recommendationCap = 1;
    boostGapAligned = true;
    priorityOverride = "high";
    criPriorityModifier = 0.8;
    case4Active = true;
    reasoning.push("case4: not improving (score<25, CRI↓) → top 1 action only, high priority");
  }

  // ── Case 5: Interaction signals (Sprint 4.6) ────────────────
  // Clicks without execution → user browses but doesn't act → slight dampen + priority down
  // High execution rate → user acts on recs → slight boost + priority up
  if (interaction && interaction.totalClicks >= 3) {
    if (interaction.executionRate >= 0.7) {
      // User follows through on most clicks → CRI boost + priority upgrade
      criPriorityModifier = Math.min(criPriorityModifier * 1.1, CRI_MODIFIER_MAX);
      // Only upgrade priority if not already overridden by a stronger case
      if (!priorityOverride && interaction.recentExecutions >= 2) {
        priorityOverride = "high";
        reasoning.push(`case5b: high exec rate (${(interaction.executionRate * 100).toFixed(0)}%) + ${interaction.recentExecutions} recent → priority↑high`);
      }
      reasoning.push(`case5a: high interaction exec rate (${(interaction.executionRate * 100).toFixed(0)}%) → CRI +10%`);
    } else if (interaction.executionRate < 0.3 && interaction.recentExecutions === 0) {
      // User clicks but never executes recently → dampen + priority downgrade
      criPriorityModifier = Math.max(criPriorityModifier * 0.9, CRI_MODIFIER_MIN);
      suppressLowImpact = true;
      // Only downgrade if not already set by a stronger case
      if (!priorityOverride) {
        priorityOverride = "low";
        reasoning.push(`case5b: low exec rate (${(interaction.executionRate * 100).toFixed(0)}%) + 0 recent → priority↓low`);
      }
      reasoning.push(`case5a: low interaction exec rate (${(interaction.executionRate * 100).toFixed(0)}%) + 0 recent → CRI -10%, suppress low-impact`);
    }
  }

  // ── Learner band refinement (backward compat) ───────────────
  if (feedback && feedback.learnerBand === "effective" && recommendationCap === null) {
    recommendationCap = 2;
    reasoning.push("effective learner → capped at 2 recs");
  }

  // Successful rec history → further tighten
  if (feedback && feedback.successfulRecommendations >= 3) {
    if (recommendationCap === null || recommendationCap > 2) {
      recommendationCap = 2;
    }
    reasoning.push(`${feedback.successfulRecommendations} successful recs → capped at 2`);
  }

  // ── Safety: clamp all values ──────────────────────────────────
  criPriorityModifier = clampCriModifier(criPriorityModifier);
  if (recommendationCap !== null) {
    recommendationCap = clampRecCap(recommendationCap);
  }

  // ── Safety: anti-oscillation ────────────────────────────────
  // If both boost (case1) and suppress (case4) fired, suppress wins
  // to avoid flip-flopping between expand and restrict.
  if (case1Active && case4Active) {
    criPriorityModifier = 1.0; // neutralize — conflicting signals
    reasoning.push("safety: neutralized CRI — conflicting boost+suppress");
  } else if (criPriorityModifier > 1.0 && case4Active && priorityOverride === "high") {
    criPriorityModifier = 1.0;
    reasoning.push("safety: neutralized CRI boost — conflicting case4 suppress active");
  }

  reasoning.push(`safety: cri_mod=${criPriorityModifier}, rec_cap=${recommendationCap}`);

  const overlay: FeedbackOverlay = {
    criPriorityModifier,
    recommendationCap,
    suppressLowImpact,
    boostGapAligned,
    boostProviderRecommendations,
    priorityOverride,
    reasoning,
  };

  overlay.explainability = buildExplainabilityTrace({
    traceId: traceId ?? `fb_orphan_${Date.now().toString(36)}`,
    stages: [{ stage: "feedback_overlay", reasoning }],
  });

  return overlay;
}

// ── Observability ────────────────────────────────────────────

/**
 * Summarize which adjustments the overlay actually applied vs neutral baseline.
 */
function summarizeAdjustments(overlay: FeedbackOverlay): string[] {
  const adjustments: string[] = [];
  if (overlay.criPriorityModifier !== 1.0)
    adjustments.push(`cri_priority: ×${overlay.criPriorityModifier}`);
  if (overlay.recommendationCap !== null)
    adjustments.push(`rec_cap: ${overlay.recommendationCap}`);
  if (overlay.suppressLowImpact)
    adjustments.push("suppress_low_impact");
  if (overlay.boostGapAligned)
    adjustments.push("boost_gap_aligned");
  if (overlay.boostProviderRecommendations)
    adjustments.push("boost_provider_recs");
  if (overlay.priorityOverride)
    adjustments.push(`priority_override: ${overlay.priorityOverride}`);
  return adjustments.length > 0 ? adjustments : ["none"];
}

export function logFeedbackDecision(
  teacherId: string,
  feedback: TeacherOutcomeFeedback,
  overlay: FeedbackOverlay,
  sourceEvent: string,
): void {
  logDecisionTrace({
    traceId: overlay.explainability?.traceId ?? `fb_${Date.now().toString(36)}`,
    decisionType: "feedback_overlay",
    entityId: teacherId,
    eventName: sourceEvent,
    explainability: overlay.explainability,
    metadata: {
      learnerBand: feedback.learnerBand,
      recommendationSuccessRate: feedback.recommendationSuccessRate,
      criPriorityModifier: overlay.criPriorityModifier,
      recommendationCap: overlay.recommendationCap,
      adjustments: summarizeAdjustments(overlay),
    },
  });
}
