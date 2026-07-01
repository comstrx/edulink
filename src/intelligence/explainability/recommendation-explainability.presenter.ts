/**
 * Recommendation Explainability Presenter — Sprint 4
 *
 * Single source of truth for all user-facing explainability.
 * Consumes UIRecommendation fields and completion provenance,
 * outputs a presentation-ready ExplainabilityView.
 *
 * Rules:
 * - No raw keys in output — everything is humanized
 * - No DB queries — pure mapping only
 * - User tier only — no debug/admin data exposed
 * - Max 3 reason lines (user-view constraint)
 */

// ── Humanized Mappings ────────────────────────────────────────

const SOURCE_EXPLANATIONS: Record<string, string> = {
  growth: "Based on feedback from a recent hiring process",
  snapshot: "Based on your professional profile analysis",
};

const REASON_CODE_LABELS: Record<string, string> = {
  // Gap-related
  gap_analysis: "A gap was identified in your professional profile",
  skill_deficit: "A skill gap was found based on role requirements",
  curriculum_competency: "Your curriculum competency needs strengthening",
  classroom_practice: "Your classroom practice could be enhanced",
  language_proficiency: "Language proficiency improvement recommended",
  certification: "A relevant certification is missing or expiring",
  evidence_verification: "Your credentials need evidence verification",
  pathway_completion: "A learning pathway needs completion",
  subject_expertise: "Subject expertise development recommended",
  experience: "Additional professional experience would strengthen your profile",
  // Hiring-related
  rejection_feedback: "Feedback from a hiring outcome identified areas for growth",
  hiring_gap: "A gap surfaced during the hiring evaluation",
  match_weakness: "A weaker area was identified in your job match",
  talent_intelligence: "Your talent profile suggests a development opportunity",
  // Training-related
  training_completion: "Based on your training progress",
  missing_course: "A recommended course has not been completed",
  incomplete_pathway: "A learning pathway is partially completed",
  // Action-driven
  enroll_course: "Enrolling in this course addresses a professional gap",
  start_pathway: "Starting this pathway builds toward career advancement",
  continue_pathway: "Continuing this pathway progresses your development",
  submit_evidence: "Submitting evidence strengthens your verified credentials",
  revise_evidence: "Revising evidence improves your credential quality",
  request_mentor_validation: "Mentor validation verifies your professional practice",
  pursue_credential: "Earning this credential strengthens your professional profile",
  complete_missing_course: "Completing this course fills a gap in your development",
};

const ACTION_IMPACT_LABELS: Record<string, string> = {
  enroll_course: "Strengthens a key teaching competency",
  start_pathway: "Builds toward career advancement",
  continue_pathway: "Progresses your professional development",
  complete_missing_course: "Fills a gap in your learning pathway",
  submit_evidence: "Strengthens your verified credentials",
  revise_evidence: "Improves your credential evidence quality",
  request_mentor_validation: "Advances your credential verification",
  pursue_credential: "Adds to your professional credentials",
  course_recommendation: "Improves your readiness for target roles",
  pathway_recommendation: "Improves your readiness for target roles",
  certification_recommendation: "Strengthens your professional credentials",
  profile_completion_action: "Improves your visibility to hiring schools",
  verification_action: "Strengthens your verified profile",
  curriculum_alignment_action: "Aligns your profile with curriculum standards",
  language_improvement_action: "Expands your language qualifications",
  experience_building_action: "Builds relevant professional experience",
};

const COMPLETION_REASON_LABELS: Record<string, string> = {
  completed_course: "Completed after finishing a course",
  earned_credential: "Completed after earning a credential",
  completed_pathway: "Completed after finishing a pathway",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "High confidence",
  medium: "Moderate confidence",
  low: "Low confidence",
};

const GROUP_LABELS: Record<string, string> = {
  training_actions: "Professional Learning",
  evidence_actions: "Credential Evidence",
  certification_actions: "Professional Credentials",
  immediate_actions: "Immediate Actions",
};

// ── Explainability View Model ─────────────────────────────────

export interface ExplainabilityUserView {
  /** "Why does this recommendation exist?" */
  originExplanation: string;
  /** Humanized reason lines (max 3) */
  reasons: string[];
  /** "What is it meant to improve?" */
  impactExplanation: string;
  /** "Why was it completed?" — null if not completed */
  completionExplanation: string | null;
  /** e.g. "High confidence" — null if unavailable */
  confidenceLabel: string | null;
  /** e.g. "From hiring feedback" */
  sourceBadge: string;
  /** e.g. "Professional Learning" */
  categoryLabel: string | null;
  /** Pathway label — null if not pathway-linked */
  pathwayLabel: string | null;
}

// ── Input Shape ───────────────────────────────────────────────

export interface ExplainabilityInput {
  source: string;
  actionType: string;
  status: string;
  reasonCodes: string[];
  confidence?: string;
  groupKey?: string;
  pathwayContext?: { isPathway?: boolean };
  /** From completion provenance (Sprint 3) */
  completion_reason_key?: string | null;
}

// ── Presenter ─────────────────────────────────────────────────

export function buildExplainabilityView(rec: ExplainabilityInput): ExplainabilityUserView {
  return {
    originExplanation: resolveOrigin(rec),
    reasons: resolveReasons(rec.reasonCodes),
    impactExplanation: resolveImpact(rec),
    completionExplanation: resolveCompletion(rec),
    confidenceLabel: rec.confidence ? (CONFIDENCE_LABELS[rec.confidence] ?? `${rec.confidence} confidence`) : null,
    sourceBadge: rec.source === "growth" ? "From hiring feedback" : "From profile analysis",
    categoryLabel: rec.groupKey ? (GROUP_LABELS[rec.groupKey] ?? null) : null,
    pathwayLabel: rec.pathwayContext?.isPathway ? "Part of your pathway" : null,
  };
}

// ── Internal Resolvers ────────────────────────────────────────

function resolveOrigin(rec: ExplainabilityInput): string {
  // Source-specific origin
  if (rec.source === "growth") {
    const firstReason = rec.reasonCodes[0];
    if (firstReason && REASON_CODE_LABELS[firstReason]) {
      return REASON_CODE_LABELS[firstReason];
    }
    return SOURCE_EXPLANATIONS.growth;
  }

  // Snapshot with reason codes
  const firstReason = rec.reasonCodes[0];
  if (firstReason && REASON_CODE_LABELS[firstReason]) {
    return REASON_CODE_LABELS[firstReason];
  }

  return SOURCE_EXPLANATIONS.snapshot ?? "Recommended based on your professional profile";
}

function resolveReasons(reasonCodes: string[]): string[] {
  return reasonCodes
    .slice(0, 3)
    .map((code) => REASON_CODE_LABELS[code] ?? humanizeCode(code));
}

function resolveImpact(rec: ExplainabilityInput): string {
  const mapped = ACTION_IMPACT_LABELS[rec.actionType];
  if (mapped) return mapped;

  if (rec.groupKey === "training_actions") return "Supports your professional learning";
  if (rec.groupKey === "evidence_actions") return "Strengthens your verified credentials";
  if (rec.groupKey === "certification_actions") return "Advances your professional credentials";

  return "Helps improve your career readiness";
}

function resolveCompletion(rec: ExplainabilityInput): string | null {
  if (rec.status !== "completed") return null;
  return COMPLETION_REASON_LABELS[rec.completion_reason_key ?? ""] ?? "Recommendation completed";
}

/** Fallback: code → title case, never raw */
function humanizeCode(code: string): string {
  return code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
