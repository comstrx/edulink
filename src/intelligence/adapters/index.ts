/**
 * Intelligence Injection Layer — Barrel Export
 *
 * Step 10C — Intelligence Injection Layer
 */

// Adapters
export { adaptCriToSignal } from "./cri.adapter";
export { adaptMatchToSignal } from "./match.adapter";
export { adaptGapToSignal } from "./gap.adapter";
export { adaptRecommendationToSignal } from "./recommendation.adapter";
export { adaptVerificationToSignal } from "./verification.adapter";
export { buildTeacherExperienceSignals } from "./experience.adapter";
export type { ExperienceSnapshotInputs } from "./experience.adapter";

// Signal types
export type {
  CareerReadinessSignal,
  ReadinessLevel,
  JobCompatibilitySignal,
  GapInsightSignal,
  ActionableRecommendation,
  ActionableRecommendations,
  VerificationSignal,
  VerificationLevel,
  BadgeType,
  TeacherExperienceSignals,
} from "./types/adapter-signals.types";
