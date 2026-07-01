import { describe, it, expect } from "vitest";
import { resolveContextualPriority } from "@/smart-glue/decision-engine";

describe("resolveContextualPriority", () => {
  // ── Critical ──────────────────────────────────────────────

  it("returns critical when CRI < 30, gaps >= 3, recent rejection", () => {
    const r = resolveContextualPriority(20, 4, true, false);
    expect(r.priority).toBe("critical");
  });

  it("does NOT return critical without recent rejection", () => {
    const r = resolveContextualPriority(20, 4, false, false);
    expect(r.priority).not.toBe("critical");
  });

  it("does NOT return critical when gaps < 3", () => {
    const r = resolveContextualPriority(20, 2, true, false);
    expect(r.priority).not.toBe("critical");
  });

  // ── High ──────────────────────────────────────────────────

  it("returns high when CRI < 50 and gaps >= 1", () => {
    const r = resolveContextualPriority(40, 2, false, false);
    expect(r.priority).toBe("high");
  });

  it("returns high when multiEvent boost is true", () => {
    const r = resolveContextualPriority(70, 0, false, true);
    expect(r.priority).toBe("high");
  });

  it("returns high when crossDomain boost is true", () => {
    const r = resolveContextualPriority(70, 0, false, false, true);
    expect(r.priority).toBe("high");
    expect(r.reasoning[0]).toContain("crossDomain");
  });

  it("crossDomain boost does not override critical", () => {
    const r = resolveContextualPriority(20, 4, true, false, true);
    expect(r.priority).toBe("critical");
  });

  // ── Low ───────────────────────────────────────────────────

  it("returns low when CRI >= 80 and no gaps", () => {
    const r = resolveContextualPriority(85, 0, false, false);
    expect(r.priority).toBe("low");
  });

  it("does NOT return low when gaps > 0", () => {
    const r = resolveContextualPriority(85, 1, false, false);
    expect(r.priority).not.toBe("low");
  });

  // ── Normal (default) ──────────────────────────────────────

  it("returns normal for moderate signals", () => {
    const r = resolveContextualPriority(60, 1, false, false);
    expect(r.priority).toBe("normal");
  });

  it("returns normal when criScore is null", () => {
    const r = resolveContextualPriority(null, 2, true, false);
    expect(r.priority).toBe("normal");
  });

  // ── Determinism ───────────────────────────────────────────

  it("same inputs produce identical output", () => {
    const r1 = resolveContextualPriority(25, 5, true, false);
    const r2 = resolveContextualPriority(25, 5, true, false);
    expect(r1).toEqual(r2);
  });

  // ── Reasoning ─────────────────────────────────────────────

  it("includes reasoning trace", () => {
    const r = resolveContextualPriority(20, 4, true, false);
    expect(r.reasoning.length).toBeGreaterThan(0);
    expect(r.reasoning[0]).toContain("critical");
  });
});
