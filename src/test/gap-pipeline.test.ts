/**
 * Gap Pipeline Integration Tests
 *
 * Phase 6D — Validates the full gap refresh pipeline,
 * handler delegation, writer mapping, and failure handling.
 */

import { describe, it, expect } from "vitest";
import { runGapEngine } from "@/intelligence/gaps/engine/gap-engine";
import type {
  GapEngineInput,
  GapEngineResult,
  GapProfileSignals,
  GapQualificationSignals,
  GapTrustSignals,
  GapTrainingSignals,
  GapHiringSignals,
  GapMatchSignals,
} from "@/intelligence/gaps/engine/gap-engine.types";

const completeProfile: GapProfileSignals = {
  missingHeadline: false, missingBio: false, missingAvatar: false,
  missingSubjectMappings: false, missingCurriculumMappings: false,
  missingGradeBandMappings: false, missingExperienceEntries: false,
  missingEducationEntries: false, missingLanguageEntries: false,
  missingContactEmail: false, missingCvUrl: false, missingLocation: false,
  profileCompletenessScore: 100,
};

const completeQual: GapQualificationSignals = {
  certificationIds: ["c1"], licenseIds: ["l1"], degreeIds: ["d1"],
  skillIds: ["s1"], missingRequiredCertificationIds: [], missingRequiredSkillIds: [],
};

const completeTrust: GapTrustSignals = {
  identityVerified: true, educationVerified: true,
  experienceVerified: true, credentialVerified: true,
  missingVerificationTypes: [],
};

const completeTraining: GapTrainingSignals = {
  completedCourseCount: 3, completedPathwayCount: 1,
  relevantTrainingTermIds: ["tr1"], hasNoTraining: false,
};

const noHiring: GapHiringSignals = {
  totalApplications: 0, totalRejections: 0,
  totalShortlists: 0, totalInterviews: 0, rejectionReasonIds: [],
};

const noMatch: GapMatchSignals = {
  recentMatchGapTermIds: [], missingCurriculumIds: [],
  missingCertificationIds: [], missingLanguageIds: [],
  missingGradeBandIds: [], insufficientExperience: false,
  locationMismatchCount: 0,
};

function makeInput(overrides: Partial<GapEngineInput> = {}): GapEngineInput {
  return {
    teacherId: "t-pipeline",
    profileGapSignals: overrides.profileGapSignals ?? { ...completeProfile },
    qualificationGapSignals: overrides.qualificationGapSignals ?? { ...completeQual },
    trustGapSignals: overrides.trustGapSignals ?? { ...completeTrust },
    trainingGapSignals: overrides.trainingGapSignals ?? { ...completeTraining },
    hiringGapSignals: overrides.hiringGapSignals ?? { ...noHiring },
    matchGapSignals: overrides.matchGapSignals ?? { ...noMatch },
    metadata: { triggeredByEvent: "pipeline.test", triggeredAt: "2026-03-11T00:00:00Z" },
  };
}

function mapResultToSnapshotRow(result: GapEngineResult, jobId?: string | null) {
  const gaps = result.gapItems.map((g) => ({
    gapId: g.gapId, gapType: g.gapType, label: g.label,
    severity: g.severity, confidence: g.confidence,
    evidenceSources: g.evidenceSources, relatedSignals: g.relatedSignals,
    taxonomyTermId: g.taxonomyTermId ?? null, relatedJobId: g.relatedJobId ?? null,
  }));
  return {
    teacher_id: result.teacherId, job_id: jobId ?? null,
    total_gaps: result.totalGaps, gaps: JSON.parse(JSON.stringify(gaps)),
    staleness: "fresh", engine_version: "gap-v1", computed_at: result.computedAt,
  };
}

describe("Gap Pipeline — Full refresh simulation", () => {
  it("valid engine result for complete teacher", () => {
    const result = runGapEngine(makeInput());
    expect(result.teacherId).toBe("t-pipeline");
    expect(result.freshness.isStale).toBe(false);
    expect(result.totalGaps).toBe(0);
  });

  it("maps incomplete teacher gaps to snapshot row", () => {
    const result = runGapEngine(makeInput({
      profileGapSignals: { ...completeProfile, missingBio: true, missingCurriculumMappings: true },
      trustGapSignals: { ...completeTrust, identityVerified: false, missingVerificationTypes: ["identity"] },
    }));
    expect(result.totalGaps).toBeGreaterThan(0);
    const row = mapResultToSnapshotRow(result, null);
    expect(row.teacher_id).toBe("t-pipeline");
    expect(row.job_id).toBeNull();
    expect(row.total_gaps).toBe(result.totalGaps);
    expect(row.staleness).toBe("fresh");
    expect(row.gaps.length).toBe(result.totalGaps);
  });
});

describe("Gap Pipeline — Writer preserves engine outputs", () => {
  it("severity, confidence, evidence unchanged in row", () => {
    const result = runGapEngine(makeInput({
      qualificationGapSignals: { ...completeQual, certificationIds: [], licenseIds: [], missingRequiredCertificationIds: ["cert-x"] },
      matchGapSignals: { ...noMatch, missingCertificationIds: ["cert-x"] },
    }));
    const row = mapResultToSnapshotRow(result);
    const rowGap = (row.gaps as any[]).find((g) => g.taxonomyTermId === "cert-x");
    const engineGap = result.gapItems.find(g => g.taxonomyTermId === "cert-x");
    expect(rowGap.severity).toBe(engineGap!.severity);
    expect(rowGap.confidence).toBe(engineGap!.confidence);
    expect(rowGap.evidenceSources).toEqual(engineGap!.evidenceSources);
  });
});

describe("Gap Pipeline — Missing teacherId", () => {
  it("engine runs (validation is service responsibility)", () => {
    const input = makeInput();
    input.teacherId = "";
    const result = runGapEngine(input);
    expect(result.teacherId).toBe("");
    expect(result.freshness.freshnessStatus).toBe("fresh");
  });
});

describe("Gap Pipeline — Handler delegation", () => {
  it("handler exports correct intent name", async () => {
    const mod = await import("@/intelligence/handlers/gaps/gap-refresh.handler");
    expect(mod.gapRefreshHandler.intentName).toBe("intent.skill_gap_refresh_requested");
    expect(typeof mod.gapRefreshHandler.handle).toBe("function");
  });
});

describe("Gap Pipeline — Snapshot jobId handling", () => {
  it("includes jobId when provided", () => {
    expect(mapResultToSnapshotRow(runGapEngine(makeInput()), "job-abc").job_id).toBe("job-abc");
  });
  it("null jobId when omitted", () => {
    expect(mapResultToSnapshotRow(runGapEngine(makeInput())).job_id).toBeNull();
  });
});
