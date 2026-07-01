/**
 * Segment Config Profiles — Sprint 9: Personalization Layer
 *
 * Defines per-segment overrides for policy config, messaging tone,
 * and sequencing preferences. Extends the base config system from Sprint 8.
 *
 * ⚠️ These profiles modify behavior per user segment.
 *    The base config (variant A/B) is still the foundation —
 *    segment profiles layer ON TOP of the active variant config.
 */

import type { RecommendationPolicyConfig } from "../policy/recommendation-policy.config";
import { getActiveConfig } from "../policy/recommendation-policy.config";
import type { UserSegment } from "./user-segmentation";

// ── Segment-Specific Overrides ────────────────────────────────

export interface SegmentConfigOverride {
  /** Override exposure limits */
  maxTotal?: number;
  maxPerGroup?: number;
  /** Override suppression threshold */
  rejectionSuppressionThreshold?: number;
  /** Sequencing boost: which group gets priority lift */
  sequencingBoost?: string;
}

export interface SegmentMessaging {
  /** Tone modifier for explanation lines */
  tone: "encouraging" | "neutral" | "action_oriented" | "supportive";
  /** Prefix for impact lines */
  impactPrefix: string;
  /** Empty-state message when no recommendations exist */
  emptyStateMessage: string;
  /** CTA style preference */
  ctaStyle: "prominent" | "standard" | "subtle";
}

export interface SegmentProfile {
  segment: UserSegment;
  configOverride: SegmentConfigOverride;
  messaging: SegmentMessaging;
}

// ── Profile Definitions ───────────────────────────────────────

const SEGMENT_PROFILES: Record<UserSegment, SegmentProfile> = {
  beginner: {
    segment: "beginner",
    configOverride: {
      maxTotal: 3,
      maxPerGroup: 1,
      rejectionSuppressionThreshold: 3,
    },
    messaging: {
      tone: "encouraging",
      impactPrefix: "Great first step — ",
      emptyStateMessage: "Welcome! We're preparing personalized recommendations based on your profile. Complete your profile to get started.",
      ctaStyle: "prominent",
    },
  },

  active: {
    segment: "active",
    configOverride: {
      // Uses base config (no override needed)
    },
    messaging: {
      tone: "neutral",
      impactPrefix: "",
      emptyStateMessage: "You're on track! New recommendations will appear as you progress through your learning journey.",
      ctaStyle: "standard",
    },
  },

  high_performer: {
    segment: "high_performer",
    configOverride: {
      maxTotal: 7,
      maxPerGroup: 3,
      rejectionSuppressionThreshold: 1,
    },
    messaging: {
      tone: "action_oriented",
      impactPrefix: "Next level — ",
      emptyStateMessage: "Excellent work! You've addressed most recommendations. Explore advanced opportunities to stay ahead.",
      ctaStyle: "subtle",
    },
  },

  struggling: {
    segment: "struggling",
    configOverride: {
      maxTotal: 4,
      maxPerGroup: 2,
      rejectionSuppressionThreshold: 1,
      sequencingBoost: "training_actions",
    },
    messaging: {
      tone: "supportive",
      impactPrefix: "This will help — ",
      emptyStateMessage: "We're identifying the best next steps for your career growth. Check back soon for personalized guidance.",
      ctaStyle: "prominent",
    },
  },
};

// ── Resolution ────────────────────────────────────────────────

/**
 * Returns the segment profile for a given segment.
 */
export function getSegmentProfile(segment: UserSegment): SegmentProfile {
  return SEGMENT_PROFILES[segment];
}

/**
 * Resolves the final policy config by merging:
 * 1. Active variant config (base)
 * 2. Segment-specific overrides (on top)
 *
 * Segment overrides win when defined.
 */
export function resolveSegmentConfig(segment: UserSegment): RecommendationPolicyConfig {
  const base = getActiveConfig();
  const override = SEGMENT_PROFILES[segment].configOverride;

  return {
    maxTotal: override.maxTotal ?? base.maxTotal,
    maxPerGroup: override.maxPerGroup ?? base.maxPerGroup,
    priorityOrder: base.priorityOrder,
    rejectionSuppressionThreshold: override.rejectionSuppressionThreshold ?? base.rejectionSuppressionThreshold,
    groupKeyMap: base.groupKeyMap,
  };
}

/**
 * Returns segment-specific messaging for UI presentation.
 */
export function getSegmentMessaging(segment: UserSegment): SegmentMessaging {
  return SEGMENT_PROFILES[segment].messaging;
}
