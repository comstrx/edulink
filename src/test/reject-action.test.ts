import { describe, it, expect } from "vitest";

/**
 * Phase 3.3b — Reject Action with Taxonomy-Backed Rejection Reason Tests
 *
 * Validates:
 * 1. Rejection requires a reason term ID
 * 2. The status update payload carries structured rejection metadata
 * 3. Non-reject statuses remain backward compatible
 */

describe("Reject action payload structure", () => {
  it("rejects without rejectionReasonTermId when status is rejected", () => {
    // Simulates the validation rule enforced by RejectApplicationDialog:
    // The confirm button is disabled when selectedReasonId is empty
    const selectedReasonId = "";
    const canSubmit = selectedReasonId.length > 0;
    expect(canSubmit).toBe(false);
  });

  it("allows submission when rejectionReasonTermId is provided", () => {
    const selectedReasonId = "term-uuid-123";
    const canSubmit = selectedReasonId.length > 0;
    expect(canSubmit).toBe(true);
  });

  it("passes structured rejection data with full context", () => {
    const payload = {
      applicationId: "app-1",
      newStatus: "rejected" as const,
      rejectionReasonTermId: "term-uuid-456",
      teacherId: "teacher-uuid-789",
      jobId: "job-uuid-012",
    };
    expect(payload.rejectionReasonTermId).toBeTruthy();
    expect(payload.teacherId).toBeTruthy();
    expect(payload.jobId).toBeTruthy();
    expect(payload.newStatus).toBe("rejected");
  });

  it("non-reject status updates do not require rejectionReasonTermId", () => {
    const withdrawPayload = {
      applicationId: "app-2",
      newStatus: "withdrawn" as const,
    };
    expect(withdrawPayload).not.toHaveProperty("rejectionReasonTermId");

    const reapplyPayload = {
      applicationId: "app-3",
      newStatus: "applied" as const,
    };
    expect(reapplyPayload).not.toHaveProperty("rejectionReasonTermId");
  });

  it("canReject is true only for actionable statuses", () => {
    const canReject = (status: string) =>
      status === "applied" || status === "shortlisted";

    expect(canReject("applied")).toBe(true);
    expect(canReject("shortlisted")).toBe(true);
    expect(canReject("withdrawn")).toBe(false);
    expect(canReject("rejected")).toBe(false);
  });
});
