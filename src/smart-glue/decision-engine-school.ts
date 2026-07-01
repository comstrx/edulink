/**
 * Smart Glue Decision Engine — School/Admin Decisions (Sprint 13 PART 3)
 *
 * Lightweight decision functions for school/admin-facing events.
 * Same principles as teacher decisions:
 *   - No DB schema changes
 *   - No engine modifications
 *   - Predictable, deterministic behavior
 *   - Each event has its own decision logic
 *
 * Sprint 4.4: School Hiring Health diagnostic rule.
 */

import type { JobPublishDecisionContext } from "./intelligence/job-publish-context.reader";
import type { VerificationDecisionContext } from "./intelligence/verification-context.reader";
import type { SchoolAggregatedContext } from "./intelligence/school-context.reader";
import type { DecisionPriority } from "./decision-engine";
import type { ExplainabilityMeta } from "@/intelligence/observability/explainability.types";
import type { ExplainabilityView } from "@/intelligence/explainability/explainability.presentation";
import { buildExplainabilityTrace } from "@/intelligence/observability/explainability.builder";

// ══════════════════════════════════════════════════════════════
// 1. JOB PUBLISHED DECISION
// ══════════════════════════════════════════════════════════════

export interface JobPublishDecision {
  /** Whether match refresh should be full (all candidates) or limited (high-readiness only) */
  matchRefreshScope: "full" | "limited";
  /** Whether to prioritize verified/high-readiness candidates in match */
  prioritizeVerified: boolean;
  /** Whether to suppress low-value refreshes (e.g., gaps for school) */
  suppressLowValueRefreshes: boolean;
  /** Whether to trigger workforce refresh for the school */
  shouldRefreshWorkforce: boolean;
  /** Priority level */
  priority: DecisionPriority;
  /** Max intents */
  maxIntents: number;
  /** Reasoning trace */
  reasoning: string[];
}

const MAX_INTENTS_PER_JOB_PUBLISH = 4;

export function resolveJobPublishDecision(
  context: JobPublishDecisionContext | undefined,
): JobPublishDecision {
  const reasoning: string[] = [];

  // No context → conservative full refresh
  if (!context) {
    reasoning.push("no_context: default full refresh");
    return {
      matchRefreshScope: "full",
      prioritizeVerified: false,
      suppressLowValueRefreshes: false,
      shouldRefreshWorkforce: true,
      priority: "normal",
      maxIntents: MAX_INTENTS_PER_JOB_PUBLISH,
      reasoning,
    };
  }

  // If job already has match snapshots → limited refresh (avoid redundant work)
  const matchRefreshScope = context.hasRecentMatches ? "limited" : "full";
  if (context.hasRecentMatches) {
    reasoning.push("match_scope: limited (existing snapshots found)");
  } else {
    reasoning.push("match_scope: full (no existing snapshots)");
  }

  // Prioritize verified candidates if many exist relative to total
  const prioritizeVerified = context.verifiedCandidateCount >= 5
    && context.highReadinessCandidateCount >= 3;
  if (prioritizeVerified) {
    reasoning.push(`prioritize_verified: yes (verified=${context.verifiedCandidateCount}, high_readiness=${context.highReadinessCandidateCount})`);
  } else {
    reasoning.push("prioritize_verified: no (insufficient verified/ready pool)");
  }

  // Suppress low-value refreshes if job lacks subject terms (untargeted job)
  const suppressLowValueRefreshes = !context.hasSubjectTerms;
  if (suppressLowValueRefreshes) {
    reasoning.push("suppress_low_value: yes (no subject terms → untargeted)");
  }

  // Priority: high if school has no applicants yet (new job needs visibility)
  const priority: DecisionPriority = context.existingApplicantCount === 0 ? "high" : "normal";
  reasoning.push(`priority: ${priority} (applicants=${context.existingApplicantCount})`);

  return {
    matchRefreshScope,
    prioritizeVerified,
    suppressLowValueRefreshes,
    shouldRefreshWorkforce: true,
    priority,
    maxIntents: MAX_INTENTS_PER_JOB_PUBLISH,
    reasoning,
  };
}

// ══════════════════════════════════════════════════════════════
// 2. VERIFICATION COMPLETED DECISION
// ══════════════════════════════════════════════════════════════

export interface VerificationDecision {
  /** Whether to refresh trust state */
  shouldRefreshTrust: boolean;
  /** Whether to boost visibility (talent profile refresh) */
  shouldBoostVisibility: boolean;
  /** Whether to suppress beginner guidance (recs) */
  suppressBeginnerGuidance: boolean;
  /** Whether CRI refresh is warranted */
  shouldRefreshCri: boolean;
  /** Whether gap refresh adds value */
  shouldRefreshGaps: boolean;
  /** Priority level */
  priority: DecisionPriority;
  /** Max intents */
  maxIntents: number;
  /** Reasoning trace */
  reasoning: string[];
}

const MAX_INTENTS_PER_VERIFICATION = 5;

export function resolveVerificationDecision(
  context: VerificationDecisionContext | undefined,
): VerificationDecision {
  const reasoning: string[] = [];

  // No context → full safe response
  if (!context) {
    reasoning.push("no_context: default full response");
    return {
      shouldRefreshTrust: true,
      shouldBoostVisibility: true,
      suppressBeginnerGuidance: false,
      shouldRefreshCri: true,
      shouldRefreshGaps: true,
      priority: "normal",
      maxIntents: MAX_INTENTS_PER_VERIFICATION,
      reasoning,
    };
  }

  // Always refresh trust on verification
  const shouldRefreshTrust = true;
  reasoning.push("trust: always refresh on verification");

  // Boost visibility if teacher is now verified AND has decent CRI
  // Canonical readiness levels: early, developing, ready, highly_ready
  const isNowHighReadiness = (context.criScore != null && context.criScore >= 55)
    || context.readinessLevel === "ready" || context.readinessLevel === "highly_ready";
  const shouldBoostVisibility = isNowHighReadiness || context.verifiedCount >= 2;
  if (shouldBoostVisibility) {
    reasoning.push(`visibility: boost (cri=${context.criScore}, readiness=${context.readinessLevel}, verified=${context.verifiedCount})`);
  } else {
    reasoning.push("visibility: skip (not yet high-readiness)");
  }

  // Suppress beginner guidance if teacher is verified + high readiness + no major gaps
  const suppressBeginnerGuidance = isNowHighReadiness
    && context.verifiedCount >= 2
    && context.unresolvedGapCount <= 1;
  if (suppressBeginnerGuidance) {
    reasoning.push("beginner_guidance: suppress (high readiness + verified + few gaps)");
  }

  // CRI: refresh if teacher has meaningful state to recalculate
  const shouldRefreshCri = context.criScore != null || context.hasUnresolvedGaps;
  if (shouldRefreshCri) {
    reasoning.push(`cri: refresh (score=${context.criScore}, gaps=${context.unresolvedGapCount})`);
  } else {
    reasoning.push("cri: skip (no existing state)");
  }

  // Gaps: only refresh if teacher has unresolved gaps (verification might close one)
  const shouldRefreshGaps = context.hasUnresolvedGaps;
  if (shouldRefreshGaps) {
    reasoning.push(`gaps: refresh (${context.unresolvedGapCount} unresolved)`);
  } else {
    reasoning.push("gaps: skip (no unresolved gaps)");
  }

  // Priority: high if this verification transitions teacher to "full" verified
  const willBeFullyVerified = context.currentVerifiedStatus !== "full"
    && context.totalCredentials > 0
    && (context.verifiedCount + 1) >= context.totalCredentials;
  const priority: DecisionPriority = willBeFullyVerified ? "high" : "normal";
  reasoning.push(`priority: ${priority} (will_be_fully_verified=${willBeFullyVerified})`);

  return {
    shouldRefreshTrust,
    shouldBoostVisibility,
    suppressBeginnerGuidance,
    shouldRefreshCri,
    shouldRefreshGaps,
    priority,
    maxIntents: MAX_INTENTS_PER_VERIFICATION,
    reasoning,
  };
}

// ══════════════════════════════════════════════════════════════
// 3. TEAM CAPABILITY REFRESH DECISION
// ══════════════════════════════════════════════════════════════

export interface TeamCapabilityContext {
  schoolId: string;
  /** Number of teachers in school */
  teacherCount: number;
  /** Whether department snapshots exist */
  hasDepartmentSnapshots: boolean;
  /** Last refresh timestamp (ISO) */
  lastRefreshAt: string | null;
  /** Whether there's been a meaningful teacher change */
  hasMaterialChange: boolean;
}

export interface TeamCapabilityDecision {
  /** Whether to refresh team summaries */
  shouldRefreshTeam: boolean;
  /** Whether to refresh department snapshots */
  shouldRefreshDepartments: boolean;
  /** Priority level */
  priority: DecisionPriority;
  /** Reasoning trace */
  reasoning: string[];
}

export function resolveTeamCapabilityDecision(
  context: TeamCapabilityContext | undefined,
): TeamCapabilityDecision {
  const reasoning: string[] = [];

  if (!context) {
    reasoning.push("no_context: default refresh");
    return {
      shouldRefreshTeam: true,
      shouldRefreshDepartments: true,
      priority: "normal",
      reasoning,
    };
  }

  // Skip if no material change
  if (!context.hasMaterialChange) {
    reasoning.push("no_material_change: skip all refreshes");
    return {
      shouldRefreshTeam: false,
      shouldRefreshDepartments: false,
      priority: "low",
      reasoning,
    };
  }

  // Throttle: skip if last refresh was < 5 minutes ago
  const REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
  const lastRefresh = context.lastRefreshAt ? new Date(context.lastRefreshAt).getTime() : 0;
  const timeSinceRefresh = Date.now() - lastRefresh;

  if (timeSinceRefresh < REFRESH_COOLDOWN_MS) {
    reasoning.push(`throttled: last refresh ${Math.round(timeSinceRefresh / 1000)}s ago (< 5min cooldown)`);
    return {
      shouldRefreshTeam: false,
      shouldRefreshDepartments: false,
      priority: "low",
      reasoning,
    };
  }

  reasoning.push(`material_change: yes, refreshing (teachers=${context.teacherCount})`);

  // Only refresh departments if snapshots exist (avoid cold-start noise)
  const shouldRefreshDepartments = context.hasDepartmentSnapshots;
  if (!shouldRefreshDepartments) {
    reasoning.push("departments: skip (no existing snapshots)");
  } else {
    reasoning.push("departments: refresh");
  }

  return {
    shouldRefreshTeam: true,
    shouldRefreshDepartments,
    priority: "normal",
    reasoning,
  };
}

// ══════════════════════════════════════════════════════════════
// 4. SCHOOL HIRING HEALTH DIAGNOSTIC (Sprint 4.4 Step 2)
// ══════════════════════════════════════════════════════════════

/**
 * Diagnoses whether a school's hiring pipeline has a quality problem
 * (high rejections + low match scores) rather than a volume problem.
 *
 * Single rule: if rejectionRate is high AND averageMatchScore is low,
 * the school should focus on candidate readiness/training before hiring.
 *
 * All inputs numeric. No labels. Deterministic.
 */

export interface SchoolHiringHealthResult {
  applied: boolean;
  diagnosis: "quality_gap" | "none";
  shouldRecommendTrainingFirst: boolean;
  shouldRecommendReadinessFilter: boolean;
  priority: DecisionPriority;
  reasoning: string[];
  explainability?: ExplainabilityMeta;
  /** Presentation-safe view (Sprint 5.4) */
  explainabilityView?: ExplainabilityView;
}

const REJECTION_RATE_THRESHOLD = 0.4;       // 40%+ rejections = high
const REJECTION_RATE_CRITICAL = 0.6;        // 60%+ rejections = critical signal
const LOW_MATCH_SCORE_THRESHOLD = 40;       // match < 40 = weak pool
const VERY_LOW_MATCH_THRESHOLD = 25;        // match < 25 = very weak
const MIN_APPLICANTS_FOR_DIAGNOSIS = 3;     // need enough data
const HIGH_OPEN_JOBS_THRESHOLD = 5;         // 5+ open jobs = urgency multiplier

export function resolveSchoolHiringHealth(
  context: SchoolAggregatedContext | undefined,
  traceId: string,
): SchoolHiringHealthResult {
  const tid = traceId;
  const noOp: SchoolHiringHealthResult = {
    applied: false,
    diagnosis: "none",
    shouldRecommendTrainingFirst: false,
    shouldRecommendReadinessFilter: false,
    priority: "normal",
    reasoning: ["hiring_health: not applicable"],
    explainability: buildExplainabilityTrace({
      traceId: tid,
      stages: [{ stage: "school_hiring_health", reasoning: ["not applicable"] }],
    }),
  };

  if (!context?.available) return noOp;

  const { hiring, workforce } = context;

  // Need enough applicants to diagnose
  if (hiring.totalApplicants < MIN_APPLICANTS_FOR_DIAGNOSIS) {
    const r = [`hiring_health: insufficient data (applicants=${hiring.totalApplicants} < ${MIN_APPLICANTS_FOR_DIAGNOSIS})`];
    return {
      ...noOp,
      reasoning: r,
      explainability: buildExplainabilityTrace({
        traceId: tid,
        stages: [{ stage: "school_hiring_health", reasoning: r }],
      }),
    };
  }

  // Calculate rejection rate
  const rejectionRate = hiring.totalApplicants > 0
    ? hiring.rejectionCount / hiring.totalApplicants
    : 0;

  const hasHighRejection = rejectionRate >= REJECTION_RATE_THRESHOLD;
  const hasLowMatchScore = hiring.averageMatchScore !== null
    && hiring.averageMatchScore < LOW_MATCH_SCORE_THRESHOLD;

  // Rule: high rejection + low match = quality gap
  if (!hasHighRejection || !hasLowMatchScore) {
    const r = [
      `hiring_health: no quality gap (rejectionRate=${Math.round(rejectionRate * 100)}%, matchScore=${hiring.averageMatchScore ?? "N/A"})`,
    ];
    return {
      ...noOp,
      reasoning: r,
      explainability: buildExplainabilityTrace({
        traceId: tid,
        stages: [{ stage: "school_hiring_health", reasoning: r }],
      }),
    };
  }

  const reasoning: string[] = [
    `hiring_health: quality gap detected (rejectionRate=${Math.round(rejectionRate * 100)}% >= ${REJECTION_RATE_THRESHOLD * 100}%, matchScore=${hiring.averageMatchScore} < ${LOW_MATCH_SCORE_THRESHOLD})`,
  ];

  // Recommend training-first if workforce readiness is also low
  const shouldRecommendTrainingFirst = workforce.averageCriScore !== null
    && workforce.averageCriScore < 50;
  if (shouldRecommendTrainingFirst) {
    reasoning.push(`training_first: yes (avgCRI=${workforce.averageCriScore} < 50)`);
  }

  // Recommend readiness filter if there are low-readiness departments
  const shouldRecommendReadinessFilter = workforce.lowReadinessCount >= 1;
  if (shouldRecommendReadinessFilter) {
    reasoning.push(`readiness_filter: yes (lowReadinessDepts=${workforce.lowReadinessCount})`);
  }

  // Priority: escalate based on severity signals (step increase)
  const priority = resolveSchoolHiringPriority(
    rejectionRate, hiring.averageMatchScore, hiring.totalOpenJobs, reasoning,
  );

  return {
    applied: true,
    diagnosis: "quality_gap",
    shouldRecommendTrainingFirst,
    shouldRecommendReadinessFilter,
    priority,
    reasoning,
    explainability: buildExplainabilityTrace({
      traceId: tid,
      stages: [{ stage: "school_hiring_health", reasoning }],
    }),
  };
}

/**
 * Resolves school hiring priority from numeric severity signals.
 * Step-based escalation: normal → high → critical.
 * Deterministic. No labels as logic input.
 */
function resolveSchoolHiringPriority(
  rejectionRate: number,
  averageMatchScore: number | null,
  totalOpenJobs: number,
  reasoning: string[],
): DecisionPriority {
  let severityScore = 0;

  // Rejection severity: +1 for high, +2 for critical
  if (rejectionRate >= REJECTION_RATE_CRITICAL) {
    severityScore += 2;
    reasoning.push(`priority_signal: rejection critical (${Math.round(rejectionRate * 100)}% >= ${REJECTION_RATE_CRITICAL * 100}%)`);
  } else {
    severityScore += 1;
    reasoning.push(`priority_signal: rejection high (${Math.round(rejectionRate * 100)}%)`);
  }

  // Match severity: +1 for low, +2 for very low
  if (averageMatchScore !== null && averageMatchScore < VERY_LOW_MATCH_THRESHOLD) {
    severityScore += 2;
    reasoning.push(`priority_signal: match very low (${averageMatchScore} < ${VERY_LOW_MATCH_THRESHOLD})`);
  } else {
    severityScore += 1;
  }

  // Open jobs urgency: +1 if many open positions
  if (totalOpenJobs >= HIGH_OPEN_JOBS_THRESHOLD) {
    severityScore += 1;
    reasoning.push(`priority_signal: high open jobs (${totalOpenJobs} >= ${HIGH_OPEN_JOBS_THRESHOLD})`);
  }

  // Escalation: 4+ = critical, else high
  if (severityScore >= 4) {
    reasoning.push(`priority: critical (severityScore=${severityScore})`);
    return "critical";
  }

  reasoning.push(`priority: high (severityScore=${severityScore})`);
  return "high";
}

// ══════════════════════════════════════════════════════════════
// 5. SCHOOL INSIGHT STRUCTURING (Sprint 4.4 Step 4)
// ══════════════════════════════════════════════════════════════

/**
 * Transforms a SchoolHiringHealthResult into a structured, actionable insight.
 * Pure formatting — no new logic, no new rules, no recomputation.
 * Deterministic: same result → same insight.
 */

export interface SchoolInsight {
  type: "hiring_quality_gap";
  title: string;
  description: string;
  reasoning: string;
  suggestedAction: string;
  priority: DecisionPriority;
}

export function buildSchoolHiringInsight(
  result: SchoolHiringHealthResult,
  rejectionRate: number,
  averageMatchScore: number | null,
): SchoolInsight | null {
  if (!result.applied) return null;

  // Reasoning: explain WHY based on the numeric signals
  const matchPart = averageMatchScore !== null
    ? `average match score is ${averageMatchScore}%`
    : "match data is unavailable";
  const reasoning = `${Math.round(rejectionRate * 100)}% of applicants are being rejected and ${matchPart}, indicating candidates lack the required qualifications.`;

  // Suggested action: based on which sub-recommendations were triggered
  let suggestedAction: string;
  if (result.shouldRecommendTrainingFirst && result.shouldRecommendReadinessFilter) {
    suggestedAction = "Activate pre-hiring training programs and filter candidates by readiness level before shortlisting.";
  } else if (result.shouldRecommendTrainingFirst) {
    suggestedAction = "Activate pre-hiring training programs to improve candidate readiness before recruitment.";
  } else if (result.shouldRecommendReadinessFilter) {
    suggestedAction = "Apply readiness-level filters when reviewing applicants to prioritize qualified candidates.";
  } else {
    suggestedAction = "Review job requirements alignment with the available candidate pool.";
  }

  // Description: concise summary
  const severityWord = result.priority === "critical" ? "significantly" : "noticeably";
  const description = `Rejection rate is ${severityWord} high while candidate-job match quality is low. The issue is candidate readiness, not applicant volume.`;

  return {
    type: "hiring_quality_gap",
    title: "Low Candidate-Job Fit Quality",
    description,
    reasoning,
    suggestedAction,
    priority: result.priority,
  };
}
