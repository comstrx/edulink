/**
 * Experience Aggregator
 *
 * Composes all individual adapters into a single TeacherExperienceSignals
 * result. Reads snapshots only — no recomputation allowed.
 *
 * Step 10C — Intelligence Injection Layer
 */

import type {
  TeacherCriSnapshot,
  TeacherGapSnapshot,
  TeacherRecommendationsSnapshot,
  TeacherVerifiedStateSnapshot,
} from "@/intelligence/read-models/types/intelligence-read-models.types";
import type { TeacherExperienceSignals } from "./types/adapter-signals.types";
import { adaptCriToSignal } from "./cri.adapter";
import { adaptGapToSignal } from "./gap.adapter";
import { adaptRecommendationToSignal } from "./recommendation.adapter";
import { adaptVerificationToSignal } from "./verification.adapter";

export interface ExperienceSnapshotInputs {
  cri: TeacherCriSnapshot | null;
  gaps: TeacherGapSnapshot | null;
  recommendations: TeacherRecommendationsSnapshot | null;
  verification: TeacherVerifiedStateSnapshot | null;
  canonicalReadinessLevel?: import("@/intelligence/readiness/canonical-readiness.types").CanonicalReadinessLevel | null;
}

/**
 * Builds aggregated experience signals from pre-loaded snapshots.
 * Each adapter safely handles null input by returning null.
 * No database calls. No recomputation. Pure transformation.
 */
export function buildTeacherExperienceSignals(
  inputs: ExperienceSnapshotInputs,
): TeacherExperienceSignals {
  return {
    readiness: adaptCriToSignal(inputs.cri, inputs.canonicalReadinessLevel ?? null),
    gaps: adaptGapToSignal(inputs.gaps),
    recommendations: adaptRecommendationToSignal(inputs.recommendations),
    verification: adaptVerificationToSignal(inputs.verification),
  };
}
