/**
 * Mobility Explainability — Unit Tests
 */

import { describe, it, expect } from "vitest";
import { buildTargetExplainability, buildMobilityExplainabilityBundle } from "@/mobility/explainability/mobility-explainability.builder";
import type { MobilityEvaluationResult } from "@/mobility/types/mobility.types";

function makeResult(overrides: Partial<MobilityEvaluationResult> = {}): MobilityEvaluationResult {
  return {
    targetId: "t1",
    targetName: "Head of Department",
    trackName: "Leadership",
    readinessPercent: 60,
    satisfiedCount: 3,
    totalCount: 5,
    gapCount: 2,
    satisfiedRequirements: [
      { requirement: { id: "r1", targetId: "t1", requirementType: "credential", requirementKey: "cred1", requirementLabel: "Teaching Cert", isMandatory: true, termIds: [], metadata: {} }, satisfied: true, explanation: "Has required credential(s)" },
      { requirement: { id: "r2", targetId: "t1", requirementType: "experience_years", requirementKey: "exp5", requirementLabel: "5 years", isMandatory: false, termIds: [], metadata: {} }, satisfied: true, explanation: "7 years experience ≥ 5" },
      { requirement: { id: "r3", targetId: "t1", requirementType: "training_completion", requirementKey: "train3", requirementLabel: "3 trainings", isMandatory: false, termIds: [], metadata: {} }, satisfied: true, explanation: "Completed 5 training items" },
    ],
    unmetRequirements: [
      { requirement: { id: "r4", targetId: "t1", requirementType: "reputation_threshold", requirementKey: "rep50", requirementLabel: "Reputation 50+", isMandatory: true, termIds: [], metadata: {}, minReputationScore: 50 }, satisfied: false, explanation: "Reputation score 35 < required 50" },
      { requirement: { id: "r5", targetId: "t1", requirementType: "pathway_completion", requirementKey: "path1", requirementLabel: "Leadership Pathway", isMandatory: false, termIds: [], metadata: {} }, satisfied: false, explanation: "Missing pathway: Leadership Pathway" },
    ],
    blockingRequirements: [
      { requirement: { id: "r4", targetId: "t1", requirementType: "reputation_threshold", requirementKey: "rep50", requirementLabel: "Reputation 50+", isMandatory: true, termIds: [], metadata: {}, minReputationScore: 50 }, satisfied: false, explanation: "Reputation score 35 < required 50" },
    ],
    ...overrides,
  };
}

describe("buildTargetExplainability", () => {
  it("produces structured explainability for a typical result", () => {
    const result = makeResult();
    const exp = buildTargetExplainability(result);

    expect(exp.targetId).toBe("t1");
    expect(exp.readinessClassification).toBe("emerging");
    expect(exp.keyDrivers).toHaveLength(3);
    expect(exp.blockers).toHaveLength(1);
    expect(exp.blockers[0]).toContain("Reputation");
    expect(exp.signals).toHaveLength(5);
    expect(exp.summary).toContain("60%");
  });

  it("classifies ready correctly", () => {
    const exp = buildTargetExplainability(makeResult({ readinessPercent: 80, blockingRequirements: [] }));
    expect(exp.readinessClassification).toBe("ready");
    expect(exp.summary).toContain("Ready for");
  });

  it("classifies early correctly", () => {
    const exp = buildTargetExplainability(makeResult({ readinessPercent: 10 }));
    expect(exp.readinessClassification).toBe("early");
  });

  it("handles zero requirements", () => {
    const exp = buildTargetExplainability(makeResult({
      totalCount: 0,
      satisfiedCount: 0,
      readinessPercent: 0,
      satisfiedRequirements: [],
      unmetRequirements: [],
      blockingRequirements: [],
    }));
    expect(exp.summary).toContain("No requirements defined");
    expect(exp.keyDrivers).toHaveLength(0);
    expect(exp.signals).toHaveLength(0);
  });
});

describe("buildMobilityExplainabilityBundle", () => {
  it("produces overall summary for multiple targets", () => {
    const results = [
      makeResult({ targetId: "t1", readinessPercent: 80, blockingRequirements: [] }),
      makeResult({ targetId: "t2", targetName: "Curriculum Lead", readinessPercent: 40 }),
    ];
    const bundle = buildMobilityExplainabilityBundle("teacher-1", results);

    expect(bundle.teacherId).toBe("teacher-1");
    expect(bundle.targets).toHaveLength(2);
    expect(bundle.overallSummary).toContain("1 of 2");
  });

  it("handles empty results", () => {
    const bundle = buildMobilityExplainabilityBundle("teacher-1", []);
    expect(bundle.overallSummary).toBe("No mobility targets evaluated.");
    expect(bundle.targets).toHaveLength(0);
  });

  it("handles all-ready", () => {
    const results = [
      makeResult({ readinessPercent: 90, blockingRequirements: [] }),
    ];
    const bundle = buildMobilityExplainabilityBundle("teacher-1", results);
    expect(bundle.overallSummary).toContain("Fully ready");
  });
});
