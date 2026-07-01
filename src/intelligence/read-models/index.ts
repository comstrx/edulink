/**
 * Intelligence Read Models — Barrel Export
 *
 * Single entry point for all read-model snapshot types,
 * repository, selectors, and mappers.
 *
 * Workstream 2A + 2B
 */

// ── Types ──────────────────────────────────────────────────────
export type {
  // Shared
  SnapshotStaleness,
  SnapshotMeta,
  // 1. CRI
  TeacherCriSnapshot,
  CriDimensionScore,
  // 2. Match
  TeacherJobMatchSnapshot,
  MatchDimensionScore,
  // 3. Gaps
  TeacherGapSnapshot,
  GapEntry,
  // 4. Recommendations
  TeacherRecommendationsSnapshot,
  RecommendationEntry,
  // 5. Verified State
  TeacherVerifiedStateSnapshot,
  VerifiedCredentialEntry,
} from "./types/intelligence-read-models.types";

// ── Repository ─────────────────────────────────────────────────
export type {
  SnapshotResult,
  IntelligenceReadModelRepository,
} from "./repositories/intelligence-read-models.repository";
export {
  stubRepository,
  setRepository,
  getRepository,
} from "./repositories/intelligence-read-models.repository";

// ── Selectors ──────────────────────────────────────────────────
export type { ReadModelView } from "./selectors/intelligence-read-models.selectors";
export {
  toView,
  selectCriView,
  selectMatchView,
  selectGapView,
  selectRecommendationsView,
  selectVerifiedStateView,
  selectCriScore,
  selectMatchScore,
  selectGapCount,
  selectVerificationStatus,
} from "./selectors/intelligence-read-models.selectors";

// ── Mappers ────────────────────────────────────────────────────
export {
  mapMatchResultToCriSnapshot,
  mapMatchResultToMatchSnapshot,
} from "./mappers/intelligence-read-models.mappers";
