/**
 * Identity Domain Contracts
 *
 * Reserved for identity lifecycle events such as:
 * - teacher.created
 * - profile.completed
 * - role.changed
 *
 * Not implemented in Phase 1.
 */

export interface ProfileCompletedPayload {
  userId: string;
  profileId: string;
  profileType: "teacher" | "school";
  completedAt: string;
}

export interface ProfileUpdatedPayload {
  userId: string;
  profileId: string;
  /** Canonical teacher_profiles.id — use this for intelligence engine lookups */
  teacherId?: string;
  profileType: "teacher" | "school";
  updatedFields: string[];
}

export interface RoleAssignedPayload {
  userId: string;
  role: string;
  assignedBy?: string;
}

export interface OnboardingFinishedPayload {
  userId: string;
  profileId: string;
  profileType: "teacher" | "school";
}
