/**
 * Mobility Explainability Types — Sprint 5
 */

export interface MobilityTargetExplainability {
  /** Target being evaluated */
  targetId: string;
  targetName: string;
  trackName: string;

  /** Human-readable summary */
  summary: string;

  /** Top contributing satisfied signals */
  keyDrivers: string[];

  /** Critical unmet mandatory requirements */
  blockers: string[];

  /** Categorized signal indicators */
  signals: {
    category: string;
    status: "satisfied" | "unmet" | "blocking";
    explanation: string;
  }[];

  /** Readiness classification */
  readinessClassification: "ready" | "emerging" | "developing" | "early";
}

export interface MobilityExplainabilityBundle {
  teacherId: string;
  evaluatedAt: string;
  targets: MobilityTargetExplainability[];
  overallSummary: string;
}
