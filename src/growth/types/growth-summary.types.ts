/**
 * Growth Summary Types — Intelligence-Only
 *
 * All values come from intelligence_talent_profiles or intelligence snapshots.
 * NO raw domain table reads. NO local computation.
 *
 * Sprint 2.2 — Intelligence Consumption Convergence
 */

export type GrowthResolvedState = "loading" | "unavailable" | "resolved";

export interface SkillGapEntry {
  gapId: string;
  label: string;
  category: string;
  severity: string;
}

/** Counts from intelligence_talent_profiles */
export interface TrainingProgressSummary {
  completedCount: number;
  verifiedCount: number;
  activePathways: number;
}

/** Counts from intelligence_talent_profiles */
export interface CredentialSummary {
  totalActive: number;
}

/**
 * Growth signal flags from intelligence counts.
 * ⚠️ Does NOT include readiness level or skill count.
 * Readiness: use useCanonicalReadiness
 * Skills: use useSkillProfileDisplay (identity display, not intelligence)
 */
export interface GrowthSignalFlags {
  credentialsReady: boolean;
  trainingActive: boolean;
  growthMomentumActive: boolean;
}

export interface HiringSignals {
  credentialCount: number;
  trainingCompleted: number;
  verifiedCompletionCount: number;
}

export interface GrowthSummary {
  resolvedState: GrowthResolvedState;
  skillGaps: SkillGapEntry[];
  trainingProgress: TrainingProgressSummary;
  credentials: CredentialSummary;
  growthSignals: GrowthSignalFlags;
  hiringSignals: HiringSignals;
  unresolvedGapCount: number;
}
