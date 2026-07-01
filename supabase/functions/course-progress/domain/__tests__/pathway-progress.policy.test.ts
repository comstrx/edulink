// Run: deno test supabase/functions/course-progress/
import { assertEquals } from "jsr:@std/assert@1";
import { computePathwayProgress } from "../pathway-progress.policy.ts";

const NOW = "2026-07-01T00:00:00.000Z";

Deno.test("weights courses 60% and milestones 40%", () => {
  const r = computePathwayProgress({
    requiredCourseIds: ["c1", "c2"],
    completedCourseIds: new Set(["c1"]), // 50% of courses
    milestones: [
      { id: "m1", status: "completed", linkedCourseIds: [] },
      { id: "m2", status: "available", linkedCourseIds: ["c2"] }, // c2 not done → stays
    ],
    now: NOW,
  });
  // courseP=50, milestoneP=50 → round(50*0.6 + 50*0.4) = 50
  assertEquals(r.progressPercent, 50);
  assertEquals(r.pathwayComplete, false);
});

Deno.test("unlocks the next locked milestone once its predecessor is complete", () => {
  const r = computePathwayProgress({
    requiredCourseIds: [],
    completedCourseIds: new Set(),
    milestones: [
      { id: "m1", status: "completed", linkedCourseIds: [] },
      { id: "m2", status: "locked", linkedCourseIds: ["c9"] },
    ],
    now: NOW,
  });
  assertEquals(r.milestoneUpdates.find((u) => u.id === "m2")?.status, "available");
});

Deno.test("auto-completes a milestone when all linked courses are done, and the pathway", () => {
  const r = computePathwayProgress({
    requiredCourseIds: ["c1"],
    completedCourseIds: new Set(["c1"]),
    milestones: [{ id: "m1", status: "available", linkedCourseIds: ["c1"] }],
    now: NOW,
  });
  const m1 = r.milestoneUpdates.find((u) => u.id === "m1");
  assertEquals(m1?.status, "completed");
  assertEquals(m1?.completedAt, NOW);
  assertEquals(r.progressPercent, 100);
  assertEquals(r.pathwayComplete, true);
});

Deno.test("an empty pathway is vacuously complete", () => {
  const r = computePathwayProgress({
    requiredCourseIds: [],
    completedCourseIds: new Set(),
    milestones: [],
    now: NOW,
  });
  assertEquals(r.pathwayComplete, true);
  assertEquals(r.progressPercent, 0);
});
