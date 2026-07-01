import type { ApplicationStatus } from "@/hooks/useApplications";

/**
 * Pipeline stage definitions — maps application status values to display columns.
 * No new status system is introduced; this is a visual layer over applications.status.
 *
 * Phase 4.2B — Hardened transition model with terminal stage guards.
 */

export interface PipelineStage {
  status: ApplicationStatus;
  label: string;
  color: string;
  /** Statuses this stage can transition forward to (excluding reject, which is separate) */
  forwardTo: ApplicationStatus[];
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { status: "applied",     label: "Applied",     color: "border-primary/40",       forwardTo: ["shortlisted"] },
  { status: "shortlisted", label: "Shortlisted", color: "border-emerald-500/40",   forwardTo: ["interview"] },
  { status: "interview",   label: "Interview",   color: "border-blue-500/40",      forwardTo: ["offer"] },
  { status: "offer",       label: "Offer",       color: "border-amber-500/40",     forwardTo: ["hired"] },
  { status: "hired",       label: "Hired",       color: "border-green-600/40",     forwardTo: [] },
  { status: "rejected",    label: "Rejected",    color: "border-destructive/40",   forwardTo: [] },
];

/* ── Terminal & rejectable ── */

/** Statuses from which no forward or reject action is allowed */
export const TERMINAL_STATUSES: ApplicationStatus[] = ["rejected", "withdrawn", "hired"];

/** Non-terminal statuses that can be rejected */
export const REJECTABLE_STATUSES: ApplicationStatus[] = ["applied", "shortlisted", "interview", "offer"];

/** Human-readable label for the next forward action */
export const FORWARD_ACTION_LABELS: Record<ApplicationStatus, string> = {
  applied: "Shortlist",
  shortlisted: "Interview",
  interview: "Offer",
  offer: "Hire",
  hired: "",
  rejected: "",
  withdrawn: "",
};

/* ── Transition helpers ── */

/** Get the single next forward stage, or null if terminal */
export function getForwardStage(current: ApplicationStatus): ApplicationStatus | null {
  if (TERMINAL_STATUSES.includes(current)) return null;
  const stage = PIPELINE_STAGES.find((s) => s.status === current);
  return stage?.forwardTo[0] ?? null;
}

/** Check if a forward transition is valid (no skipping, no backward) */
export function isValidTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  if (TERMINAL_STATUSES.includes(from)) return false;
  // Reject is always valid from non-terminal
  if (to === "rejected") return REJECTABLE_STATUSES.includes(from);
  const stage = PIPELINE_STAGES.find((s) => s.status === from);
  return stage?.forwardTo.includes(to) ?? false;
}

/** Whether the status is terminal (no further actions possible) */
export function isTerminal(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Whether the status can be rejected */
export function canReject(status: ApplicationStatus): boolean {
  return REJECTABLE_STATUSES.includes(status);
}

/** Get the forward action label for a given status */
export function getForwardActionLabel(status: ApplicationStatus): string {
  return FORWARD_ACTION_LABELS[status] ?? "";
}
