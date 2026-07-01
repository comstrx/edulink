/**
 * Gap Engine v1 — Core Engine
 *
 * Pure computation function: GapEngineInput → GapEngineResult.
 *
 * Constraints:
 *  - No database access
 *  - No side-effects
 *  - Deterministic for identical inputs
 *
 * Phase 6C — Live implementation
 */

import type {
  GapEngineInput,
  GapEngineResult,
  GapItem,
  GapCategory,
  GapEvidenceSource,
} from "./gap-engine.types";
import {
  resolveSeverity,
  resolveConfidence,
  sortGapsByPriority,
  buildGroupedSummary,
  buildReasonCodes,
} from "./gap-engine.rules";

// ── Internal helpers ───────────────────────────────────────────

let gapCounter = 0;

function nextGapId(category: GapCategory): string {
  gapCounter++;
  return `gap_${category}_${gapCounter}`;
}

function makeGap(
  category: GapCategory,
  label: string,
  evidenceSources: GapEvidenceSource[],
  relatedSignals: string[],
  opts?: { taxonomyTermId?: string; evidenceCount?: number },
): GapItem {
  const effectiveCount = opts?.evidenceCount ?? evidenceSources.length;
  return {
    gapId: nextGapId(category),
    gapType: category,
    label,
    severity: resolveSeverity(category, evidenceSources, effectiveCount),
    confidence: resolveConfidence(effectiveCount),
    evidenceSources,
    relatedSignals,
    taxonomyTermId: opts?.taxonomyTermId,
  };
}

// ── Profile Gap Detection ──────────────────────────────────────

function detectProfileGaps(input: GapEngineInput): GapItem[] {
  const gaps: GapItem[] = [];
  const p = input.profileGapSignals;

  if (p.missingBio) {
    gaps.push(makeGap("profile_gap", "Missing bio", ["profile_analysis"], ["profile_incomplete"]));
  }
  if (p.missingAvatar) {
    gaps.push(makeGap("profile_gap", "Missing avatar", ["profile_analysis"], ["profile_incomplete"]));
  }
  if (p.missingSubjectMappings) {
    gaps.push(makeGap("profile_gap", "Missing subject mappings", ["profile_analysis"], ["profile_incomplete", "missing_subject_mapping"]));
  }
  if (p.missingCurriculumMappings) {
    gaps.push(makeGap("profile_gap", "Missing curriculum mappings", ["profile_analysis"], ["profile_incomplete", "missing_curriculum_mapping"]));
  }
  if (p.missingGradeBandMappings) {
    gaps.push(makeGap("profile_gap", "Missing grade band mappings", ["profile_analysis"], ["profile_incomplete", "missing_grade_band"]));
  }
  if (p.missingExperienceEntries) {
    gaps.push(makeGap("profile_gap", "Missing experience entries", ["profile_analysis"], ["profile_incomplete"]));
  }
  if (p.missingEducationEntries) {
    gaps.push(makeGap("profile_gap", "Missing education entries", ["profile_analysis"], ["profile_incomplete"]));
  }
  if (p.missingLanguageEntries) {
    gaps.push(makeGap("profile_gap", "Missing language entries", ["profile_analysis"], ["profile_incomplete", "missing_language_signal"]));
  }
  if (p.missingContactEmail) {
    gaps.push(makeGap("profile_gap", "Missing contact email", ["profile_analysis"], ["profile_incomplete"]));
  }
  if (p.missingCvUrl) {
    gaps.push(makeGap("profile_gap", "Missing CV/resume", ["profile_analysis"], ["profile_incomplete"]));
  }
  if (p.missingLocation) {
    gaps.push(makeGap("profile_gap", "Missing location", ["profile_analysis"], ["profile_incomplete"]));
  }

  return gaps;
}

// ── Certification Gap Detection ────────────────────────────────

function detectCertificationGaps(input: GapEngineInput): GapItem[] {
  const gaps: GapItem[] = [];
  const q = input.qualificationGapSignals;
  const m = input.matchGapSignals;

  // Missing certifications from match analysis
  for (const certId of q.missingRequiredCertificationIds) {
    const sources: GapEvidenceSource[] = ["match_result"];
    const signals = ["missing_required_certification"];

    // Also flagged by match gaps → extra evidence
    if (m.missingCertificationIds.includes(certId)) {
      sources.push("job_requirement");
    }

    gaps.push(makeGap("certification_gap", `Missing certification`, sources, signals, {
      taxonomyTermId: certId,
      evidenceCount: sources.length,
    }));
  }

  // Match-derived certification gaps not already covered
  for (const certId of m.missingCertificationIds) {
    if (!q.missingRequiredCertificationIds.includes(certId)) {
      gaps.push(makeGap("certification_gap", "Missing certification (match-derived)", ["match_result"], ["missing_required_certification"], {
        taxonomyTermId: certId,
      }));
    }
  }

  // No certifications at all is a foundational gap
  if (q.certificationIds.length === 0 && q.licenseIds.length === 0) {
    gaps.push(makeGap("certification_gap", "No certifications or licenses on profile", ["profile_analysis"], ["missing_required_certification"]));
  }

  return gaps;
}

// ── Curriculum Gap Detection ───────────────────────────────────

function detectCurriculumGaps(input: GapEngineInput): GapItem[] {
  const gaps: GapItem[] = [];
  const m = input.matchGapSignals;

  if (input.profileGapSignals.missingCurriculumMappings) {
    // Already captured as profile gap; also create a curriculum-specific one if match confirms
    if (m.missingCurriculumIds.length > 0) {
      for (const cId of m.missingCurriculumIds) {
        gaps.push(makeGap("curriculum_gap", "Missing curriculum (match-derived)", ["match_result", "profile_analysis"], ["missing_curriculum_mapping"], {
          taxonomyTermId: cId,
          evidenceCount: 2,
        }));
      }
    }
  } else {
    // Profile has curriculum but match reveals specific mismatches
    for (const cId of m.missingCurriculumIds) {
      gaps.push(makeGap("curriculum_gap", "Curriculum mismatch in recent matches", ["match_result"], ["missing_curriculum_mapping"], {
        taxonomyTermId: cId,
      }));
    }
  }

  return gaps;
}

// ── Grade Band Gap Detection ───────────────────────────────────

function detectGradeBandGaps(input: GapEngineInput): GapItem[] {
  const gaps: GapItem[] = [];
  const m = input.matchGapSignals;

  for (const gId of m.missingGradeBandIds) {
    gaps.push(makeGap("grade_band_gap", "Grade band mismatch in recent matches", ["match_result"], ["missing_grade_band"], {
      taxonomyTermId: gId,
    }));
  }

  return gaps;
}

// ── Language Gap Detection ─────────────────────────────────────

function detectLanguageGaps(input: GapEngineInput): GapItem[] {
  const gaps: GapItem[] = [];
  const m = input.matchGapSignals;

  for (const lId of m.missingLanguageIds) {
    const sources: GapEvidenceSource[] = ["match_result"];
    if (input.profileGapSignals.missingLanguageEntries) {
      sources.push("profile_analysis");
    }
    gaps.push(makeGap("language_gap", "Missing language proficiency", sources, ["missing_language_signal"], {
      taxonomyTermId: lId,
      evidenceCount: sources.length,
    }));
  }

  return gaps;
}

// ── Trust / Verification Gap Detection ─────────────────────────

function detectTrustGaps(input: GapEngineInput): GapItem[] {
  const gaps: GapItem[] = [];
  const t = input.trustGapSignals;

  for (const vType of t.missingVerificationTypes) {
    gaps.push(makeGap("verification_gap", `Missing ${vType} verification`, ["trust_analysis"], ["verification_missing"]));
  }

  return gaps;
}

// ── Training Gap Detection ─────────────────────────────────────

function detectTrainingGaps(input: GapEngineInput): GapItem[] {
  const gaps: GapItem[] = [];
  const tr = input.trainingGapSignals;

  if (tr.hasNoTraining) {
    gaps.push(makeGap("training_gap", "No professional development on record", ["training_analysis"], ["weak_training_foundation"]));
  }

  return gaps;
}

// ── Experience Gap Detection ───────────────────────────────────

function detectExperienceGaps(input: GapEngineInput): GapItem[] {
  const gaps: GapItem[] = [];
  const m = input.matchGapSignals;
  const h = input.hiringGapSignals;

  if (m.insufficientExperience) {
    const sources: GapEvidenceSource[] = ["match_result"];
    let evidenceCount = 1;

    // Repeated rejections alongside experience gaps strengthen the signal
    if (h.totalRejections >= 3) {
      sources.push("hiring_history");
      evidenceCount = 3;
    } else if (h.totalRejections >= 1) {
      sources.push("hiring_history");
      evidenceCount = 2;
    }

    gaps.push(makeGap("experience_gap", "Insufficient experience for target roles", sources, ["insufficient_experience_signal"], {
      evidenceCount,
    }));
  }

  return gaps;
}

// ── Employability Signal Gap Detection ─────────────────────────

function detectEmployabilityGaps(input: GapEngineInput): GapItem[] {
  const gaps: GapItem[] = [];
  const h = input.hiringGapSignals;

  // POLICY: No hiring history must NOT create a false gap.
  if (h.totalApplications === 0) return gaps;

  // POLICY: One rejection only → weak signal, not overconfident critical gap.
  if (h.totalRejections >= 3) {
    gaps.push(makeGap(
      "employability_signal_gap",
      "Repeated rejection pattern detected",
      ["hiring_history", "match_result"],
      ["repeated_rejection_signal"],
      { evidenceCount: Math.min(h.totalRejections, 5) },
    ));
  } else if (h.totalRejections === 2) {
    gaps.push(makeGap(
      "employability_signal_gap",
      "Multiple rejections detected",
      ["hiring_history"],
      ["repeated_rejection_signal"],
      { evidenceCount: 2 },
    ));
  } else if (h.totalRejections === 1 && h.totalApplications >= 3) {
    // 1 rejection with some application history → very weak signal
    gaps.push(makeGap(
      "employability_signal_gap",
      "Rejection signal noted",
      ["hiring_history"],
      ["repeated_rejection_signal"],
      { evidenceCount: 1 },
    ));
  }

  return gaps;
}

// ── Main Engine ────────────────────────────────────────────────

/**
 * Run the gap engine for one teacher.
 *
 * @param input - Normalized gap signals for a teacher
 * @returns Full gap result with items, priorities, groups, and reasons
 */
export function runGapEngine(input: GapEngineInput): GapEngineResult {
  // Reset counter per invocation for deterministic IDs within a run
  gapCounter = 0;

  const allGaps: GapItem[] = [
    ...detectProfileGaps(input),
    ...detectCertificationGaps(input),
    ...detectCurriculumGaps(input),
    ...detectGradeBandGaps(input),
    ...detectLanguageGaps(input),
    ...detectTrustGaps(input),
    ...detectTrainingGaps(input),
    ...detectExperienceGaps(input),
    ...detectEmployabilityGaps(input),
  ];

  const sorted = sortGapsByPriority(allGaps);
  const priorityGapIds = sorted.slice(0, 10).map((g) => g.gapId);

  return {
    teacherId: input.teacherId,
    gapItems: sorted,
    totalGaps: sorted.length,
    priorityGapIds,
    groupedGapSummary: buildGroupedSummary(sorted),
    reasonCodes: buildReasonCodes(sorted),
    computedAt: new Date().toISOString(),
    triggeredByEvent: input.metadata.triggeredByEvent,
    freshness: {
      isStale: false,
      freshnessStatus: "fresh",
    },
  };
}
