/**
 * School Intelligence Output Types — Sprint 13 PART 2
 *
 * Canonical read-model shapes for school-facing intelligence.
 * These are OUTPUT contracts — aggregated from existing teacher snapshots.
 *
 * No scoring logic. No computation. Pure type definitions.
 */

// ── School Hiring Intelligence ─────────────────────────────────

/** Aggregated hiring intelligence for a school's active jobs/applicants */
export interface SchoolHiringIntelligence {
  schoolId: string;
  /** Total active jobs */
  activeJobCount: number;
  /** Total applicants across active jobs */
  totalApplicants: number;
  /** Match score health distribution */
  matchHealth: MatchHealthDistribution;
  /** Candidate readiness distribution (from canonical intelligence_talent_profiles.readiness_level) */
  readinessDistribution: ReadinessDistribution;
  /** Verified candidate metrics */
  verifiedCandidates: VerifiedCandidatesSummary;
  /** Top-fit candidates (highest match scores) */
  topFitCandidates: TopFitCandidate[];
  /** When this was computed */
  computedAt: string;
}

export interface MatchHealthDistribution {
  /** Applicants with match score ≥ 70 */
  strong: number;
  /** Applicants with match score 40–69 */
  moderate: number;
  /** Applicants with match score < 40 */
  weak: number;
  /** Applicants with no match snapshot */
  unscored: number;
  /** Average match score across scored applicants */
  averageScore: number;
}

/**
 * Readiness distribution — uses CANONICAL readiness_level from
 * intelligence_talent_profiles, NOT recomputed from CRI scores.
 */
export interface ReadinessDistribution {
  /** readiness_level = "highly_ready" */
  highlyReady: number;
  /** readiness_level = "ready" */
  ready: number;
  /** readiness_level = "developing" */
  developing: number;
  /** readiness_level = "early" */
  early: number;
  /** No talent profile / no readiness_level */
  unscored: number;
}

export interface VerifiedCandidatesSummary {
  /** Fully verified applicants */
  fullyVerified: number;
  /** Partially verified applicants */
  partiallyVerified: number;
  /** Unverified applicants */
  unverified: number;
  /** Percentage of verified (full + partial) */
  verifiedSharePercent: number;
}

export interface TopFitCandidate {
  teacherId: string;
  jobId: string;
  matchScore: number;
  criScore: number | null;
  verifiedStatus: "none" | "partial" | "full";
}

// ── School Team Intelligence ───────────────────────────────────

/** Aggregated team intelligence for a school's staff */
export interface SchoolTeamIntelligence {
  schoolId: string;
  /** Total staff count */
  teamSize: number;
  /** Capability summary per department */
  departmentSummary: DepartmentSummaryEntry[];
  /** Promotion readiness overview */
  promotionReadiness: PromotionReadinessSummary;
  /** Training readiness overview */
  trainingReadiness: TrainingReadinessSummary;
  /** Verified staff summary */
  verifiedStaff: VerifiedStaffSummary;
  /** When this was computed */
  computedAt: string;
}

export interface DepartmentSummaryEntry {
  departmentKey: string;
  departmentLabel: string;
  teacherCount: number;
  averageCri: number;
  verifiedCount: number;
  gapScore: number;
}

export interface PromotionReadinessSummary {
  /** Teachers ready for promotion (≥ 80% readiness) */
  readyCount: number;
  /** Teachers near-ready (50–79%) */
  nearReadyCount: number;
  /** Teachers needing development (< 50%) */
  needsDevelopmentCount: number;
  /** Average readiness across all staff */
  averageReadinessPercent: number;
}

export interface TrainingReadinessSummary {
  /** Teachers with active training */
  activeTrainingCount: number;
  /** Teachers with completed training (any) */
  completedTrainingCount: number;
  /** Teachers with no training history */
  noTrainingCount: number;
  /** Average CRI of team */
  teamAverageCri: number;
}

export interface VerifiedStaffSummary {
  /** Staff with full verification */
  fullyVerified: number;
  /** Staff with partial verification */
  partiallyVerified: number;
  /** Staff with no verification */
  unverified: number;
  /** Percentage verified (full + partial) */
  verifiedSharePercent: number;
}
