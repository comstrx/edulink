/**
 * School Teacher Intelligence Types — Sprint 1: Team Intelligence Layer
 *
 * Per-teacher intelligence model for school-facing team view.
 * All values derived from existing snapshot tables — no new scoring.
 *
 * Privacy: CRI is banded, gaps are summary-only, no raw recommendation data.
 */

import type { CanonicalCriBand } from "@/intelligence/shared/cri-band.utils";

export type TeacherVerificationStatus = "verified" | "partial" | "not_verified";

export type TeacherTrainingStatus = "not_started" | "in_progress" | "completed";

export type TeacherReadinessLevel = "ready" | "needs_improvement" | "critical";

export interface TeacherGapSummary {
  gapCount: number;
  topGapArea: string | null;
}

export interface SchoolTeacherIntelligence {
  teacherId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  roleKey: string;
  bandedCRI: CanonicalCriBand;
  verificationStatus: TeacherVerificationStatus;
  trainingStatus: TeacherTrainingStatus;
  activeTrainingCount: number;
  gapSummary: TeacherGapSummary;
  readinessLevel: TeacherReadinessLevel;
  needsAttention: boolean;
}

export interface SchoolTeamDetailedIntelligence {
  schoolId: string;
  teachers: SchoolTeacherIntelligence[];
  computedAt: string;
}
