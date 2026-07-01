/**
 * Talent Intelligence Profile — Type Definitions
 *
 * Unified intelligence state for a teacher, aggregated from
 * CRI, gaps, credentials, training, pathways, and match signals.
 *
 * Sprint 7A — Intelligence Activation Layer
 */

// ── Hiring Advantage Signal ────────────────────────────────────

export type HiringAdvantageType =
  | "verified_teaching_practice"
  | "credential_strength"
  | "pathway_achieved"
  | "verified_classroom_artifact"
  | "gap_closure"
  | "growth_momentum"
  | "mentor_validated";

export interface HiringAdvantageSignal {
  type: HiringAdvantageType;
  label: string;
  /** Evidence source (e.g. credential ID, completion ID) */
  sourceId?: string;
  /** When this advantage was earned */
  earnedAt: string;
}

// ── Growth Momentum ────────────────────────────────────────────

export type GrowthMomentum = "inactive" | "emerging" | "active" | "accelerating";

// ── Readiness Level ────────────────────────────────────────────

export type ReadinessLevel = "early" | "developing" | "ready" | "highly_ready";

// ── Credential Strength ────────────────────────────────────────

export type CredentialStrength = "none" | "basic" | "moderate" | "strong" | "exceptional";

// ── Talent Intelligence Profile ────────────────────────────────

export interface TalentIntelligenceProfile {
  teacherId: string;

  // CRI
  criScore: number;
  criDimensions: CriDimensionSummary[];
  criJobId: string | null;

  // Verified signals
  verifiedSignalCount: number;
  verifiedCompletionCount: number;

  // Credentials
  credentialCount: number;
  credentialVerifiedCount: number;
  credentialStrength: CredentialStrength;

  // Pathways
  pathwayCompletionCount: number;
  activePathwayCount: number;

  // Training
  trainingCompletionCount: number;

  // Gaps
  unresolvedGapCount: number;
  gapCategories: string[];

  // Match
  bestMatchScore: number | null;
  bestMatchJobId: string | null;

  // Hiring advantage
  hiringAdvantageSignals: HiringAdvantageSignal[];

  // Growth
  growthMomentum: GrowthMomentum;

  // Readiness
  readinessLevel: ReadinessLevel;

  // Meta
  intelligenceUpdatedAt: string;
  engineVersion: string;
}

export interface CriDimensionSummary {
  dimension: string;
  label: string;
  score: number;
  maxScore: number;
  matched: boolean;
}

// ── Aggregator Raw Data ────────────────────────────────────────

export interface TalentAggregatorRawData {
  criSnapshot: {
    score: number;
    dimensions: CriDimensionSummary[];
    jobId: string;
    gapTermIds: string[];
  } | null;

  gapSnapshot: {
    totalGaps: number;
    gaps: { category: string }[];
  } | null;

  matchSnapshots: {
    score: number;
    jobId: string;
    confidence: string;
  }[];

  verifiedState: {
    verifiedCount: number;
    totalCount: number;
    overallStatus: string;
  } | null;

  trainingCompletions: {
    id: string;
    isVerified: boolean;
    completedAt: string;
  }[];

  earnedCredentials: {
    id: string;
    status: string;
    issuedAt: string;
  }[];

  activePathways: {
    id: string;
    status: string;
    progressPercent: number | null;
  }[];

  completedPathways: {
    id: string;
    completedAt: string | null;
  }[];

  mentorApprovals: {
    id: string;
    reviewedAt: string;
  }[];

  approvedEvidence: {
    id: string;
    reviewStatus: string;
  }[];
}
