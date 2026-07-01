/**
 * Unified Onboarding Orchestration — Normalized States & Next-Step Resolution
 *
 * Platform Access Formula:
 *   Access = Auth + Role + Membership/Persona + Entitlement + Onboarding/Readiness
 *
 * This module provides:
 * 1. A normalized onboarding status vocabulary shared across all personas
 * 2. Mappers from domain-specific states into the normalized vocabulary
 * 3. A next-step resolver that determines the correct redirect for any persona
 *
 * Onboarding orchestration sits AFTER auth/role/membership/entitlement guards
 * and BEFORE domain workspace access. It does not replace domain-specific
 * onboarding implementations — it coordinates them.
 */

// ── Normalized Onboarding Status ─────────────────────────────────────────────

export type OnboardingStatus =
  | "not_applicable"
  | "not_started"
  | "in_progress"
  | "under_review"
  | "complete"
  | "blocked";

// ── Per-Persona Snapshot Shapes ──────────────────────────────────────────────

export interface TeacherOnboardingState {
  status: OnboardingStatus;
  exists: boolean;
  isComplete: boolean;
  nextStep: string | null;
}

export interface SchoolOnboardingState {
  status: OnboardingStatus;
  hasMembership: boolean;
  currentSchoolId: string | null;
  isComplete: boolean;
  nextStep: string | null;
}

export interface MentorOnboardingState {
  status: OnboardingStatus;
  exists: boolean;
  lifecycleStatus: string;
  onboardingCompleted: boolean;
  isReady: boolean;
  nextStep: string | null;
}

export interface ProviderOnboardingState {
  status: OnboardingStatus;
  hasMembership: boolean;
  currentProviderId: string | null;
  onboardingCompleted: boolean;
  isReady: boolean;
  nextStep: string | null;
}

export interface OnboardingSnapshot {
  accountId: string | null;
  roles: string[];
  currentShellArea: string;

  teacher: TeacherOnboardingState;
  school: SchoolOnboardingState;
  mentor: MentorOnboardingState;
  provider: ProviderOnboardingState;

  /** The route the platform recommends the user visit next (null if nothing blocking). */
  nextRecommendedRoute: string | null;
  /** If set, the user MUST be redirected here — they cannot proceed to the current route. */
  blockingRoute: string | null;
  /** Whether any persona has a blocking onboarding state for the current shell area. */
  hasBlockingOnboarding: boolean;
  /** Which persona is causing the block, if any. */
  blockingPersona: string | null;
}

// ── Mapper: Teacher ──────────────────────────────────────────────────────────

export function mapTeacherOnboarding(opts: {
  isTeacher: boolean;
  hasProfile: boolean;
  /** Data-driven readiness: preferred_start + subject_ids.length > 0 + country_id */
  isReady: boolean;
  /** True if preferred_start is not yet set (needs /start page) */
  needsStart?: boolean;
}): TeacherOnboardingState {
  if (!opts.isTeacher) {
    return { status: "not_applicable", exists: false, isComplete: false, nextStep: null };
  }
  if (!opts.hasProfile) {
    return { status: "not_started", exists: false, isComplete: false, nextStep: "/app/teacher/start" };
  }
  if (opts.needsStart) {
    return { status: "in_progress", exists: true, isComplete: false, nextStep: "/app/teacher/start" };
  }
  if (!opts.isReady) {
    return { status: "in_progress", exists: true, isComplete: false, nextStep: "/app/teacher/onboarding" };
  }
  return { status: "complete", exists: true, isComplete: true, nextStep: null };
}

// ── Mapper: School ───────────────────────────────────────────────────────────

export function mapSchoolOnboarding(opts: {
  isSchoolUser: boolean;
  hasMembership: boolean;
  schoolId: string | null;
  orgComplete: boolean;
}): SchoolOnboardingState {
  if (!opts.isSchoolUser) {
    return { status: "not_applicable", hasMembership: false, currentSchoolId: null, isComplete: false, nextStep: null };
  }
  if (!opts.hasMembership) {
    return { status: "blocked", hasMembership: false, currentSchoolId: null, isComplete: false, nextStep: "/access-denied" };
  }
  if (!opts.orgComplete) {
    return { status: "in_progress", hasMembership: true, currentSchoolId: opts.schoolId, isComplete: false, nextStep: "/app/school/start" };
  }
  return { status: "complete", hasMembership: true, currentSchoolId: opts.schoolId, isComplete: true, nextStep: null };
}

// ── Mapper: Mentor ───────────────────────────────────────────────────────────

/**
 * Mentor completion contract:
 *   onboardingCompleted is data-driven (bio, headline, years_experience, specializations, languages)
 *   isReady = status === "active" AND onboardingCompleted (all required fields present)
 *   No boolean timestamp flags are used for routing decisions.
 */
export function mapMentorOnboarding(opts: {
  mentorStatus: string;
  /** Data-driven: derived from getMentorCompleteness().isComplete, not a DB flag */
  onboardingCompleted: boolean;
}): MentorOnboardingState {
  const s = opts.mentorStatus;

  if (s === "not_mentor") {
    return { status: "not_started", exists: false, lifecycleStatus: s, onboardingCompleted: false, isReady: false, nextStep: "/app/mentor/start" };
  }
  if (s === "draft") {
    return { status: "in_progress", exists: true, lifecycleStatus: s, onboardingCompleted: opts.onboardingCompleted, isReady: false, nextStep: "/app/mentor/onboarding" };
  }
  if (s === "pending_review") {
    return { status: "under_review", exists: true, lifecycleStatus: s, onboardingCompleted: opts.onboardingCompleted, isReady: false, nextStep: "/app/mentor/onboarding" };
  }
  if (s === "active" && opts.onboardingCompleted) {
    return { status: "complete", exists: true, lifecycleStatus: s, onboardingCompleted: true, isReady: true, nextStep: null };
  }
  if (s === "active" && !opts.onboardingCompleted) {
    return { status: "in_progress", exists: true, lifecycleStatus: s, onboardingCompleted: false, isReady: false, nextStep: "/app/mentor/onboarding" };
  }
  // paused, rejected, suspended → blocked
  return { status: "blocked", exists: true, lifecycleStatus: s, onboardingCompleted: opts.onboardingCompleted, isReady: false, nextStep: "/app/mentor/onboarding" };
}

// ── Mapper: Provider ─────────────────────────────────────────────────────────

/**
 * Provider completion contract:
 *   onboardingCompleted is data-driven (display_name, legal_name, bio, contact_email, logo_url)
 *   isReady = status === "active" AND onboardingCompleted (all required fields present)
 *   No boolean timestamp flags are used for routing decisions.
 */
export function mapProviderOnboarding(opts: {
  providerStatus: string;
  hasMembership: boolean;
  providerId: string | null;
  /** Data-driven: derived from getProviderCompleteness().isComplete, not a DB flag */
  onboardingCompleted: boolean;
}): ProviderOnboardingState {
  if (!opts.hasMembership) {
    return { status: "not_applicable", hasMembership: false, currentProviderId: null, onboardingCompleted: false, isReady: false, nextStep: null };
  }
  const s = opts.providerStatus;
  if (s === "active" && opts.onboardingCompleted) {
    return { status: "complete", hasMembership: true, currentProviderId: opts.providerId, onboardingCompleted: true, isReady: true, nextStep: null };
  }
  if (s === "pending_review") {
    return { status: "under_review", hasMembership: true, currentProviderId: opts.providerId, onboardingCompleted: opts.onboardingCompleted, isReady: false, nextStep: "/app/provider/start" };
  }
  if (s === "suspended" || s === "inactive" || s === "rejected") {
    return { status: "blocked", hasMembership: true, currentProviderId: opts.providerId, onboardingCompleted: opts.onboardingCompleted, isReady: false, nextStep: "/app/provider/start" };
  }
  // draft or incomplete
  return { status: "in_progress", hasMembership: true, currentProviderId: opts.providerId, onboardingCompleted: false, isReady: false, nextStep: "/app/provider/start" };
}

// ── Next-Step Resolution ─────────────────────────────────────────────────────

/**
 * Given the current shell area and persona states, resolve blocking/recommended routes.
 * Returns { blockingRoute, nextRecommendedRoute, hasBlockingOnboarding, blockingPersona }.
 */
export function resolveNextOnboardingStep(
  shellArea: string,
  teacher: TeacherOnboardingState,
  school: SchoolOnboardingState,
  mentor: MentorOnboardingState,
  provider: ProviderOnboardingState,
): Pick<OnboardingSnapshot, "blockingRoute" | "nextRecommendedRoute" | "hasBlockingOnboarding" | "blockingPersona"> {
  // For each shell area, check the relevant persona
  if (shellArea === "teacher") {
    if (teacher.status !== "complete" && teacher.status !== "not_applicable") {
      return {
        blockingRoute: teacher.nextStep,
        nextRecommendedRoute: teacher.nextStep,
        hasBlockingOnboarding: true,
        blockingPersona: "teacher",
      };
    }
  }

  if (shellArea === "school") {
    if (school.status !== "complete" && school.status !== "not_applicable") {
      return {
        blockingRoute: school.nextStep,
        nextRecommendedRoute: school.nextStep,
        hasBlockingOnboarding: true,
        blockingPersona: "school",
      };
    }
  }

  if (shellArea === "provider") {
    if (provider.status !== "complete" && provider.status !== "not_applicable") {
      return {
        blockingRoute: provider.nextStep,
        nextRecommendedRoute: provider.nextStep,
        hasBlockingOnboarding: true,
        blockingPersona: "provider",
      };
    }
  }

  // Mentor is a teacher sub-persona; only blocking for mentor workspace area
  // (mentor setup routes are NOT blocked by this)

  return {
    blockingRoute: null,
    nextRecommendedRoute: null,
    hasBlockingOnboarding: false,
    blockingPersona: null,
  };
}
