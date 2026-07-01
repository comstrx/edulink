import { describe, it, expect } from "vitest";
import {
  getForwardStage,
  isValidTransition,
  isTerminal,
  canReject,
  getForwardActionLabel,
  TERMINAL_STATUSES,
  REJECTABLE_STATUSES,
  PIPELINE_STAGES,
} from "@/lib/pipeline-stages";
import type { ApplicationStatus } from "@/hooks/useApplications";

/**
 * Phase 4.2B — Pipeline Transition Hardening Tests
 */

describe("Pipeline stage transitions", () => {
  describe("getForwardStage", () => {
    it("applied → shortlisted", () => expect(getForwardStage("applied")).toBe("shortlisted"));
    it("shortlisted → interview", () => expect(getForwardStage("shortlisted")).toBe("interview"));
    it("interview → offer", () => expect(getForwardStage("interview")).toBe("offer"));
    it("offer → hired", () => expect(getForwardStage("offer")).toBe("hired"));
    it("hired → null (terminal)", () => expect(getForwardStage("hired")).toBeNull());
    it("rejected → null (terminal)", () => expect(getForwardStage("rejected")).toBeNull());
    it("withdrawn → null (terminal)", () => expect(getForwardStage("withdrawn")).toBeNull());
  });

  describe("isValidTransition", () => {
    it("allows applied → shortlisted", () => expect(isValidTransition("applied", "shortlisted")).toBe(true));
    it("allows shortlisted → interview", () => expect(isValidTransition("shortlisted", "interview")).toBe(true));
    it("allows interview → offer", () => expect(isValidTransition("interview", "offer")).toBe(true));
    it("allows offer → hired", () => expect(isValidTransition("offer", "hired")).toBe(true));

    it("blocks skipping: applied → interview", () => expect(isValidTransition("applied", "interview")).toBe(false));
    it("blocks skipping: applied → offer", () => expect(isValidTransition("applied", "offer")).toBe(false));
    it("blocks backward: shortlisted → applied", () => expect(isValidTransition("shortlisted", "applied")).toBe(false));
    it("blocks backward: hired → offer", () => expect(isValidTransition("hired", "offer")).toBe(false));

    it("blocks from terminal: rejected → shortlisted", () => expect(isValidTransition("rejected", "shortlisted")).toBe(false));
    it("blocks from terminal: withdrawn → applied", () => expect(isValidTransition("withdrawn", "applied")).toBe(false));
    it("blocks from terminal: hired → anything", () => expect(isValidTransition("hired", "applied")).toBe(false));
  });

  describe("reject transitions", () => {
    it("allows applied → rejected", () => expect(isValidTransition("applied", "rejected")).toBe(true));
    it("allows shortlisted → rejected", () => expect(isValidTransition("shortlisted", "rejected")).toBe(true));
    it("allows interview → rejected", () => expect(isValidTransition("interview", "rejected")).toBe(true));
    it("allows offer → rejected", () => expect(isValidTransition("offer", "rejected")).toBe(true));
    it("blocks rejected → rejected", () => expect(isValidTransition("rejected", "rejected")).toBe(false));
    it("blocks hired → rejected", () => expect(isValidTransition("hired", "rejected")).toBe(false));
  });

  describe("terminal status checks", () => {
    it("rejected is terminal", () => expect(isTerminal("rejected")).toBe(true));
    it("withdrawn is terminal", () => expect(isTerminal("withdrawn")).toBe(true));
    it("hired is terminal", () => expect(isTerminal("hired")).toBe(true));
    it("applied is not terminal", () => expect(isTerminal("applied")).toBe(false));
    it("shortlisted is not terminal", () => expect(isTerminal("shortlisted")).toBe(false));
  });

  describe("canReject", () => {
    it("applied can be rejected", () => expect(canReject("applied")).toBe(true));
    it("shortlisted can be rejected", () => expect(canReject("shortlisted")).toBe(true));
    it("interview can be rejected", () => expect(canReject("interview")).toBe(true));
    it("offer can be rejected", () => expect(canReject("offer")).toBe(true));
    it("rejected cannot be rejected again", () => expect(canReject("rejected")).toBe(false));
    it("hired cannot be rejected", () => expect(canReject("hired")).toBe(false));
    it("withdrawn cannot be rejected", () => expect(canReject("withdrawn")).toBe(false));
  });

  describe("forward action labels", () => {
    it("applied → Shortlist", () => expect(getForwardActionLabel("applied")).toBe("Shortlist"));
    it("shortlisted → Interview", () => expect(getForwardActionLabel("shortlisted")).toBe("Interview"));
    it("interview → Offer", () => expect(getForwardActionLabel("interview")).toBe("Offer"));
    it("offer → Hire", () => expect(getForwardActionLabel("offer")).toBe("Hire"));
    it("hired → empty", () => expect(getForwardActionLabel("hired")).toBe(""));
    it("rejected → empty", () => expect(getForwardActionLabel("rejected")).toBe(""));
  });

  describe("stage definitions", () => {
    it("has 6 pipeline stages", () => expect(PIPELINE_STAGES).toHaveLength(6));
    it("has 3 terminal statuses", () => expect(TERMINAL_STATUSES).toHaveLength(3));
    it("has 4 rejectable statuses", () => expect(REJECTABLE_STATUSES).toHaveLength(4));
  });
});
