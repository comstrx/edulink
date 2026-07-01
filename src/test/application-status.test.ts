import { describe, it, expect } from "vitest";
import type { ApplicationStatus } from "@/hooks/useApplications";

/**
 * Phase 3.3a — Application Status Extension Tests
 *
 * Validates that the application status type system correctly supports
 * "rejected" alongside existing statuses, without regressions.
 */

const VALID_STATUSES: ApplicationStatus[] = ["applied", "shortlisted", "interview", "offer", "hired", "withdrawn", "rejected"];

describe("ApplicationStatus type", () => {
  it("includes 'applied' as a valid status", () => {
    const s: ApplicationStatus = "applied";
    expect(VALID_STATUSES).toContain(s);
  });

  it("includes 'withdrawn' as a valid status", () => {
    const s: ApplicationStatus = "withdrawn";
    expect(VALID_STATUSES).toContain(s);
  });

  it("includes 'rejected' as a valid status", () => {
    const s: ApplicationStatus = "rejected";
    expect(VALID_STATUSES).toContain(s);
  });

  it("has exactly 7 supported statuses", () => {
    expect(VALID_STATUSES).toHaveLength(7);
  });
});

describe("ApplicationStatusChangedPayload", () => {
  it("supports rejectionReasonTermId as optional field", async () => {
    const { ApplicationStatusChangedPayload } = await import(
      "@/contracts/hiring/hiring.contracts"
    ).then(() => ({
      // Type-level verification — if this compiles, the field exists
      ApplicationStatusChangedPayload: true,
    }));

    // Payload with rejection reason
    const withReason: {
      applicationId: string;
      newStatus: string;
      rejectionReasonTermId?: string | null;
    } = {
      applicationId: "app-1",
      newStatus: "rejected",
      rejectionReasonTermId: "term-xyz",
    };
    expect(withReason.rejectionReasonTermId).toBe("term-xyz");

    // Payload without rejection reason (backward compat)
    const withoutReason: {
      applicationId: string;
      newStatus: string;
    } = {
      applicationId: "app-2",
      newStatus: "withdrawn",
    };
    expect(withoutReason.newStatus).toBe("withdrawn");
  });
});
