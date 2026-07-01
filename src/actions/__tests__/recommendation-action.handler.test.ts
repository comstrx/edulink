import { describe, it, expect, vi } from "vitest";
import {
  resolveRecommendationAction,
  executeRecommendationAction,
  type RecommendationActionInput,
} from "@/actions/recommendation-action.handler";

const makeInput = (overrides: Partial<RecommendationActionInput> = {}): RecommendationActionInput => ({
  recommendationId: "rec-1",
  type: "course_recommendation",
  targetResourceId: "",
  actionLabelKey: "course_recommendation",
  priority: "high",
  ...overrides,
});

describe("recommendation-action.handler", () => {
  // ── Deep-link with targetResourceId ──────────────────────
  it("open_course deep-links to specific course", () => {
    const r = resolveRecommendationAction(makeInput({ type: "course_recommendation", targetResourceId: "c-123" }));
    expect(r.actionType).toBe("open_course");
    expect(r.path).toBe("/training/courses/c-123");
    expect(r.ctaLabel).toBe("View Course");
  });

  it("open_pathway deep-links to specific pathway", () => {
    const r = resolveRecommendationAction(makeInput({ type: "pathway_recommendation", targetResourceId: "p-456" }));
    expect(r.actionType).toBe("open_pathway");
    expect(r.path).toBe("/training/pathways/p-456");
  });

  it("open_job deep-links to specific job", () => {
    const r = resolveRecommendationAction(makeInput({ type: "job", targetResourceId: "j-789" }));
    expect(r.actionType).toBe("open_job");
    expect(r.path).toBe("/jobs/j-789");
  });

  it("book_mentor deep-links to specific mentor", () => {
    const r = resolveRecommendationAction(makeInput({ type: "mentor", targetResourceId: "m-111" }));
    expect(r.actionType).toBe("book_mentor");
    expect(r.path).toBe("/training/mentors/m-111");
  });

  // ── Fallback to basePath when no targetResourceId ────────
  it("open_course falls back to /training without targetResourceId", () => {
    const r = resolveRecommendationAction(makeInput({ type: "course_recommendation", targetResourceId: "" }));
    expect(r.path).toBe("/training");
  });

  it("open_pathway falls back to /training/pathways without targetResourceId", () => {
    const r = resolveRecommendationAction(makeInput({ type: "pathway_recommendation" }));
    expect(r.path).toBe("/training/pathways");
  });

  // ── Profile / credentials (query-param deep-links) ──────
  it("profile_completion_action deep-links with section param", () => {
    const r = resolveRecommendationAction(makeInput({ type: "profile_completion_action", targetResourceId: "languages" }));
    expect(r.actionType).toBe("open_profile_edit");
    expect(r.path).toBe("/app/teacher/profile?section=languages");
  });

  it("verification_action deep-links with verify param", () => {
    const r = resolveRecommendationAction(makeInput({ type: "verification_action", targetResourceId: "cred-222" }));
    expect(r.actionType).toBe("open_credentials");
    expect(r.path).toBe("/app/teacher/credentials?verify=cred-222");
  });

  it("certification_recommendation deep-links with highlight param", () => {
    const r = resolveRecommendationAction(makeInput({ type: "certification_recommendation", targetResourceId: "cert-333" }));
    expect(r.actionType).toBe("upload_certificate");
    expect(r.path).toBe("/app/teacher/credentials?highlight=cert-333");
  });

  // ── Static deep-link (curriculum_alignment) ──────────────
  it("curriculum_alignment_action uses static deep-link", () => {
    const r = resolveRecommendationAction(makeInput({ type: "curriculum_alignment_action" }));
    expect(r.path).toBe("/app/teacher/profile?section=curriculum");
  });

  // ── Generic training types ───────────────────────────────
  it("language_improvement_action goes to /training", () => {
    const r = resolveRecommendationAction(makeInput({ type: "language_improvement_action" }));
    expect(r.actionType).toBe("open_training");
    expect(r.path).toBe("/training");
  });

  it("experience_building_action goes to /training", () => {
    const r = resolveRecommendationAction(makeInput({ type: "experience_building_action" }));
    expect(r.path).toBe("/training");
  });

  // ── Unknown type → unsupported_action ────────────────────
  it("unknown type resolves to unsupported_action", () => {
    const r = resolveRecommendationAction(makeInput({ type: "some_future_type" }));
    expect(r.actionType).toBe("unsupported_action");
    expect(r.path).toBe("/app/teacher/training/recommendations");
    expect(r.ctaLabel).toBe("View Details");
  });

  // ── Determinism ──────────────────────────────────────────
  it("same input always produces same output", () => {
    const input = makeInput({ type: "course_recommendation", targetResourceId: "c-99" });
    const r1 = resolveRecommendationAction(input);
    const r2 = resolveRecommendationAction(input);
    expect(r1).toEqual(r2);
  });

  // ── executeRecommendationAction calls navigate ───────────
  it("executeRecommendationAction calls navigate with resolved path", () => {
    const nav = vi.fn();
    const result = executeRecommendationAction(
      makeInput({ type: "job", targetResourceId: "j-1" }),
      nav,
    );
    expect(nav).toHaveBeenCalledOnce();
    expect(nav).toHaveBeenCalledWith("/jobs/j-1");
    expect(result.actionType).toBe("open_job");
  });

  it("executeRecommendationAction navigates to basePath for unsupported type", () => {
    const nav = vi.fn();
    executeRecommendationAction(makeInput({ type: "unknown_xyz" }), nav);
    expect(nav).toHaveBeenCalledWith("/app/teacher/training/recommendations");
  });
});
