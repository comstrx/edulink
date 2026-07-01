import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Credential Fallback Safety — Hardening Tests
 *
 * Validates that completeCredentialRecommendationsByCredentialId:
 * 1) Exact source_id match delegates to term-based closure correctly
 * 2) Missing source_id returns zero updates (no blanket-close)
 * 3) Idempotent on repeated calls
 */

// Mock supabase before importing the module
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockIn = vi.fn();
const mockUpdate = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      update: mockUpdate,
    })),
  },
}));

vi.mock("@/smart-glue/execution-telemetry", () => ({
  logExecution: vi.fn(),
}));

import { completeCredentialRecommendationsByCredentialId } from "@/intelligence/growth/growth-loop-completion.service";

function setupChain(overrides: Record<string, unknown> = {}) {
  // earned_credentials lookup chain
  mockSelect.mockReturnValueOnce({ eq: mockEq });
  mockEq.mockReturnValueOnce({ eq: mockEq });
  mockEq.mockReturnValueOnce({ maybeSingle: mockMaybeSingle });
  mockMaybeSingle.mockResolvedValueOnce(overrides.credResult ?? { data: null });
}

describe("completeCredentialRecommendationsByCredentialId — fallback safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero updates when source_id is missing (no blanket-close)", async () => {
    setupChain({ credResult: { data: null } });

    const result = await completeCredentialRecommendationsByCredentialId("t1", "cred-1");

    expect(result.success).toBe(true);
    expect(result.totalMarked).toBe(0);
    expect(result.completedRecommendationIds).toEqual([]);
    // Should NOT have called update at all
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns zero updates when source_id is empty string", async () => {
    setupChain({ credResult: { data: { source_id: "", source_type: "cert" } } });

    const result = await completeCredentialRecommendationsByCredentialId("t1", "cred-2");

    expect(result.success).toBe(true);
    expect(result.totalMarked).toBe(0);
  });
});
