/**
 * Professional Reputation System — Barrel Export
 */

// Legacy types (kept for backward compatibility)
export type {
  ReputationDimension,
  ReputationTier,
  ReputationEvent,
  ReputationProfile,
  ReputationEventInput,
  DimensionSummary,
  ReputationSignal,
} from "./types/reputation.types";

export type {
  ReputationLevel,
  ReputationResolvedState,
  ProfessionalReputationSummary,
} from "./types/professional-reputation.types";

export {
  deriveReputationLevel,
  REPUTATION_LEVEL_THRESHOLDS,
  REPUTATION_LEVEL_LABELS,
  REPUTATION_LEVEL_COLORS,
} from "./types/professional-reputation.types";

// Reputation Graph Layer types
export type {
  ReputationGraphLevel,
  ReputationGraphResolvedState,
  ReputationGraphSummary,
  TrustSignals,
  TrainingEvidenceSignals,
  MentoringSignals,
  HiringOutcomeSignals,
  ReviewSignals,
  EvidenceSource,
  EvidenceSourceKind,
  ReputationAudience,
  PublicReputationView,
  SchoolReputationView,
  InternalReputationView,
  ReputationHiringSignals,
} from "./types/reputation-graph.types";

export {
  REPUTATION_GRAPH_LEVEL_LABELS,
  REPUTATION_GRAPH_LEVEL_COLORS,
} from "./types/reputation-graph.types";

// Audience filtering utilities
export {
  getPublicReputationView,
  getSchoolReputationView,
  getInternalReputationView,
  getReputationViewByAudience,
} from "./utils/audience-filter";

// Level derivation
export { deriveReputationGraphLevel, deriveLightweightReputationLevel } from "./utils/derive-reputation-level";

// Evidence sources
export { buildEvidenceSources } from "./utils/evidence-sources";

// Engine
export { processReputationEvent, refreshReputationProfile } from "./engine/reputation-event-handler";
export { computeReputationTier, explainTier } from "./engine/reputation-tier-engine";
export { buildReputationSignals } from "./engine/reputation-signals";
export { REPUTATION_WEIGHTS, DIMENSION_LABELS, ALL_DIMENSIONS } from "./engine/reputation-weights";

// Hooks
export { useTeacherReputation } from "./hooks/useTeacherReputation";
export type { TeacherReputationView } from "./hooks/useTeacherReputation";
export { useProfessionalReputation } from "./hooks/useProfessionalReputation";

// Canonical adapter (single source of truth for scoring + level)
export {
  computeCanonicalReputationScore,
  getCanonicalReputation,
  getCanonicalReputationBatch,
} from "./canonical-adapter";
export type {
  CanonicalReputationScoreInput,
  CanonicalReputationSummary,
} from "./canonical-adapter";
