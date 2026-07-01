/**
 * Career Progress Service
 *
 * Calculates career progress from intelligence signals.
 * Pure function — reads adapter outputs, never recomputes.
 *
 * Step 10D — Career Operating System Layer
 */

import type {
  CareerReadinessSignal,
  GapInsightSignal,
  VerificationSignal,
} from "@/intelligence/adapters/types/adapter-signals.types";

// ── Types ──────────────────────────────────────────────────────

export interface CareerProgressMilestone {
  label: string;
  category: string;
  completed: boolean;
}

export interface CareerProgress {
  progressPercent: number;
  completedMilestones: CareerProgressMilestone[];
  remainingMilestones: CareerProgressMilestone[];
  /** Availability of underlying data */
  dataAvailability: {
    hasReadiness: boolean;
    hasVerification: boolean;
    hasGaps: boolean;
  };
}

export interface CareerProgressInputs {
  readiness: CareerReadinessSignal | null;
  verification: VerificationSignal | null;
  gaps: GapInsightSignal | null;
}

// ── Empty result ───────────────────────────────────────────────

function emptyProgress(): CareerProgress {
  return {
    progressPercent: 0,
    completedMilestones: [],
    remainingMilestones: [],
    dataAvailability: { hasReadiness: false, hasVerification: false, hasGaps: false },
  };
}

// ── Main function ──────────────────────────────────────────────

/**
 * Calculates career progress from intelligence signals.
 * Degrades safely when signals are missing.
 */
export function calculateCareerProgress(inputs: CareerProgressInputs): CareerProgress {
  if (!inputs.readiness && !inputs.verification && !inputs.gaps) {
    return emptyProgress();
  }

  const completed: CareerProgressMilestone[] = [];
  const remaining: CareerProgressMilestone[] = [];
  let progressPoints = 0;
  let totalPoints = 0;

  // Readiness assessment
  if (inputs.readiness) {
    totalPoints += 40;
    const readinessScore = inputs.readiness.score;

    if (readinessScore >= 80) {
      completed.push({ label: "Achieve career readiness", category: "readiness", completed: true });
      progressPoints += 40;
    } else if (readinessScore >= 60) {
      completed.push({ label: "Build foundational readiness", category: "readiness", completed: true });
      remaining.push({ label: "Achieve career readiness", category: "readiness", completed: false });
      progressPoints += 25;
    } else {
      remaining.push({ label: "Build foundational readiness", category: "readiness", completed: false });
      remaining.push({ label: "Achieve career readiness", category: "readiness", completed: false });
      progressPoints += Math.round((readinessScore / 100) * 15);
    }
  } else {
    totalPoints += 40;
    remaining.push({ label: "Complete readiness assessment", category: "readiness", completed: false });
  }

  // Verification
  if (inputs.verification) {
    totalPoints += 30;
    if (inputs.verification.verificationLevel === "verified") {
      completed.push({ label: "Verify all credentials", category: "verification", completed: true });
      progressPoints += 30;
    } else if (inputs.verification.verificationLevel === "partial") {
      completed.push({ label: "Begin credential verification", category: "verification", completed: true });
      remaining.push({ label: "Complete remaining verifications", category: "verification", completed: false });
      const ratio = inputs.verification.totalCount > 0
        ? inputs.verification.verifiedCount / inputs.verification.totalCount
        : 0;
      progressPoints += Math.round(ratio * 30);
    } else {
      remaining.push({ label: "Start credential verification", category: "verification", completed: false });
    }
  } else {
    totalPoints += 30;
    remaining.push({ label: "Credential verification unavailable", category: "verification", completed: false });
  }

  // Gap closure
  if (inputs.gaps) {
    totalPoints += 30;
    if (inputs.gaps.totalGaps === 0) {
      completed.push({ label: "Close all qualification gaps", category: "gaps", completed: true });
      progressPoints += 30;
    } else {
      const highCount = inputs.gaps.topGaps.filter((g) => g.severity === "high").length;
      if (highCount === 0) {
        completed.push({ label: "Resolve critical gaps", category: "gaps", completed: true });
        remaining.push({ label: "Close remaining gaps", category: "gaps", completed: false });
        progressPoints += 20;
      } else {
        remaining.push({ label: "Resolve critical gaps", category: "gaps", completed: false });
        progressPoints += Math.max(0, 15 - highCount * 3);
      }
    }
  } else {
    totalPoints += 30;
    remaining.push({ label: "Gap analysis unavailable", category: "gaps", completed: false });
  }

  const progressPercent = totalPoints > 0
    ? Math.max(0, Math.min(100, Math.round((progressPoints / totalPoints) * 100)))
    : 0;

  return {
    progressPercent,
    completedMilestones: completed,
    remainingMilestones: remaining,
    dataAvailability: {
      hasReadiness: inputs.readiness !== null,
      hasVerification: inputs.verification !== null,
      hasGaps: inputs.gaps !== null,
    },
  };
}
