/**
 * Decision Intelligence — Barrel Export
 *
 * Sprint 7D — School Decision Intelligence Layer
 */

export {
  buildReadinessBreakdown,
  buildRiskIndicators,
  buildDecisionSignals,
  buildComparisonEntry,
  buildComparisonSummary,
  buildCandidateDecisionIntelligence,
} from "./decision-intelligence-engine";

export type {
  ReadinessDimensionKey,
  ReadinessDimension,
  CandidateReadinessBreakdown,
  RiskType,
  RiskSeverity,
  HiringRiskIndicator,
  CandidateRiskIndicators,
  DecisionSignalType,
  DecisionSupportSignal,
  DecisionSupportSignals,
  CandidateComparisonEntry,
  CandidateComparisonSummary,
  CandidateDecisionIntelligence,
} from "./types/decision-intelligence.types";
