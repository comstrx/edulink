/**
 * Scoring Engines — Barrel Export
 * Sprint 8H-A: Score & Logic Stabilization
 */

export { calculateCRI } from "./cri/calculateCRI";
export type { CriInput, CriResult, CriBreakdown } from "./cri/criTypes";

export { calculateMatchingScore } from "./matching/calculateMatchingScore";
export type { MatchingTeacherInput, MatchingJobInput, MatchingResult, MatchingBreakdown } from "./matching/matchingTypes";

export { calculateReputationScore } from "./reputation/calculateReputationScore";
export type { ReputationInput, ReputationResult, ReputationBreakdown } from "./reputation/reputationTypes";
