/**
 * Recommendation Presentation Constants
 *
 * Centralized display semantics for recommendation rendering.
 * All recommendation surfaces must import from here — no local duplication.
 */

import { CheckCircle2 } from "lucide-react";

import {
  BookOpen, Zap, Award, ShieldCheck, User, Globe, Target,
  Route, FileCheck, UserCheck, Briefcase,
  type LucideIcon,
} from "lucide-react";

// ── Status ────────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  completed: "Completed",
};

export const STATUS_STYLES: Record<string, string> = {
  new: "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  in_progress: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800",
  completed: "border-green-200 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800",
};

// ── Priority ──────────────────────────────────────────────────

export const PRIORITY_STYLES: Record<string, string> = {
  critical: "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  high: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  medium: "border-border text-muted-foreground",
  low: "border-border/50 text-muted-foreground/70",
};

export const PRIORITY_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ── Icons ─────────────────────────────────────────────────────

export const TYPE_ICON: Record<string, LucideIcon> = {
  course_recommendation: BookOpen,
  pathway_recommendation: Zap,
  certification_recommendation: Award,
  job_recommendation: Briefcase,
  profile_completion_action: User,
  verification_action: ShieldCheck,
  curriculum_alignment_action: BookOpen,
  language_improvement_action: Globe,
  experience_building_action: Zap,
  training: BookOpen,
  pathway: Zap,
  job: Briefcase,
  mentor: User,
  enroll_course: BookOpen,
  start_pathway: Route,
  continue_pathway: Route,
  submit_evidence: FileCheck,
  revise_evidence: FileCheck,
  request_mentor_validation: UserCheck,
  pursue_credential: Award,
  complete_missing_course: BookOpen,
  continue_pathway_action: Route,
  submit_evidence_action: FileCheck,
  revise_submission_action: FileCheck,
  request_mentor_validation_action: UserCheck,
  pursue_credential_action: Award,
};

export const DEFAULT_ICON: LucideIcon = BookOpen;

// ── Action Config (label + color per type) ────────────────────

export const ACTION_CONFIG: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  course_recommendation: { icon: BookOpen, label: "Enroll in Course", color: "text-primary" },
  pathway_recommendation: { icon: Route, label: "Start Pathway", color: "text-primary" },
  job_recommendation: { icon: Briefcase, label: "Apply to Job", color: "text-chart-2" },
  continue_pathway_action: { icon: Route, label: "Continue Pathway", color: "text-chart-2" },
  submit_evidence_action: { icon: FileCheck, label: "Submit Evidence", color: "text-chart-3" },
  revise_submission_action: { icon: FileCheck, label: "Revise Submission", color: "text-destructive" },
  request_mentor_validation_action: { icon: UserCheck, label: "Request Mentor Review", color: "text-chart-4" },
  pursue_credential_action: { icon: Award, label: "Pursue Credential", color: "text-chart-5" },
  certification_recommendation: { icon: Award, label: "Certification", color: "text-chart-5" },
  profile_completion_action: { icon: Target, label: "Complete Profile", color: "text-primary" },
  verification_action: { icon: UserCheck, label: "Verification", color: "text-chart-4" },
  enroll_course: { icon: BookOpen, label: "Enroll in Course", color: "text-primary" },
  start_pathway: { icon: Route, label: "Start Pathway", color: "text-primary" },
  continue_pathway: { icon: Route, label: "Continue Pathway", color: "text-chart-2" },
  submit_evidence: { icon: FileCheck, label: "Submit Evidence", color: "text-chart-3" },
  revise_evidence: { icon: FileCheck, label: "Revise Submission", color: "text-destructive" },
  request_mentor_validation: { icon: UserCheck, label: "Mentor Review", color: "text-chart-4" },
  pursue_credential: { icon: Award, label: "Pursue Credential", color: "text-chart-5" },
  complete_missing_course: { icon: BookOpen, label: "Complete Course", color: "text-primary" },
};

export const DEFAULT_ACTION_CONFIG = {
  icon: Target,
  label: "Take Action",
  color: "text-muted-foreground",
};

// ── Title Formatting ──────────────────────────────────────────

export function formatRecommendationTitle(title: string): string {
  return title.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Status-Based CTA Label ───────────────────────────────────

/**
 * Returns the appropriate CTA label based on recommendation status.
 * Surfaces should use this instead of only mapEntry.ctaLabel.
 */
export function getStatusCTALabel(status: string, defaultLabel: string): string {
  if (status === "in_progress") return "Continue";
  if (status === "completed") return "Completed";
  return defaultLabel;
}

/**
 * Whether a recommendation should show an active (clickable) primary CTA.
 */
export function isActionable(status: string): boolean {
  return status !== "completed";
}

// ── Completed item styling ───────────────────────────────────

export const COMPLETED_ITEM_CLASS = "opacity-60";

// ── Journey State Styles ─────────────────────────────────────

export { CheckCircle2 as COMPLETED_CHECK_ICON };

/** Card-level border styles for journey state grouping */
export const JOURNEY_CARD_STYLES: Record<string, string> = {
  next_step: "border-primary/40 bg-primary/[0.02]",
  in_progress: "border-yellow-300/50 dark:border-yellow-700/50",
  completed: "border-border/50",
};

/** Section header labels for journey groups */
export const JOURNEY_SECTION_LABELS: Record<string, string> = {
  next_step: "Next Steps",
  in_progress: "In Progress",
  completed: "Completed",
};

// ── Pathway Context Label ─────────────────────────────────────

/**
 * Returns a short pathway label if the recommendation is pathway-linked.
 * Returns null for non-pathway items — callers should conditionally render.
 */
export function getPathwayLabel(rec: { pathwayContext?: { isPathway?: boolean } }): string | null {
  if (!rec.pathwayContext?.isPathway) return null;
  return "Part of your pathway";
}

// ── Completion Impact Line ────────────────────────────────────

/**
 * Achievement-focused line for completed recommendations.
 * Uses deterministic mapping from source, actionType, pathwayContext.
 */
function getCompletionImpactLine(rec: {
  source: string;
  actionType: string;
  reasonCodes: string[];
  pathwayContext?: { isPathway?: boolean };
  groupKey?: string;
}): string {
  // Growth-sourced completions
  if (rec.source === "growth") {
    const reason = rec.reasonCodes[0];
    if (reason) {
      const readable = reason.replace(/_/g, " ");
      return `Closed a gap from your last application — ${readable}`;
    }
    return "Closed a gap from your last application";
  }

  // Pathway-linked completions
  if (rec.pathwayContext?.isPathway) {
    return "Completed as part of your learning pathway";
  }

  // Action-type mapping for completed items
  const completionMap: Record<string, string> = {
    enroll_course: "Added to your completed coursework",
    start_pathway: "Pathway started and completed",
    continue_pathway: "Pathway progress completed",
    complete_missing_course: "Gap in your learning pathway has been filled",
    submit_evidence: "Evidence added to your verified credentials",
    revise_evidence: "Revised evidence accepted for credential review",
    request_mentor_validation: "Mentor validation received",
    pursue_credential: "Added to your professional credentials",
    course_recommendation: "Improved your readiness for target roles",
    pathway_recommendation: "Improved your readiness for target roles",
    job_recommendation: "Application submitted to a matched opportunity",
    certification_recommendation: "Added to your professional credentials",
    profile_completion_action: "Improved your visibility to hiring schools",
    verification_action: "Strengthened your verified profile",
    curriculum_alignment_action: "Aligned your profile with curriculum standards",
    language_improvement_action: "Expanded your language qualifications",
    experience_building_action: "Built relevant professional experience",
  };

  const mapped = completionMap[rec.actionType];
  if (mapped) return mapped;

  // Fallback by groupKey
  if (rec.groupKey === "training_actions") return "Completed recommended learning";
  if (rec.groupKey === "evidence_actions") return "Strengthened your verified credentials";
  if (rec.groupKey === "certification_actions") return "Advanced your professional credentials";

  return "Completed — added to your professional profile";
}

// ── Impact Line (Hiring + Training Bridge) ───────────────────

/**
 * Derives a short, deterministic impact line from existing recommendation fields.
 * No AI text generation — pure mapping from source, actionType, and reasonCodes.
 */
export function getImpactLine(rec: {
  source: string;
  actionType: string;
  reasonCodes: string[];
  confidence?: string;
  groupKey?: string;
  status?: string;
  pathwayContext?: { isPathway?: boolean };
}): string {
  // ── Completion impact: achievement-focused language ──
  if (rec.status === "completed") {
    return getCompletionImpactLine(rec);
  }

  // Source-based: growth recs originate from hiring feedback
  if (rec.source === "growth") {
    // Check reasonCodes for specificity
    const reason = rec.reasonCodes[0];
    if (reason) {
      const readable = reason.replace(/_/g, " ");
      return `Closes a gap identified in your last application — ${readable}`;
    }
    return "Closes a gap identified in your last application";
  }

  // Action-type based mapping for snapshot recs
  const actionMap: Record<string, string> = {
    enroll_course: "Part of your recommended learning pathway",
    start_pathway: "Part of your recommended learning pathway",
    continue_pathway: "Continues your active learning pathway",
    complete_missing_course: "Fills a gap in your learning pathway",
    submit_evidence: "Strengthens your verified credentials",
    revise_evidence: "Improves your evidence for credential review",
    request_mentor_validation: "Advances your credential verification",
    pursue_credential: "Adds to your professional credentials",
    course_recommendation: "Improves your readiness for target roles",
    pathway_recommendation: "Improves your readiness for target roles",
    job_recommendation: "A well-matched opportunity based on your profile",
    certification_recommendation: "Strengthens your professional credentials",
    profile_completion_action: "Improves your visibility to hiring schools",
    verification_action: "Strengthens your verified profile",
    curriculum_alignment_action: "Aligns your profile with curriculum standards",
    language_improvement_action: "Expands your language qualifications",
    experience_building_action: "Builds relevant professional experience",
  };

  const mapped = actionMap[rec.actionType];
  if (mapped) return mapped;

  // Fallback by groupKey
  if (rec.groupKey === "training_actions") return "Part of your recommended learning pathway";
  if (rec.groupKey === "evidence_actions") return "Strengthens your verified credentials";
  if (rec.groupKey === "certification_actions") return "Advances your professional credentials";

  // Confidence-based fallback
  if (rec.confidence === "high") return "Highly recommended based on your profile analysis";

  return "Recommended based on your professional profile";
}

// ── Explanation Line (WHY this action exists) ────────────────

/**
 * Derives a user-facing explanation of WHY this recommendation exists.
 * Deterministic — pure mapping from recommendation fields.
 */
export function getExplanationLine(rec: {
  source: string;
  actionType: string;
  reasonCodes: string[];
  reason?: string;
  status?: string;
}): string {
  // Completed items don't need a "why"
  if (rec.status === "completed") return "";

  // Use the raw reason text if present (from growth engine context)
  if (rec.reason) return rec.reason;

  // Growth source: hiring feedback driven
  if (rec.source === "growth") {
    const reason = rec.reasonCodes[0];
    if (reason) {
      const REASON_EXPLANATIONS: Record<string, string> = {
        gap_analysis: "Your professional profile has gaps that schools look for",
        rejection_feedback: "Hiring feedback identified this area for improvement",
        skill_deficit: "A skill gap was found based on current role requirements",
        certification: "You're missing a certification that schools require",
        evidence_verification: "Your teaching credentials need verified evidence",
        classroom_practice: "Schools need to see verified classroom practice",
        subject_expertise: "Your subject coverage could be stronger",
        pathway_completion: "A learning pathway needs to be completed",
        experience: "Your experience profile needs strengthening",
        curriculum_competency: "Curriculum alignment needs improvement",
        language_proficiency: "Language proficiency gap was identified",
      };
      return REASON_EXPLANATIONS[reason] ?? `Identified area: ${reason.replace(/_/g, " ")}`;
    }
    return "Based on feedback from a recent hiring process";
  }

  // Action-type based explanations for snapshot recs
  const ACTION_EXPLANATIONS: Record<string, string> = {
    enroll_course: "Your profile would benefit from additional coursework",
    start_pathway: "Starting a pathway accelerates your professional growth",
    continue_pathway: "You have an active pathway that needs continuation",
    complete_missing_course: "A course in your pathway hasn't been completed yet",
    submit_evidence: "Your credentials are missing verified evidence",
    revise_evidence: "Previously submitted evidence needs revision",
    request_mentor_validation: "A mentor review would strengthen your credentials",
    pursue_credential: "Earning this credential improves your hiring chances",
    profile_completion_action: "Your profile is incomplete — schools can't fully evaluate you",
    verification_action: "Verified credentials make you more visible to schools",
    course_recommendation: "Recommended to address a skill gap in your profile",
    pathway_recommendation: "Part of a structured learning journey to improve your career readiness",
    job_recommendation: "Matches your profile and current readiness level",
    certification_recommendation: "A certification that strengthens your professional credentials",
    curriculum_alignment_action: "Your profile needs better alignment with curriculum standards",
    language_improvement_action: "Language qualifications could improve your hiring prospects",
    experience_building_action: "Additional experience would strengthen your candidacy",
  };

  return ACTION_EXPLANATIONS[rec.actionType] ?? "Recommended based on your professional profile analysis";
}

// ── Confidence Indicator ─────────────────────────────────────

export interface ConfidenceDisplay {
  label: string;
  style: string;
}

/**
 * Returns a user-friendly confidence indicator based on
 * source, priority, and explicit confidence fields.
 */
export function getConfidenceDisplay(rec: {
  source: string;
  priority: string;
  confidence?: string;
}): ConfidenceDisplay {
  // Explicit confidence from engine
  if (rec.confidence === "high") {
    return { label: "High confidence", style: "text-chart-2" };
  }
  if (rec.confidence === "medium") {
    return { label: "Moderate confidence", style: "text-muted-foreground" };
  }

  // Infer from source + priority
  if (rec.source === "growth" && rec.priority === "high") {
    return { label: "Based on recent hiring feedback", style: "text-chart-2" };
  }
  if (rec.source === "growth") {
    return { label: "Based on hiring feedback", style: "text-muted-foreground" };
  }
  if (rec.priority === "high") {
    return { label: "Recommended based on your profile", style: "text-primary" };
  }

  return { label: "Suggested for professional growth", style: "text-muted-foreground" };
}

// ── Completion Feedback Line (Closed-Loop) ───────────────────

/**
 * Derives a short feedback line for a recently completed recommendation.
 * Used by TeacherContextBar to show cause → result closure.
 * Deterministic mapping — no AI or DB.
 */
export function getCompletionFeedbackLine(rec: {
  actionType: string;
  source: string;
  title: string;
}): string {
  const COMPLETION_FEEDBACK: Record<string, string> = {
    enroll_course: "Course completed — your readiness improved",
    start_pathway: "Pathway started — career growth in progress",
    continue_pathway: "Pathway progress updated — moving forward",
    complete_missing_course: "Gap filled — your profile is stronger",
    submit_evidence: "Evidence submitted — credentials strengthened",
    revise_evidence: "Evidence revised — credential quality improved",
    request_mentor_validation: "Mentor review received — trust profile updated",
    pursue_credential: "Credential earned — professional profile boosted",
    profile_completion_action: "Profile improved — more visible to schools",
    verification_action: "Verification complete — trust score updated",
  };

  const mapped = COMPLETION_FEEDBACK[rec.actionType];
  if (mapped) return mapped;

  if (rec.source === "growth") {
    return "Growth action completed — your hiring readiness improved";
  }

  return `Completed: ${rec.title.replace(/_/g, " ")}`;
}

// ── Loss Aversion Line (Behavioral Nudge) ────────────────────

/**
 * Returns a loss-framed nudge line showing what the teacher risks
 * by NOT acting on this recommendation. Pure presentation mapping.
 */
export function getLossAversionLine(rec: {
  actionType: string;
  source: string;
  status?: string;
  priority: string;
}): string {
  if (rec.status === "completed") return "";

  if (rec.source === "growth") {
    return "Schools may skip your profile if this gap remains";
  }

  const LOSS_MAP: Record<string, string> = {
    enroll_course: "You may be missing opportunities that require this training",
    start_pathway: "Your career progression may stall without a learning pathway",
    continue_pathway: "An incomplete pathway weakens your professional profile",
    complete_missing_course: "Gaps in your coursework limit your job matches",
    submit_evidence: "Unverified credentials are less trusted by schools",
    revise_evidence: "Rejected evidence limits your credential strength",
    request_mentor_validation: "Without mentor validation, your credentials stay unverified",
    pursue_credential: "Missing credentials reduce your chances of being shortlisted",
    profile_completion_action: "Incomplete profiles are often skipped by hiring schools",
    verification_action: "Unverified profiles receive fewer opportunities",
    certification_recommendation: "Missing certifications may disqualify you from roles",
    course_recommendation: "Without this course, your readiness score stays low",
    pathway_recommendation: "Without a pathway, your growth momentum appears stalled",
  };

  const mapped = LOSS_MAP[rec.actionType];
  if (mapped) return mapped;

  if (rec.priority === "high") return "Delaying this action may limit your job opportunities";
  return "Your profile may not stand out without this improvement";
}

// ── Progress Indicator (Proximity Signal) ────────────────────

export interface ProgressIndicator {
  label: string;
  level: "low" | "medium" | "strong";
  style: string;
}

/**
 * Returns a simple progress/proximity indicator derived from
 * existing recommendation fields. No new data fetches.
 */
export function getProgressIndicator(rec: {
  status?: string;
  actionType: string;
  groupKey?: string;
  pathwayContext?: { isPathway?: boolean; completionPercent?: number };
}): ProgressIndicator {
  if (rec.status === "completed") {
    return { label: "Done", level: "strong", style: "text-chart-2" };
  }
  if (rec.status === "in_progress") {
    if (rec.pathwayContext?.completionPercent != null) {
      const pct = rec.pathwayContext.completionPercent;
      return {
        label: `${Math.round(pct)}% complete`,
        level: pct >= 60 ? "strong" : pct >= 30 ? "medium" : "low",
        style: pct >= 60 ? "text-chart-2" : "text-muted-foreground",
      };
    }
    return { label: "In progress — keep going", level: "medium", style: "text-chart-2" };
  }

  // New items: proximity language based on action type
  const PROXIMITY_MAP: Record<string, string> = {
    profile_completion_action: "A few steps to a complete profile",
    submit_evidence: "One upload away from verification",
    request_mentor_validation: "One step from verified credentials",
    pursue_credential: "Close to earning a new credential",
    enroll_course: "One click to start learning",
    start_pathway: "Ready to begin your pathway",
  };

  const mapped = PROXIMITY_MAP[rec.actionType];
  if (mapped) return { label: mapped, level: "medium", style: "text-primary" };

  return { label: "Ready to start", level: "low", style: "text-muted-foreground" };
}
