/**
 * Gap Pipeline Integration Tests — Phase 6D
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
  experienceVerified: true, credentialVerified: true, missingVerificationTypes: [],
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
  missingGradeBandIds: [], insufficientExperience: false, locationMismatchCount: 0,
};

function makeInput(o: Partial<GapEngineInput> = {}): GapEngineInput {
  return {
    teacherId: "t-pipe", profileGapSignals: o.profileGapSignals ?? { ...completeProfile },
    qualificationGapSignals: o.qualificationGapSignals ?? { ...completeQual },
    trustGapSignals: o.trustGapSignals ?? { ...completeTrust },
    trainingGapSignals: o.trainingGapSignals ?? { ...completeTraining },
    hiringGapSignals: o.hiringGapSignals ?? { ...noHiring },
    matchGapSignals: o.matchGapSignals ?? { ...noMatch },
    metadata: { triggeredByEvent: "pipeline.test", triggeredAt: "2026-03-11T00:00:00Z" },
  };
}

function toRow(result: GapEngineResult, jobId?: string | null) {
  return {
    teacher_id: result.teacherId, job_id: jobId ?? null,
    total_gaps: result.totalGaps,
    gaps: JSON.parse(JSON.stringify(result.gapItems.map(g => ({
      gapId: g.gapId, gapType: g.gapType, label: g.label,
      severity: g.severity, confidence: g.confidence,
      evidenceSources: g.evidenceSources, relatedSignals: g.relatedSignals,
      taxonomyTermId: g.taxonomyTermId ?? null,
    })))),
    staleness: "fresh", engine_version: "gap-v1", computed_at: result.computedAt,
  };
}

describe("Gap Pipeline — Full refresh", () => {
  it("complete teacher produces zero gaps", () => {
    const r = runGapEngine(makeInput());
    expect(r.teacherId).toBe("t-pipe");
    expect(r.totalGaps).toBe(0);
    expect(r.freshness.isStale).toBe(false);
  });

  it("incomplete teacher maps to snapshot row", () => {
    const r = runGapEngine(makeInput({
      profileGapSignals: { ...completeProfile, missingBio: true, missingCurriculumMappings: true },
      trustGapSignals: { ...completeTrust, identityVerified: false, missingVerificationTypes: ["identity"] },
    }));
    expect(r.totalGaps).toBeGreaterThan(0);
    const row = toRow(r, null);
    expect(row.total_gaps).toBe(r.totalGaps);
    expect(row.staleness).toBe("fresh");
    expect(row.job_id).toBeNull();
  });
});

describe("Gap Pipeline — Writer preserves values", () => {
  it("severity/confidence unchanged", () => {
    const r = runGapEngine(makeInput({
      qualificationGapSignals: { ...completeQual, certificationIds: [], licenseIds: [], missingRequiredCertificationIds: ["cx"] },
      matchGapSignals: { ...noMatch, missingCertificationIds: ["cx"] },
    }));
    const row = toRow(r);
    const rg = (row.gaps as any[]).find(g => g.taxonomyTermId === "cx");
    const eg = r.gapItems.find(g => g.taxonomyTermId === "cx");
    expect(rg.severity).toBe(eg!.severity);
    expect(rg.confidence).toBe(eg!.confidence);
  });
});

describe("Gap Pipeline — Edge cases", () => {
  it("empty teacherId still runs", () => {
    const inp = makeInput(); inp.teacherId = "";
    expect(runGapEngine(inp).teacherId).toBe("");
  });
  it("jobId flows to row", () => {
    expect(toRow(runGapEngine(makeInput()), "j1").job_id).toBe("j1");
  });
  it("null jobId in row", () => {
    expect(toRow(runGapEngine(makeInput())).job_id).toBeNull();
  });
});

describe("Gap Pipeline — Handler shape", () => {
  it("exports correct intent", async () => {
    const m = await import("@/intelligence/handlers/gaps/gap-refresh.handler");
    expect(m.gapRefreshHandler.intentName).toBe("intent.skill_gap_refresh_requested");
    expect(typeof m.gapRefreshHandler.handle).toBe("function");
  });
});
