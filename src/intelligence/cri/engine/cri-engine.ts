/**
 * CRI Engine v1 — Core Computation
 *
 * Pure function: CriEngineInput → CriEngineResult.
 *
 * Constraints:
 *  - No database access
 *  - No side-effects
 *  - Deterministic for identical inputs
 *
 * Phase 4C — Live scoring implementation
 */

import type {
  CriEngineInput,
  CriEngineResult,
  CriComponentScore,
  CriReasonCode,
  CriProfileSignals,
  CriTrainingSignals,
  CriTrustSignals,
  CriHiringSignals,
} from "./cri-engine.types";
import {
  CRI_COMPONENT_WEIGHTS,
  PROFILE_SIGNAL_POINTS,
  TRAINING_COURSE_TIERS,
  TRAINING_RECENCY_BONUS,
  VERIFIED_COMPLETION_MULTIPLIER,
  CRI_BOOST_CAP,
  APPROVED_EVIDENCE_BONUS_PER,
  APPROVED_EVIDENCE_CAP,
  MENTOR_APPROVAL_BONUS_PER,
  MENTOR_APPROVAL_CAP,
  ACTIVE_PATHWAY_PROGRESS_CAP,
  EARNED_CREDENTIAL_BONUS_PER,
  EARNED_CREDENTIAL_CAP,
  VERIFICATION_SIGNAL_POINTS,
  HIRING_NO_HISTORY_BASELINE,
  HIRING_SHORTLIST_BONUS_PER,
  HIRING_SHORTLIST_CAP,
  HIRING_INTERVIEW_BONUS_PER,
  HIRING_INTERVIEW_CAP,
  HIRING_APPLICATION_BONUS_PER,
  HIRING_APPLICATION_CAP,
  HIRING_REJECTION_PENALTY_PER,
  HIRING_REJECTION_PENALTY_CAP,
  resolveBand,
  clampScore,
} from "./cri-engine.rules";

// ── Component Scorers (each returns 0–100) ─────────────────────

function scoreProfile(s: CriProfileSignals): { score: number; reasons: CriReasonCode[] } {
  const reasons: CriReasonCode[] = [];
  let raw = 0;

  // Boolean signal points
  const boolSignals: (keyof typeof PROFILE_SIGNAL_POINTS)[] = [
    "hasHeadline", "hasBio", "hasSubjectMappings", "hasCurriculumMappings",
    "hasExperienceEntries", "hasEducationEntries", "hasLanguageEntries",
  ];

  for (const key of boolSignals) {
    if (s[key as keyof CriProfileSignals]) {
      raw += PROFILE_SIGNAL_POINTS[key];
    }
  }

  // Completeness bonus (up to 10 points scaled from 0-100 completeness score)
  const completenessBonus = Math.round((s.profileCompletenessScore / 100) * 10);
  raw += completenessBonus;

  const score = clampScore(raw, 100);

  // Reason codes
  if (score >= 80) {
    reasons.push({ code: "strong_profile_foundation", polarity: "positive", message: "Profile is well-completed across key fields" });
  } else if (score < 40) {
    reasons.push({ code: "profile_incomplete", polarity: "negative", message: "Several profile fields are missing" });
  }
  if (!s.hasBio) reasons.push({ code: "missing_bio", polarity: "negative", message: "Professional bio is missing" });
  if (!s.hasSubjectMappings) reasons.push({ code: "missing_subjects", polarity: "negative", message: "No subject mappings added" });
  if (!s.hasEducationEntries) reasons.push({ code: "missing_education", polarity: "negative", message: "No education entries found" });
  if (!s.hasExperienceEntries) reasons.push({ code: "missing_experience", polarity: "negative", message: "No experience entries found" });

  return { score, reasons };
}

function scoreTraining(s: CriTrainingSignals): { score: number; reasons: CriReasonCode[] } {
  const reasons: CriReasonCode[] = [];

  // Base score from course count tiers
  let base = 0;
  for (const tier of TRAINING_COURSE_TIERS) {
    if (s.completedCourseCount >= tier.minCourses) {
      base = tier.score;
      break;
    }
  }

  // Recency bonus
  let recencyBonus = 0;
  if (s.recentCompletionCount && s.recentCompletionCount > 0) {
    recencyBonus = Math.min(s.recentCompletionCount * 5, TRAINING_RECENCY_BONUS);
    reasons.push({ code: "recent_training_activity", polarity: "positive", message: "Recent training completions detected" });
  }

  // Pathway bonus (modest)
  let pathwayBonus = 0;
  if (s.completedPathwayCount && s.completedPathwayCount > 0) {
    pathwayBonus = Math.min(s.completedPathwayCount * 10, 15);
    reasons.push({ code: "pathway_completion", polarity: "positive", message: "Completed learning pathway(s)" });
  }

  // ── v2: Verified completion bonus ──
  let verifiedBonus = 0;
  if (s.verifiedCompletionCount && s.verifiedCompletionCount > 0) {
    // Verified completions are worth VERIFIED_COMPLETION_MULTIPLIER more than regular
    verifiedBonus = Math.round(s.verifiedCompletionCount * 5 * VERIFIED_COMPLETION_MULTIPLIER);
    verifiedBonus = Math.min(verifiedBonus, 15);
    reasons.push({ code: "verified_completion_present", polarity: "positive", message: "Mentor-verified learning completions strengthen readiness" });
  }

  // ── v2: CRI boost from catalog items ──
  let criBoost = 0;
  if (s.criBoostTotal && s.criBoostTotal > 0) {
    criBoost = Math.min(s.criBoostTotal, CRI_BOOST_CAP);
    reasons.push({ code: "cri_boost_from_training", polarity: "positive", message: "Training items with CRI boost value completed" });
  }

  // ── v2: Approved evidence bonus ──
  let evidenceBonus = 0;
  if (s.approvedEvidenceCount && s.approvedEvidenceCount > 0) {
    evidenceBonus = Math.min(s.approvedEvidenceCount * APPROVED_EVIDENCE_BONUS_PER, APPROVED_EVIDENCE_CAP);
    reasons.push({ code: "approved_evidence_artifacts", polarity: "positive", message: "Professional practice evidence approved" });
  }

  // ── v2: Mentor validation bonus ──
  let mentorBonus = 0;
  if (s.mentorApprovedCount && s.mentorApprovedCount > 0) {
    mentorBonus = Math.min(s.mentorApprovedCount * MENTOR_APPROVAL_BONUS_PER, MENTOR_APPROVAL_CAP);
    reasons.push({ code: "mentor_validated_practice", polarity: "positive", message: "Mentor-validated professional practice detected" });
  }

  // ── v2: Active pathway progress ──
  let pathwayProgressBonus = 0;
  if (s.activePathwayProgressPercent && s.activePathwayProgressPercent > 0) {
    pathwayProgressBonus = Math.round((s.activePathwayProgressPercent / 100) * ACTIVE_PATHWAY_PROGRESS_CAP);
    reasons.push({ code: "active_pathway_progress", polarity: "positive", message: "Active learning pathway in progress" });
  }

  // ── v2: Earned credential bonus ──
  let credentialBonus = 0;
  if (s.earnedCredentialCount && s.earnedCredentialCount > 0) {
    credentialBonus = Math.min(s.earnedCredentialCount * EARNED_CREDENTIAL_BONUS_PER, EARNED_CREDENTIAL_CAP);
    reasons.push({ code: "earned_credentials_present", polarity: "positive", message: "Professional credentials earned through training" });
  }

  const score = clampScore(
    base + recencyBonus + pathwayBonus + verifiedBonus + criBoost +
    evidenceBonus + mentorBonus + pathwayProgressBonus + credentialBonus,
    100,
  );

  if (score >= 70) {
    reasons.push({ code: "strong_training_signal", polarity: "positive", message: "Strong professional development record" });
  } else if (s.completedCourseCount === 0) {
    reasons.push({ code: "no_training_completed", polarity: "negative", message: "No training courses completed" });
  }

  return { score, reasons };
}

function scoreVerification(s: CriTrustSignals): { score: number; reasons: CriReasonCode[] } {
  const reasons: CriReasonCode[] = [];
  let raw = 0;

  const signals: { key: keyof CriTrustSignals; pointsKey: string; reasonCode: string; reasonMsg: string }[] = [
    { key: "identityVerified", pointsKey: "identityVerified", reasonCode: "verified_identity_present", reasonMsg: "Identity has been verified" },
    { key: "educationVerified", pointsKey: "educationVerified", reasonCode: "verified_education_present", reasonMsg: "Education credentials verified" },
    { key: "experienceVerified", pointsKey: "experienceVerified", reasonCode: "verified_experience_present", reasonMsg: "Work experience verified" },
    { key: "credentialVerified", pointsKey: "credentialVerified", reasonCode: "verified_credential_present", reasonMsg: "Professional credential verified" },
  ];

  for (const sig of signals) {
    if (s[sig.key] === true) {
      raw += VERIFICATION_SIGNAL_POINTS[sig.pointsKey];
      reasons.push({ code: sig.reasonCode, polarity: "positive", message: sig.reasonMsg });
    }
  }

  const score = clampScore(raw, 100);

  if (score === 0) {
    reasons.push({ code: "no_verified_credentials", polarity: "negative", message: "No credentials have been verified yet" });
  }

  return { score, reasons };
}

function scoreHiring(s: CriHiringSignals): { score: number; reasons: CriReasonCode[] } {
  const reasons: CriReasonCode[] = [];
  const apps = s.applicationsCount ?? 0;
  const shortlisted = s.shortlistedCount ?? 0;
  const interviews = s.interviewsCount ?? 0;
  const rejections = s.rejectionsCount ?? 0;

  // No hiring history → soft baseline (don't punish new teachers)
  if (apps === 0) {
    reasons.push({ code: "no_hiring_signal_yet", polarity: "positive", message: "No hiring history — baseline score applied" });
    return { score: HIRING_NO_HISTORY_BASELINE, reasons };
  }

  let raw = 0;

  // Application activity
  raw += Math.min(apps * HIRING_APPLICATION_BONUS_PER, HIRING_APPLICATION_CAP);

  // Shortlist bonus
  const shortlistBonus = Math.min(shortlisted * HIRING_SHORTLIST_BONUS_PER, HIRING_SHORTLIST_CAP);
  raw += shortlistBonus;
  if (shortlisted > 0) {
    reasons.push({ code: "shortlisted_by_schools", polarity: "positive", message: "Shortlisted by one or more schools" });
  }

  // Interview bonus
  const interviewBonus = Math.min(interviews * HIRING_INTERVIEW_BONUS_PER, HIRING_INTERVIEW_CAP);
  raw += interviewBonus;
  if (interviews > 0) {
    reasons.push({ code: "interview_invitations", polarity: "positive", message: "Received interview invitation(s)" });
  }

  // Soft rejection penalty
  const rejectionPenalty = Math.min(rejections * HIRING_REJECTION_PENALTY_PER, HIRING_REJECTION_PENALTY_CAP);
  raw -= rejectionPenalty;
  if (rejections > 0) {
    reasons.push({ code: "some_rejections", polarity: "negative", message: "Some applications were rejected" });
  }

  // Ensure minimum of 10 for teachers who are actively applying
  const score = clampScore(Math.max(raw, 10), 100);

  if (score >= 50) {
    reasons.push({ code: "positive_hiring_signals", polarity: "positive", message: "Hiring activity indicates employability" });
  }

  return { score, reasons };
}

// ── Breakdown Summary Generator ────────────────────────────────

function buildBreakdownSummary(
  components: CriComponentScore[],
  criScore: number,
  band: string,
): string {
  const parts = components.map(
    (c) => `${c.label}: ${c.score}/${c.maxScore}`,
  );
  return `CRI ${criScore}/100 (${band}) — ${parts.join(", ")}`;
}

// ── Main Engine ────────────────────────────────────────────────

/**
 * Run the CRI engine for one teacher.
 *
 * @param input - Normalized signals for the teacher
 * @returns Full CRI result with score, band, breakdown, and reason codes
 */
export function runCriEngine(input: CriEngineInput): CriEngineResult {
  // Score each component (0–100 raw)
  const profileResult = scoreProfile(input.profileSignals);
  const trainingResult = scoreTraining(input.trainingSignals);
  const verificationResult = scoreVerification(input.trustSignals);
  const hiringResult = scoreHiring(input.hiringSignals);

  // Weighted component scores (scaled to weight)
  const profileWeighted = Math.round((profileResult.score / 100) * CRI_COMPONENT_WEIGHTS.profile);
  const trainingWeighted = Math.round((trainingResult.score / 100) * CRI_COMPONENT_WEIGHTS.training);
  const verificationWeighted = Math.round((verificationResult.score / 100) * CRI_COMPONENT_WEIGHTS.verification);
  const hiringWeighted = Math.round((hiringResult.score / 100) * CRI_COMPONENT_WEIGHTS.hiring_signals);

  const componentScores: CriComponentScore[] = [
    {
      component: "profile",
      label: "Profile Completeness",
      score: profileWeighted,
      maxScore: CRI_COMPONENT_WEIGHTS.profile,
      met: profileResult.score >= 50,
    },
    {
      component: "training",
      label: "Training & Development",
      score: trainingWeighted,
      maxScore: CRI_COMPONENT_WEIGHTS.training,
      met: trainingResult.score >= 50,
    },
    {
      component: "verification",
      label: "Credential Verification",
      score: verificationWeighted,
      maxScore: CRI_COMPONENT_WEIGHTS.verification,
      met: verificationResult.score >= 50,
    },
    {
      component: "hiring_signals",
      label: "Hiring Signals",
      score: hiringWeighted,
      maxScore: CRI_COMPONENT_WEIGHTS.hiring_signals,
      met: hiringResult.score >= 50,
    },
  ];

  const criScore = clampScore(
    profileWeighted + trainingWeighted + verificationWeighted + hiringWeighted,
    100,
  );
  const criBand = resolveBand(criScore);

  // Aggregate reason codes
  const reasonCodes: CriReasonCode[] = [
    ...profileResult.reasons,
    ...trainingResult.reasons,
    ...verificationResult.reasons,
    ...hiringResult.reasons,
  ];

  return {
    teacherId: input.teacherId,
    criScore,
    criBand,
    breakdownSummary: buildBreakdownSummary(componentScores, criScore, criBand),
    componentScores,
    reasonCodes,
    computedAt: new Date().toISOString(),
    triggeredByEvent: input.metadata.triggeredByEvent,
    freshness: {
      isStale: false,
      freshnessStatus: "fresh",
    },
  };
}
