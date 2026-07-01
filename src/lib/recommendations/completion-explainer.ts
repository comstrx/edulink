/**
 * Completion Explainer — Sprint 3 Step 5
 *
 * Minimal mapper: completion_reason_key → human-readable explanation.
 * Pure function, no side effects, no queries.
 */

const REASON_LABELS: Record<string, string> = {
  completed_course: "Completed after finishing a course",
  earned_credential: "Completed after earning a credential",
  completed_pathway: "Completed after finishing a pathway",
};

const FALLBACK = "Recommendation completed";

export function getCompletionExplanation(
  rec: { status?: string; completion_reason_key?: string | null },
): string | null {
  if (rec.status !== "completed") return null;
  return REASON_LABELS[rec.completion_reason_key ?? ""] ?? FALLBACK;
}
