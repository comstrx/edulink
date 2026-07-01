/**
 * Mobility Feedback — Unit Tests
 */

import { describe, it, expect } from "vitest";
import { analyzeMobilityFeedback } from "@/mobility/engine/mobility-feedback.service";
import type { MobilityEvaluationResult, MobilityRequirementEvaluation } from "@/mobility/types/mobility.types";

function makeReq(overrides: Partial<MobilityRequirementEvaluation["requirement"]> = {}): MobilityRequirementEvaluation["requirement"] {
  return {
    id: "r1",
    targetId: "t1",
    requirementType: "credential",
    requirementKey: "cred1",
    requirementLabel: "Teaching Cert",
    isMandatory: true,
    termIds: [],
    metadata: {},
    ...overrides,
  };
}

function makeEval(req: MobilityRequirementEvaluation["requirement"], satisfied: boolean, explanation: string): MobilityRequirementEvaluation {
  return { requirement: req, satisfied, explanation };
}

function makeResult(overrides: Partial<MobilityEvaluationResult> = {}): MobilityEvaluationResult {
  return {
    targetId: "t1",
    targetName: "Head of Department",
    trackName: "Leadership",
    readinessPercent: 60,
    satisfiedCount: 3,
    totalCount: 5,
    gapCount: 2,
    satisfiedRequirements: [],
    unmetRequirements: [],
    blockingRequirements: [],
    ...overrides,
  };
}

describe("analyzeMobilityFeedback", () => {
  it("produces growth actions for blocking gaps", () => {
    const blocker = makeEval(
      makeReq({ requirementType: "credential", requirementKey: "cred1" }),
      false,
      "Missing credential: Teaching Cert"
    );
    const result = makeResult({
      readinessPercent: 50,
      blockingRequirements: [blocker],
      unmetRequirements: [blocker],
    });

    const actions = analyzeMobilityFeedback("teacher-1", [result]);
    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(actions[0].actionType).toBe("growth_refresh");
    expect(actions[0].recommendedActionType).toBe("pursue_credential");
    expect(actions[0].priorityScore).toBe(85);
  });

  it("produces training suggestions for low readiness", () => {
    const gap = makeEval(
      makeReq({ requirementType: "training_completion", requirementKey: "train3", isMandatory: false }),
      false,
      "Need 2 more training completions"
    );
    const result = makeResult({
      readinessPercent: 20,
      unmetRequirements: [gap],
      blockingRequirements: [],
    });

    const actions = analyzeMobilityFeedback("teacher-1", [result]);
    const trainActions = actions.filter((a) => a.actionType === "training_recommendation");
    expect(trainActions.length).toBeGreaterThanOrEqual(1);
    expect(trainActions[0].priorityScore).toBe(50);
  });

  it("produces targeted actions for near-ready targets", () => {
    const gap = makeEval(
      makeReq({ requirementType: "pathway_completion", requirementKey: "path1", isMandatory: false }),
      false,
      "Missing pathway"
    );
    const result = makeResult({
      readinessPercent: 65,
      unmetRequirements: [gap],
      blockingRequirements: [],
    });

    const actions = analyzeMobilityFeedback("teacher-1", [result]);
    expect(actions.some((a) => a.priorityScore === 70)).toBe(true);
  });

  it("produces advancement signal for ready targets", () => {
    const result = makeResult({
      readinessPercent: 85,
      blockingRequirements: [],
      unmetRequirements: [],
    });

    const actions = analyzeMobilityFeedback("teacher-1", [result]);
    const adv = actions.filter((a) => a.actionType === "advancement_signal");
    expect(adv).toHaveLength(1);
    expect(adv[0].reason).toContain("eligible for transition");
  });

  it("deduplicates actions by key", () => {
    const blocker = makeEval(
      makeReq({ requirementType: "credential", requirementKey: "same_key" }),
      false,
      "Missing credential"
    );
    const results = [
      makeResult({ targetId: "t1", readinessPercent: 50, blockingRequirements: [blocker], unmetRequirements: [blocker] }),
      makeResult({ targetId: "t1", readinessPercent: 50, blockingRequirements: [blocker], unmetRequirements: [blocker] }),
    ];

    const actions = analyzeMobilityFeedback("teacher-1", results);
    // Same targetId + same key = should deduplicate
    const blockingActions = actions.filter((a) => a.priorityScore === 85);
    expect(blockingActions).toHaveLength(1);
  });

  it("handles empty results", () => {
    const actions = analyzeMobilityFeedback("teacher-1", []);
    expect(actions).toHaveLength(0);
  });

  it("maps requirement types to correct action types", () => {
    const types: Array<[string, string]> = [
      ["credential", "pursue_credential"],
      ["pathway_completion", "start_pathway"],
      ["verified_evidence", "submit_evidence"],
      ["reputation_threshold", "request_mentor_validation"],
    ];

    for (const [reqType, expectedAction] of types) {
      const blocker = makeEval(
        makeReq({ requirementType: reqType as any, requirementKey: `key_${reqType}` }),
        false,
        `Missing ${reqType}`
      );
      const result = makeResult({
        targetId: `target_${reqType}`,
        readinessPercent: 50,
        blockingRequirements: [blocker],
        unmetRequirements: [blocker],
      });

      const actions = analyzeMobilityFeedback("teacher-1", [result]);
      expect(actions[0].recommendedActionType).toBe(expectedAction);
    }
  });
});
