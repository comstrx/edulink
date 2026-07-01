/**
 * Intelligence Injection Layer — Signal Types
 *
 * Contextual signals produced by adapters from raw snapshots.
 * These are UI-ready shapes that carry meaning, not raw numbers.
 *
 * ⚠️ ReadinessLevel is imported from canonical source.
 */

import type { CanonicalReadinessLevel } from "@/intelligence/readiness/canonical-readiness.types";

// ── Career Readiness Signal ────────────────────────────────────

/** @deprecated Use CanonicalReadinessLevel directly */
export type ReadinessLevel = CanonicalReadinessLevel;

export interface CareerReadinessSignal {
  readinessLevel: CanonicalReadinessLevel;
  careerStage: string;
  score: number;
  topStrengths: string[];
  topRisks: string[];
  confidence: "low" | "medium" | "high";
  explanationCodes: string[];
  jobId: string;
}

// ── Job Compatibility Signal ───────────────────────────────────

export interface JobCompatibilitySignal {
  compatibilityScore: number;
  strengthAreas: { dimension: string; label: string; score: number }[];
  riskAreas: { dimension: string; label: string; score: number }[];
  missingRequirements: string[];
  confidence: "low" | "medium" | "high";
  explanationCodes: string[];
  jobId: string;
}

// ── Gap Insight Signal ─────────────────────────────────────────

export interface GapInsightSignal {
  topGaps: {
    termId: string;
    label: string;
    category: string;
    severity: "low" | "medium" | "high";
  }[];
  severityLevels: { severity: "low" | "medium" | "high"; count: number }[];
  evidenceSources: string[];
  totalGaps: number;
}

// ── Actionable Recommendations ─────────────────────────────────

export interface ActionableRecommendation {
  actionType: "training" | "profile" | "verification" | "career";
  targetResourceId: string;
  priority: "critical" | "high" | "medium" | "low";
  reasonCodes: string[];
}

export interface ActionableRecommendations {
  priorityActions: ActionableRecommendation[];
  trainingActions: ActionableRecommendation[];
  profileActions: ActionableRecommendation[];
  verificationActions: ActionableRecommendation[];
  totalCount: number;
}

// ── Verification Signal ────────────────────────────────────────

export type VerificationLevel = "unverified" | "partial" | "verified";
export type BadgeType = "none" | "bronze" | "silver" | "gold";

export interface VerificationSignal {
  verificationLevel: VerificationLevel;
  verifiedComponents: { termId: string; credentialType: string; verifiedAt: string | null }[];
  missingVerifications: { termId: string; credentialType: string }[];
  badgeType: BadgeType;
  verifiedCount: number;
  totalCount: number;
}

// ── Aggregated Experience Signals ──────────────────────────────

export interface TeacherExperienceSignals {
  readiness: CareerReadinessSignal | null;
  gaps: GapInsightSignal | null;
  recommendations: ActionableRecommendations | null;
  verification: VerificationSignal | null;
}
