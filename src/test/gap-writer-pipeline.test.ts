/**
 * Gap Pipeline Integration Tests — Phase 6D
 */
import { describe, it, expect } from "vitest";
import { runGapEngine } from "@/intelligence/gaps/engine/gap-engine";
import type { GapEngineInput, GapProfileSignals, GapQualificationSignals, GapTrustSignals, GapTrainingSignals, GapHiringSignals, GapMatchSignals } from "@/intelligence/gaps/engine/gap-engine.types";

const ep: GapProfileSignals = { missingHeadline: false, missingBio: false, missingAvatar: false, missingSubjectMappings: false, missingCurriculumMappings: false, missingGradeBandMappings: false, missingExperienceEntries: false, missingEducationEntries: false, missingLanguageEntries: false, missingContactEmail: false, missingCvUrl: false, missingLocation: false, profileCompletenessScore: 100 };
const eq: GapQualificationSignals = { certificationIds: ["c1"], licenseIds: ["l1"], degreeIds: ["d1"], skillIds: ["s1"], missingRequiredCertificationIds: [], missingRequiredSkillIds: [] };
const et: GapTrustSignals = { identityVerified: true, educationVerified: true, experienceVerified: true, credentialVerified: true, missingVerificationTypes: [] };
const etr: GapTrainingSignals = { completedCourseCount: 2, completedPathwayCount: 1, relevantTrainingTermIds: ["tr1"], hasNoTraining: false };
const eh: GapHiringSignals = { totalApplications: 0, totalRejections: 0, totalShortlists: 0, totalInterviews: 0, rejectionReasonIds: [] };
const em: GapMatchSignals = { recentMatchGapTermIds: [], missingCurriculumIds: [], missingCertificationIds: [], missingLanguageIds: [], missingGradeBandIds: [], insufficientExperience: false, locationMismatchCount: 0 };

function mkInput(o: Partial<GapEngineInput> = {}): GapEngineInput {
  return { teacherId: "t-pipe", profileGapSignals: o.profileGapSignals ?? { ...ep }, qualificationGapSignals: o.qualificationGapSignals ?? { ...eq }, trustGapSignals: o.trustGapSignals ?? { ...et }, trainingGapSignals: o.trainingGapSignals ?? { ...etr }, hiringGapSignals: o.hiringGapSignals ?? { ...eh }, matchGapSignals: o.matchGapSignals ?? { ...em }, metadata: { triggeredByEvent: "pipeline.test", triggeredAt: "2026-03-11T00:00:00Z" } };
}

function toRow(result: ReturnType<typeof runGapEngine>, jobId?: string | null) {
  return { teacher_id: result.teacherId, job_id: jobId ?? null, total_gaps: result.totalGaps, gaps: JSON.parse(JSON.stringify(result.gapItems.map(g => ({ gapId: g.gapId, gapType: g.gapType, label: g.label, severity: g.severity, confidence: g.confidence, evidenceSources: g.evidenceSources, relatedSignals: g.relatedSignals, taxonomyTermId: g.taxonomyTermId ?? null })))), staleness: "fresh", engine_version: "gap-v1", computed_at: result.computedAt };
}

describe("Gap Pipeline — Snapshot row mapping", () => {
  it("maps engine result to DB row shape", () => {
    const r = runGapEngine(mkInput({ profileGapSignals: { ...ep, missingBio: true } }));
    const row = toRow(r, null);
    expect(row.teacher_id).toBe("t-pipe");
    expect(row.job_id).toBeNull();
    expect(row.total_gaps).toBe(r.totalGaps);
    expect(row.staleness).toBe("fresh");
    expect(row.gaps.length).toBe(r.totalGaps);
  });

  it("preserves severity and confidence from engine", () => {
    const r = runGapEngine(mkInput({ qualificationGapSignals: { ...eq, certificationIds: [], licenseIds: [], missingRequiredCertificationIds: ["cx"] }, matchGapSignals: { ...em, missingCertificationIds: ["cx"] } }));
    const row = toRow(r);
    const rg = (row.gaps as any[]).find((g: any) => g.taxonomyTermId === "cx");
    const eg = r.gapItems.find(g => g.taxonomyTermId === "cx");
    expect(rg.severity).toBe(eg!.severity);
    expect(rg.confidence).toBe(eg!.confidence);
    expect(rg.evidenceSources).toEqual(eg!.evidenceSources);
  });

  it("includes jobId when provided", () => { expect(toRow(runGapEngine(mkInput()), "j1").job_id).toBe("j1"); });
  it("null jobId when omitted", () => { expect(toRow(runGapEngine(mkInput())).job_id).toBeNull(); });
});

describe("Gap Pipeline — Handler delegation", () => {
  it("exports correct intent and handle", async () => {
    const m = await import("@/intelligence/handlers/gaps/gap-refresh.handler");
    expect(m.gapRefreshHandler.intentName).toBe("intent.skill_gap_refresh_requested");
    expect(typeof m.gapRefreshHandler.handle).toBe("function");
  });
});

describe("Gap Pipeline — Complete teacher zero gaps", () => {
  it("no gaps for complete teacher", () => {
    const r = runGapEngine(mkInput());
    expect(r.totalGaps).toBe(0);
    expect(r.freshness.isStale).toBe(false);
  });
});

describe("Gap Pipeline — Empty teacherId", () => {
  it("engine still runs", () => {
    const inp = mkInput();
    inp.teacherId = "";
    expect(runGapEngine(inp).teacherId).toBe("");
  });
});
