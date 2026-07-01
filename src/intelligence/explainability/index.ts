/**
 * Intelligence Explainability Layer — Barrel Export
 *
 * Phase 4.3 — Explainability and User Trust
 */

// Adapters
export { explainCri } from "./adapters/cri-explanation.adapter";
export { explainMatch } from "./adapters/match-explanation.adapter";
export { explainGap } from "./adapters/gap-explanation.adapter";
export { explainRecommendation } from "./adapters/recommendation-explanation.adapter";
export { explainVerification } from "./adapters/verification-explanation.adapter";

// Hooks
export {
  useCriExplanation,
  useMatchExplanation,
  useGapExplanation,
  useRecommendationExplanation,
  useVerificationExplanation,
} from "./hooks/useExplanation";

// Observability
export {
  trackExplanationView,
  getExplanationViewCounts,
  getExplanationViewLog,
  clearExplanationViewLog,
} from "./observability/explanation-tracker";

// Sprint 8H-B — Scoring Explainability
export { explainCRI } from "./cri/explainCRI";
export { explainMatchingScore } from "./matching/explainMatchingScore";
export { explainReputationScore } from "./reputation/explainReputationScore";
export type {
  ExplanationItem,
  ExplanationLevel,
  ExplainedScore,
} from "./core/explainabilityTypes";

// Types
export type {
  ExplanationDTO,
  EvidencePoint,
  CriExplanationDTO,
  MatchExplanationDTO,
  GapExplanationDTO,
  RecommendationExplanationDTO,
  VerificationExplanationDTO,
  IntelligenceExplanation,
} from "./types/explanation.types";
export { FALLBACK_EXPLANATION } from "./types/explanation.types";
