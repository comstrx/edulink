/**
 * CRI Experience Adapter
 *
 * Converts TeacherCriSnapshot → CareerReadinessSignal.
 * No recomputation. Pure mapping only.
 *
 * ⚠️ Readiness level comes from intelligence_talent_profiles.readiness_level.
 * This adapter does NOT compute readiness — it maps CRI dimensions and scores.
 */

import type { TeacherCriSnapshot } from "@/intelligence/read-models/types/intelligence-read-models.types";
import type { CareerReadinessSignal } from "./types/adapter-signals.types";
import type { CanonicalReadinessLevel } from "@/intelligence/readiness/canonical-readiness.types";

function readinessToCareerStage(level: CanonicalReadinessLevel): string {
  switch (level) {
    case "highly_ready": return "Established professional";
    case "ready": return "Career-ready candidate";
    case "developing": return "Building qualifications";
    case "early": return "Early career stage";
  }
}

function scoreToConfidence(score: number, dimensionCount: number): "low" | "medium" | "high" {
  if (dimensionCount < 2) return "low";
  if (score >= 70 && dimensionCount >= 3) return "high";
  return "medium";
}

/**
 * Adapts a CRI snapshot into a career readiness signal.
 * Readiness level must be provided from the canonical source (intelligence_talent_profiles).
 */
export function adaptCriToSignal(
  snapshot: TeacherCriSnapshot | null,
  canonicalReadinessLevel: CanonicalReadinessLevel | null,
): CareerReadinessSignal | null {
  if (!snapshot || !canonicalReadinessLevel) return null;

  const dims = snapshot.dimensions;

  const sorted = [...dims].sort((a, b) => (b.score / b.maxScore) - (a.score / a.maxScore));
  const topStrengths = sorted
    .filter((d) => d.matched)
    .slice(0, 3)
    .map((d) => d.label);
  const topRisks = sorted
    .filter((d) => !d.matched)
    .slice(0, 3)
    .map((d) => d.label);

  const explanationCodes: string[] = [];
  if (snapshot.gapTermIds.length > 0) explanationCodes.push("has_gaps");
  if (topStrengths.length >= 3) explanationCodes.push("strong_profile");
  if (snapshot.score < 41) explanationCodes.push("needs_development");
  explanationCodes.push(`band_${canonicalReadinessLevel}`);

  return {
    readinessLevel: canonicalReadinessLevel,
    careerStage: readinessToCareerStage(canonicalReadinessLevel),
    score: snapshot.score,
    topStrengths,
    topRisks,
    confidence: scoreToConfidence(snapshot.score, dims.length),
    explanationCodes,
    jobId: snapshot.jobId,
  };
}
