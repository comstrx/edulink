/**
 * Workforce Explainability Types — Sprint 4
 *
 * Structured reasoning metadata for workforce intelligence outputs.
 * Attached at the aggregation layer, not UI.
 */

/** A single contributing signal to a workforce output */
export interface WorkforceSignalContribution {
  /** Human-readable signal category */
  type: "reputation" | "cri" | "credentials" | "training" | "career_stage" | "team_size" | "verification";
  /** Display-safe label */
  label: string;
  /** Computed value (score, count, percentage) */
  value: string | number;
}

/** Explainability for the school-level workforce profile */
export interface WorkforceProfileExplainability {
  summary: string;
  keyDrivers: string[];
  signals: WorkforceSignalContribution[];
  teamSize: number;
  computedAt: string;
}

/** Explainability for a department capability snapshot */
export interface DepartmentExplainability {
  summary: string;
  keyDrivers: string[];
  signals: WorkforceSignalContribution[];
}

/** Explainability for a detected workforce gap */
export interface GapExplainability {
  summary: string;
  triggerCondition: string;
  contributingSignals: WorkforceSignalContribution[];
}

/** Explainability for promotion readiness */
export interface PromotionExplainability {
  summary: string;
  keyDrivers: string[];
}

/** Full explainability bundle for workforce insight summary */
export interface WorkforceExplainabilityBundle {
  profile: WorkforceProfileExplainability;
  departments: Record<string, DepartmentExplainability>;
  gaps: GapExplainability[];
  promotionPipeline: PromotionExplainability;
}
