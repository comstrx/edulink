/**
 * Recommendation Policy Configuration
 *
 * Sprint 7.5 → Sprint 8 → Sprint 9: Personalization Layer
 *
 * All tunable parameters for the recommendation pipeline.
 * Supports:
 *   - A/B variant testing (Sprint 8)
 *   - User segment overrides (Sprint 9)
 *
 * Resolution order: Base variant → Segment override
 *
 * ⚠️ Changing these values changes system behavior.
 *    Always validate with the debug view after adjustments.
 */

import type { UserSegment } from "../personalization/user-segmentation";

// ── Config Shape ──────────────────────────────────────────────

export interface RecommendationPolicyConfig {
  maxTotal: number;
  maxPerGroup: number;
  priorityOrder: Record<string, number>;
  rejectionSuppressionThreshold: number;
  groupKeyMap: Record<string, string>;
}

// ── Variant Definitions ───────────────────────────────────────

/** Baseline — current production behavior. */
const VARIANT_A: RecommendationPolicyConfig = {
  maxTotal: 5,
  maxPerGroup: 2,
  priorityOrder: { high: 0, medium: 1, low: 2 },
  rejectionSuppressionThreshold: 2,
  groupKeyMap: {
    training_actions: "training_actions",
    hiring_actions: "hiring_actions",
    trust_actions: "trust_actions",
    profile_actions: "profile_actions",
    pathway_actions: "pathway_actions",
  },
};

/** Tuned variant — slightly more generous exposure, stricter rejection suppression. */
const VARIANT_B: RecommendationPolicyConfig = {
  maxTotal: 6,
  maxPerGroup: 3,
  priorityOrder: { high: 0, medium: 1, low: 2 },
  rejectionSuppressionThreshold: 1,
  groupKeyMap: {
    training_actions: "training_actions",
    hiring_actions: "hiring_actions",
    trust_actions: "trust_actions",
    profile_actions: "profile_actions",
    pathway_actions: "pathway_actions",
  },
};

// ── Variant Assignment ────────────────────────────────────────

export type PolicyVariant = "A" | "B";

/**
 * Deterministic variant assignment based on userId.
 * Stable per user, ~50/50 split.
 */
export function assignVariant(userId: string): PolicyVariant {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash) % 2 === 0 ? "A" : "B";
}

// ── Active State ──────────────────────────────────────────────

let activeVariant: PolicyVariant = "A";
let baseConfig: RecommendationPolicyConfig = VARIANT_A;
let activeSegment: UserSegment | null = null;
let resolvedConfig: RecommendationPolicyConfig = VARIANT_A;

/**
 * Set the active variant for this session.
 * Call once on app init with the authenticated userId.
 */
export function setActiveVariant(userId: string): PolicyVariant {
  activeVariant = assignVariant(userId);
  baseConfig = activeVariant === "A" ? VARIANT_A : VARIANT_B;
  // Re-resolve with current segment
  resolvedConfig = activeSegment ? applySegmentOverride(baseConfig, activeSegment) : baseConfig;
  return activeVariant;
}

/**
 * Set the active user segment for personalized config.
 * Call after segmentation runs in useUnifiedRecommendations.
 */
export function setActiveSegment(segment: UserSegment): void {
  activeSegment = segment;
  resolvedConfig = applySegmentOverride(baseConfig, segment);
}

/** Get the current active variant label. */
export function getActiveVariant(): PolicyVariant {
  return activeVariant;
}

/** Get the current active segment. */
export function getActiveSegment(): UserSegment | null {
  return activeSegment;
}

/** Get the current resolved config (variant + segment). */
export function getActiveConfig(): RecommendationPolicyConfig {
  return resolvedConfig;
}

// ── Segment Override Application ──────────────────────────────

/** Segment-specific config overrides (Sprint 9). */
const SEGMENT_OVERRIDES: Record<UserSegment, Partial<RecommendationPolicyConfig>> = {
  beginner: {
    maxTotal: 3,
    maxPerGroup: 1,
    rejectionSuppressionThreshold: 3,
  },
  active: {
    // Uses base config — no overrides
  },
  high_performer: {
    maxTotal: 7,
    maxPerGroup: 3,
    rejectionSuppressionThreshold: 1,
  },
  struggling: {
    maxTotal: 4,
    maxPerGroup: 2,
    rejectionSuppressionThreshold: 1,
  },
};

function applySegmentOverride(
  base: RecommendationPolicyConfig,
  segment: UserSegment,
): RecommendationPolicyConfig {
  const override = SEGMENT_OVERRIDES[segment];
  return {
    maxTotal: override.maxTotal ?? base.maxTotal,
    maxPerGroup: override.maxPerGroup ?? base.maxPerGroup,
    priorityOrder: override.priorityOrder ?? base.priorityOrder,
    rejectionSuppressionThreshold: override.rejectionSuppressionThreshold ?? base.rejectionSuppressionThreshold,
    groupKeyMap: override.groupKeyMap ?? base.groupKeyMap,
  };
}

// ── Getter Functions (used by policy core) ────────────────────

export function getMaxTotal(): number {
  return resolvedConfig.maxTotal;
}

export function getMaxPerGroup(): number {
  return resolvedConfig.maxPerGroup;
}

export function getPriorityOrder(): Record<string, number> {
  return resolvedConfig.priorityOrder;
}

export function getRejectionSuppressionThreshold(): number {
  return resolvedConfig.rejectionSuppressionThreshold;
}

export function getGroupKeyMap(): Record<string, string> {
  return resolvedConfig.groupKeyMap;
}

// ── Static Exports (backward compat) ─────────────────────────

export const PRIORITY_ORDER = VARIANT_A.priorityOrder;
export const REJECTION_SUPPRESSION_THRESHOLD = VARIANT_A.rejectionSuppressionThreshold;
export const GROUP_KEY_MAP = VARIANT_A.groupKeyMap;
