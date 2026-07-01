/**
 * buildPriorityItems — Canonical School Decision Builder
 *
 * Single source of truth for generating prioritized action items
 * across the school dashboard and module pages.
 *
 * Phase 1 — Decision System Activation
 */

import { Briefcase, GraduationCap, Users } from "lucide-react";
import type { SchoolDashboardStats } from "@/hooks/useSchoolDashboardStats";

export type Priority = "high" | "medium" | "low";
export type PriorityDomain = "hiring" | "training" | "team";

export interface PriorityItem {
  problem: string;
  explanation: string;
  impact: string;
  priority: Priority;
  cta: string;
  path: string;
  icon: React.ElementType;
  domain: PriorityDomain;
}

export function buildPriorityItems(
  stats: SchoolDashboardStats,
  canUseHiring: boolean,
  canUseTraining: boolean,
): PriorityItem[] {
  const items: PriorityItem[] = [];

  if (canUseHiring && stats.jobsWithNoApplicants > 0) {
    items.push({
      problem: `${stats.jobsWithNoApplicants} job${stats.jobsWithNoApplicants > 1 ? "s" : ""} need${stats.jobsWithNoApplicants === 1 ? "s" : ""} attention — no applicants yet`,
      explanation: "These roles may need review or better visibility to attract candidates",
      impact: "May slow your hiring pipeline and delay filling critical positions",
      priority: "high",
      cta: "Review Jobs",
      path: "/app/school/hiring/overview",
      icon: Briefcase,
      domain: "hiring",
    });
  }

  if (canUseHiring && stats.pendingReviewApplicants > 0) {
    items.push({
      problem: `${stats.pendingReviewApplicants} applicant${stats.pendingReviewApplicants > 1 ? "s are" : " is"} waiting for review`,
      explanation: "Review candidate progress and move the pipeline forward",
      impact: "Timely reviews help retain top candidates and improve hiring outcomes",
      priority: "medium",
      cta: "Review Applicants",
      path: "/app/school/hiring/applicants",
      icon: Briefcase,
      domain: "hiring",
    });
  }

  if (canUseHiring && stats.pendingInterviews > 0) {
    items.push({
      problem: `${stats.pendingInterviews} interview${stats.pendingInterviews > 1 ? "s" : ""} pending`,
      explanation: "Scheduled interviews need preparation or follow-up",
      impact: "Completing interviews on time strengthens your candidate experience",
      priority: "medium",
      cta: "View Interviews",
      path: "/app/school/hiring/overview",
      icon: Briefcase,
      domain: "hiring",
    });
  }

  if (canUseTraining && stats.overdueAssignments > 0) {
    items.push({
      problem: `${stats.overdueAssignments} training assignment${stats.overdueAssignments > 1 ? "s are" : " is"} overdue`,
      explanation: "Staff members have missed their training deadlines",
      impact: "May improve team readiness and reduce skill gaps across your school",
      priority: "medium",
      cta: "Manage Training",
      path: "/app/school/training/overview",
      icon: GraduationCap,
      domain: "training",
    });
  }

  if (stats.pendingInvitations > 0) {
    items.push({
      problem: `${stats.pendingInvitations} team invitation${stats.pendingInvitations > 1 ? "s" : ""} still pending`,
      explanation: "Invited members haven't accepted yet",
      impact: "A complete team enables better collaboration and training coverage",
      priority: "low",
      cta: "View Team",
      path: "/app/school/team",
      icon: Users,
      domain: "team",
    });
  }

  const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => order[a.priority] - order[b.priority]);

  return items;
}

/** Style tokens for priority levels */
export const priorityStyles: Record<Priority, { border: string; dot: string }> = {
  high: { border: "border-destructive/30 bg-destructive/5", dot: "bg-destructive" },
  medium: { border: "border-warning/30 bg-warning/5", dot: "bg-warning" },
  low: { border: "border-muted-foreground/20 bg-muted/30", dot: "bg-muted-foreground" },
};
