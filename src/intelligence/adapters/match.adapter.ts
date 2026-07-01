/**
 * Match Context Adapter
 *
 * Converts TeacherJobMatchSnapshot → JobCompatibilitySignal.
 * Teacher-job scoped. No recomputation.
 *
 * Step 10C — Intelligence Injection Layer
 */

import type { TeacherJobMatchSnapshot } from "@/intelligence/read-models/types/intelligence-read-models.types";
import type { JobCompatibilitySignal } from "./types/adapter-signals.types";

export function adaptMatchToSignal(snapshot: TeacherJobMatchSnapshot | null): JobCompatibilitySignal | null {
  if (!snapshot) return null;

  const strengthAreas = snapshot.dimensions
    .filter((d) => d.matched)
    .map((d) => ({ dimension: d.dimension, label: d.label, score: d.score }));

  const riskAreas = snapshot.dimensions
    .filter((d) => !d.matched)
    .map((d) => ({ dimension: d.dimension, label: d.label, score: d.score }));

  const explanationCodes: string[] = [];
  if (snapshot.score >= 80) explanationCodes.push("strong_match");
  else if (snapshot.score >= 60) explanationCodes.push("moderate_match");
  else explanationCodes.push("weak_match");

  if (snapshot.unmatchedTermIds.length > 0) explanationCodes.push("has_unmatched_requirements");
  if (riskAreas.length === 0) explanationCodes.push("no_risk_areas");
  if (snapshot.confidence === "low") explanationCodes.push("low_data_confidence");

  return {
    compatibilityScore: snapshot.score,
    strengthAreas,
    riskAreas,
    missingRequirements: snapshot.unmatchedTermIds,
    confidence: snapshot.confidence,
    explanationCodes,
    jobId: snapshot.jobId,
  };
}
